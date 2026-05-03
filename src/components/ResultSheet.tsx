import { motion } from 'motion/react';
import { X, Copy, Check, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTTS } from '../hooks/useTTS';

interface ResultSheetProps {
  text: string;
  onClose: () => void;
  direction?: string;
  isFallback?: boolean;
}

export default function ResultSheet({ text, onClose, direction = 'AUTO → DETECTED', isFallback = false }: ResultSheetProps) {
  const [copied, setCopied] = useState(false);
  const { isSpeaking, speak, stop } = useTTS();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTTS = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, direction);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      role="dialog"
      aria-labelledby="result-title"
      aria-modal="true"
    >
      <div className="glass-premium max-w-2xl mx-auto rounded-t-2xl rounded-b-xl sm:rounded-t-[32px] sm:rounded-b-[16px] overflow-hidden">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-white/10 mx-auto mt-4 rounded-full" />

        <div className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p id="result-title" className="text-[10px] tracking-[0.2em] text-white/30 uppercase font-medium">Tradução Semântica</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-white/5 rounded-full text-[9px] text-white/50 border border-white/5 uppercase tracking-wider font-semibold">
                  {direction}
                </span>
                {isFallback ? (
                  <span className="px-2 py-1 bg-yellow-500/10 rounded-full text-[9px] text-yellow-500 border border-yellow-500/10 uppercase tracking-wider font-semibold" title="O limite diário gratuito da inteligência Orbita foi atingido. Usando API pública de tradução.">
                    API Pública (Cota Excedida)
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-purple-500/10 rounded-full text-[9px] text-purple-400 border border-purple-500/10 uppercase tracking-wider font-semibold">
                    Inteligência Orbita
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/20 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Fechar resultado"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-[60px]">
            <h2 
              className="text-2xl md:text-3xl font-normal leading-tight text-white/90"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(139,92,246,0.3)' }}
            >
              {text}
            </h2>
          </div>

          <div className="flex items-center gap-3 pt-4">
            {/* Copiar */}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-5 py-3 glass-premium rounded-2xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Copiar tradução"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>

            {/* Ouvir (TTS) */}
            <button
              onClick={handleTTS}
              className={`p-3 glass-premium rounded-2xl transition-all group outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isSpeaking ? 'text-purple-400 bg-purple-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              title={isSpeaking ? 'Parar' : 'Ouvir tradução'}
              aria-label={isSpeaking ? 'Parar áudio' : 'Ouvir tradução'}
            >
              {isSpeaking
                ? <VolumeX size={18} className="animate-pulse" />
                : <Volume2 size={18} className="group-active:scale-90 transition-transform" />
              }
            </button>

            {/* Limpar */}
            <button
              onClick={onClose}
              className="p-3 glass-premium rounded-2xl text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Limpar"
              aria-label="Limpar resultado"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
