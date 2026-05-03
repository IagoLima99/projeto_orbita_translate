import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranslationResponse, TranslatorService } from '../types';

export type SourceLang = 'auto' | 'pt' | 'en';
export type TargetLang = 'en' | 'pt' | 'es' | 'fr' | 'de';

// Cache in-memory
interface CacheEntry {
  response: TranslationResponse;
  timestamp: number;
}
const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const SYSTEM_PROMPT = `Você é ORBITA, núcleo inteligente de tradução em tempo real.
Papel: Fornecer resposta de forma imediata e estruturada em texto puro para permitir streaming.

REGRAS ESTRITAS DE FORMATAÇÃO DE SAÍDA:
Você DEVE retornar exatamente estas duas linhas, sem blocos de código markdown e sem explicações:
INTENT: [ask_translation | direct_translation | clarify]
OUT: [Texto final traduzido/gerado]

Exemplo de saída:
INTENT: direct_translation
OUT: Hello world

Regras Internas:
1) Você receberá um payload JSON com 'input', 'sourceLanguage' e 'targetLanguage'.
2) Aja como um tradutor direto para o 'targetLanguage' (ex: se for 'fr', traduza para o Francês; se for 'de', para o Alemão).
3) OUTPUT: seja direto, sem explicações extras. Isto não é um chat.`;

class GeminiTranslatorService implements TranslatorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('[Orbita] GEMINI_API_KEY não configurada no .env!');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async translate(
    input: string,
    sourceLangOverride?: SourceLang,
    targetLangOverride?: TargetLang,
    onChunk?: (text: string) => void
  ): Promise<TranslationResponse> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { 
        intent: 'error', sourceLanguage: 'auto', targetLanguage: 'auto', direction: 'AUTO', outputText: '' 
      };
    }

    const mode = sourceLangOverride && targetLangOverride ? `${sourceLangOverride.toUpperCase()}_TO_${targetLangOverride.toUpperCase()}` : 'AUTO';
    
    // Check Cache
    const cacheKey = `${trimmed}::${mode}::${targetLangOverride || 'auto'}`.toLowerCase();
    const cached = translationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('[Orbita] Cache hit for:', trimmed);
      // Se tiver cache, disparamos o chunk de uma vez e resolvemos
      if (onChunk) onChunk(cached.response.outputText);
      return cached.response;
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
        }
      });

      const payload = {
        input: trimmed,
        mode: mode,
        sourceLanguage: sourceLangOverride,
        targetLanguage: targetLangOverride
      };

      // Create a global timeout for the Gemini request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Gemini API demorou muito para responder.')), 10000);
      });

      const result = await Promise.race([
        model.generateContentStream(JSON.stringify(payload)),
        timeoutPromise
      ]);
      
      let fullText = '';
      for await (const chunk of result.stream) {
        fullText += chunk.text();
        
        // Assim que a tag OUT: aparecer, começamos a enviar para o UI
        const outMatch = fullText.match(/OUT:\s*([\s\S]*)/);
        if (outMatch && onChunk) {
          const partialOut = outMatch[1].trimStart();
          if (partialOut) onChunk(partialOut);
        }
      }

      // Parse final properties
      const intentMatch = fullText.match(/INTENT:\s*(.+)/);
      const outMatch = fullText.match(/OUT:\s*([\s\S]*)/);

      let cleanOutput = outMatch?.[1]?.trim();
      if (!cleanOutput) {
        // Fallback case: model didn't follow formatting rules
        cleanOutput = fullText.replace(/INTENT:.*/g, '').trim();
      }
      if (!cleanOutput) {
        cleanOutput = 'Não foi possível interpretar a tradução gerada.';
      }

      const parsed: TranslationResponse = {
        intent: (intentMatch?.[1]?.trim() as any) || 'direct_translation',
        sourceLanguage: sourceLangOverride || 'auto',
        targetLanguage: targetLangOverride || 'auto',
        direction: mode,
        normalizedInput: trimmed,
        outputText: cleanOutput,
        confidence: 1.0,
        isFallback: false
      };

      translationCache.set(cacheKey, { response: parsed, timestamp: Date.now() });
      return parsed;

    } catch (error) {
      console.warn('[Orbita] Gemini API failed (Rate Limit/Error). Swapping to Public Fallback API...', error);
      
      try {
        // Fallback to MyMemory Translation API (Free Public API)
        const sourceMatch = sourceLangOverride === 'pt' ? 'pt-BR' : sourceLangOverride === 'en' ? 'en-US' : 'en-US';
        const targetMatch = targetLangOverride === 'pt' ? 'pt-BR' : targetLangOverride === 'en' ? 'en-US' : `${targetLangOverride}-XX`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceMatch}|${targetMatch}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const data = await res.json();
          
          if (data && data.responseData && data.responseData.translatedText) {
            let text = data.responseData.translatedText;
            if (onChunk) onChunk(text); // Send it all at once

            const fallbackResponse: TranslationResponse = {
              intent: 'direct_translation',
              sourceLanguage: sourceLangOverride || 'auto',
              targetLanguage: targetLangOverride || 'auto',
              direction: mode,
              normalizedInput: trimmed,
              outputText: text,
              confidence: 0.8,
              isFallback: true
            };

            // Cache the fallback response as well to save public quota
            const cacheKey = `${trimmed}::${mode}::${targetLangOverride || 'auto'}`.toLowerCase();
            translationCache.set(cacheKey, { response: fallbackResponse, timestamp: Date.now() });
            
            return fallbackResponse;
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.error('[Orbita] Fallback fetch failed or timed out:', fetchErr);
        }
      } catch (fallbackError) {
        console.error('[Orbita] Public Fallback API also failed.', fallbackError);
      }

      throw error;
    }
  }
}

export const translatorService = new GeminiTranslatorService();
