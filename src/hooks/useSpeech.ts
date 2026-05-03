import { useState, useRef, useEffect, useCallback } from 'react';

export type SpeechError = 'no-speech' | 'network' | 'not-allowed' | string;

interface UseSpeechReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => boolean;
  stopListening: () => void;
  clearError: () => void;
}

export function useSpeech(
  onResult: (text: string) => void,
  onSpeechEnd: () => void,
  sourceLang: string = 'pt',
  onInterimResult?: (text: string) => void
): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Checking support once
  const [isSupported] = useState(() => {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });

  const onResultRef = useRef(onResult);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const recognitionRef = useRef<any>(null);
  
  const transcriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isClosingRef = useRef(false);
  const handleEndSequenceRef = useRef<(() => void) | null>(null);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);

  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startListening = useCallback((): boolean => {
    if (!isSupported) {
      setError('Reconhecimento de voz não suportado neste navegador.');
      return false;
    }
    
    if (isListening) {
      return false;
    }

    try {
      // Aborta a instância anterior se existir para limpar ghost states
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      transcriptRef.current = '';
      isClosingRef.current = false;
      setError(null);
      clearTimers();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      
      let langCode = 'pt-BR'; // default fallback
      if (sourceLang === 'en') langCode = 'en-US';
      else if (sourceLang === 'es') langCode = 'es-ES';
      else if (sourceLang === 'fr') langCode = 'fr-FR';
      else if (sourceLang === 'de') langCode = 'de-DE';
      
      recognition.lang = langCode;
      recognition.maxAlternatives = 1;

      const handleEndSequence = () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        
        setIsListening(false);
        clearTimers();
        
        const finalWord = transcriptRef.current;
        if (finalWord) {
          onResultRef.current(finalWord);
        } else {
          onSpeechEndRef.current();
        }
        
        transcriptRef.current = '';
      };
      handleEndSequenceRef.current = handleEndSequence;

      const stopAndProcess = () => {
        try { recognition.stop(); } catch (_) {}
        setTimeout(() => {
          handleEndSequence();
        }, 800);
      };

      recognition.onstart = () => {
        clearTimers();
        silenceTimerRef.current = setTimeout(stopAndProcess, 5000);
      };

      // Guardamos onInterimResult atual em ref para o closure
      const onInterim = onInterimResult;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript + ' ';
          }
        }
        
        const combined = (finalTranscript + interimTranscript).trim();
        transcriptRef.current = combined;
        if (onInterim) onInterim(combined);
        
        clearTimers();
        silenceTimerRef.current = setTimeout(stopAndProcess, 5000);
      };

      recognition.onend = () => {
        handleEndSequence();
      };

      recognition.onerror = (event: any) => {
        console.error('[useSpeech] error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
        clearTimers();

        switch (event.error) {
          case 'no-speech':
            break;
          case 'aborted':
            break;
          case 'not-allowed':
          case 'permission-denied':
            setError('Acesso ao microfone negado. Verifique as permissões do navegador.');
            handleEndSequence();
            break;
          case 'network':
            setError('Falha de rede ao processar voz. Verifique sua conexão.');
            handleEndSequence();
            break;
          default:
            setError(`Erro de reconhecimento: ${event.error}`);
            handleEndSequence();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return true;

    } catch (err: any) {
      console.warn('[useSpeech] start() failed:', err.message);
      if (err.name === 'InvalidStateError') {
        // Se ainda der esse erro, significa que o microfone a nível de hardware está retido.
        setError('O microfone ainda está ocupado pelo sistema. Tente novamente em 2 segundos.');
      } else {
        setError('Falha ao acessar o microfone.');
      }
      setIsListening(false);
      return false;
    }
  }, [isListening, isSupported, sourceLang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      
      setTimeout(() => {
        if (handleEndSequenceRef.current) handleEndSequenceRef.current();
      }, 800);
    }
  }, [isListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  return { isListening, isSupported, error, startListening, stopListening, clearError };
}
