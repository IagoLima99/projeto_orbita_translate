import { useState, useEffect, useCallback } from 'react';

export type SourceLang = 'auto' | 'pt' | 'en';
export type TargetLang = 'en' | 'pt' | 'es' | 'fr' | 'de';

export interface LangSettings {
  source: SourceLang;
  target: TargetLang;
}

const SETTINGS_KEY = 'orbita_lang_settings';
const DEFAULT: LangSettings = { source: 'auto', target: 'en' };

const settingsEventTarget = new EventTarget();

export function useLangSettings() {
  const [settings, setSettings] = useState<LangSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    const onUpdate = () => {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) setSettings(JSON.parse(stored));
      } catch {}
    };
    settingsEventTarget.addEventListener('update', onUpdate);
    return () => settingsEventTarget.removeEventListener('update', onUpdate);
  }, []);

  const updateSettings = useCallback((patch: Partial<LangSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {}
      // Previne o erro do React (setState in render) agendando o evento para o próximo tick
      setTimeout(() => {
        settingsEventTarget.dispatchEvent(new Event('update'));
      }, 0);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
