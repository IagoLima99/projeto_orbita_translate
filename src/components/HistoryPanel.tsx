import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Trash2, ChevronRight } from 'lucide-react';
import { HistoryEntry, useHistory } from '../hooks/useHistory';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReuse: (entry: HistoryEntry) => void;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days}d atrás`;
}

export default function HistoryPanel({ isOpen, onClose, onReuse }: HistoryPanelProps) {
  const { history, removeEntry, clearHistory } = useHistory();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="glass-premium w-full max-w-2xl rounded-t-[32px] overflow-hidden"
            style={{ maxHeight: '75dvh' }}
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-white/10 mx-auto mt-4 rounded-full" />

            <div className="p-6 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-purple-400" />
                <span className="text-xs uppercase tracking-widest text-white/50 font-semibold">Histórico</span>
                <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] text-white/30">{history.length}/20</span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-white/20 hover:text-red-400 transition-colors uppercase tracking-wider px-3 py-1"
                  >
                    Limpar tudo
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(75dvh - 90px)' }}>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/20">
                  <Clock size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-light">Nenhuma tradução ainda</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {history.map((entry) => (
                    <li key={entry.id} className="group flex items-center gap-4 p-5 hover:bg-white/3 transition-colors">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => { onReuse(entry); onClose(); }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-widest text-purple-400/70 font-semibold">{entry.direction}</span>
                          <span className="text-[9px] text-white/20">{timeAgo(entry.timestamp)}</span>
                        </div>
                        <p className="text-white/60 text-xs truncate">{entry.inputText}</p>
                        <p className="text-white text-sm font-light truncate mt-0.5">{entry.outputText}</p>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-2 text-white/20 hover:text-red-400 transition-colors"
                          aria-label="Remover entrada"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className="text-white/20" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
