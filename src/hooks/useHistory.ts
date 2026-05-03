import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'orbita_history';
const MAX_ENTRIES = 20;

export interface HistoryEntry {
  id: string;
  inputText: string;
  outputText: string;
  direction: string;
  timestamp: number;
}

interface UseHistoryReturn {
  history: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  removeEntry: (id: string) => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persiste no localStorage sempre que o histórico muda
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // localStorage cheio ou indisponível
    }
  }, [history]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setHistory((prev) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };
      // Evita duplicatas consecutivas
      if (prev[0]?.outputText === entry.outputText) return prev;
      return [newEntry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
}
