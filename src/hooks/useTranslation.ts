import { useState, useCallback } from 'react';
import { translatorService, SourceLang, TargetLang } from '../lib/translatorService';

interface UseTranslationReturn {
  isProcessing: boolean;
  result: string | null;
  direction: string;
  inputText: string;
  isFallback: boolean;
  translate: (text: string, source?: SourceLang, target?: TargetLang) => Promise<void>;
  clearResult: () => void;
}

export function useTranslation(): UseTranslationReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [direction, setDirection] = useState<string>('AUTO → DETECTED');
  const [inputText, setInputText] = useState<string>('');
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const translate = useCallback(async (
    text: string,
    source?: SourceLang,
    target?: TargetLang,
  ) => {
    setIsProcessing(true);
    setInputText(text);
    try {
      const response = await translatorService.translate(text, source, target);
      setResult(response.outputText);
      if (response.direction) {
        setDirection(response.direction);
      }
      setIsFallback(!!response.isFallback);
    } catch (error) {
      console.error('Translation error:', error);
      setResult('Ocorreu um erro ao processar a tradução.');
      setDirection('ERRO');
      setIsFallback(false);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setDirection('AUTO → DETECTED');
    setInputText('');
    setIsFallback(false);
  }, []);

  return { isProcessing, result, direction, inputText, isFallback, translate, clearResult };
}
