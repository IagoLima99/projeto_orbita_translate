import { Settings, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount?: number;
}

export default function TopBar({ onOpenSettings, onOpenHistory, historyCount = 0 }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-8 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-purple-500 blur-[10px] opacity-20 rounded-full" />
          <div className="relative w-full h-full border border-white/10 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <span className="text-white font-light tracking-[0.4em] text-xs uppercase">Orbita</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        {/* Histórico */}
        <button
          onClick={onOpenHistory}
          className="relative p-2 text-white/20 hover:text-white transition-colors"
          aria-label="Ver histórico de traduções"
        >
          <Clock size={20} strokeWidth={1.5} />
          {historyCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-400 rounded-full" />
          )}
        </button>

        {/* Configurações */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-white/20 hover:text-white transition-colors"
          aria-label="Abrir configurações"
        >
          <Settings size={20} strokeWidth={1.5} />
        </button>
      </motion.div>
    </header>
  );
}
