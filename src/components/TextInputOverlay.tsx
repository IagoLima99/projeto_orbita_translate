import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface TextInputOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export default function TextInputOverlay({ isOpen, onClose, onSubmit }: TextInputOverlayProps) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when opened
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="text-input-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-premium w-full max-w-lg p-10 rounded-2xl sm:rounded-[40px]"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 id="text-input-title" className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-semibold">
                  Entrada de Texto
                </h3>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="text-white/40 hover:text-white transition-colors p-2 -mr-2"
                  aria-label="Fechar entrada de texto"
                >
                  <X size={20} />
                </button>
              </div>
              <textarea
                autoFocus
                placeholder="O que você quer traduzir?"
                className="w-full bg-transparent border-none text-white/90 text-2xl font-normal placeholder:text-white/20 focus:ring-0 resize-none h-40 leading-relaxed outline-none"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(139,92,246,0.3)' }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-full py-5 bg-white text-black rounded-2xl font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Confirmar Intenção
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
