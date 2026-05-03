import { useCallback, useRef, useState } from 'react';

// Mapeia direção de tradução para código de língua do TTS
const DIRECTION_TO_LANG: Record<string, string> = {
  'PT → EN': 'en-US',
  'EN → PT': 'pt-BR',
  'PT → ES': 'es-ES',
  'PT → FR': 'fr-FR',
  'PT → DE': 'de-DE',
  'EN → ES': 'es-ES',
  'EN → FR': 'fr-FR',
  'EN → DE': 'de-DE',
};

interface UseTTSReturn {
  isSpeaking: boolean;
  speak: (text: string, direction?: string) => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, direction?: string) => {
    if (!window.speechSynthesis || !text) return;

    // Para qualquer fala anterior
    window.speechSynthesis.cancel();

    const lang = direction ? (DIRECTION_TO_LANG[direction] ?? 'en-US') : 'en-US';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { isSpeaking, speak, stop };
}
