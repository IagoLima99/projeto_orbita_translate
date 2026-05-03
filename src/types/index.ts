export type OrbState = 'idle' | 'listening' | 'processing' | 'result';

export interface TranslationResponse {
  intent: 'ask_translation' | 'direct_translation' | 'clarify' | 'error';
  sourceLanguage: string;
  targetLanguage: string;
  direction: string;
  normalizedInput?: string;
  keyTerm?: string | null;
  outputText: string;
  confidence?: number;
  isFallback?: boolean;
}

export interface TranslatorService {
  translate(
    input: string,
    sourceLangOverride?: string,
    targetLangOverride?: string,
    onChunk?: (text: string) => void
  ): Promise<TranslationResponse>;
}
