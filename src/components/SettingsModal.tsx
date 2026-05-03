import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { useLangSettings, SourceLang, TargetLang } from '../hooks/useLangSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TARGETS: { id: TargetLang; label: string; flag: string }[] = [
  { id: 'en', label: 'Inglês', flag: '🇺🇸' },
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'es', label: 'Espanhol', flag: '🇪🇸' },
  { id: 'fr', label: 'Francês', flag: '🇫🇷' },
  { id: 'de', label: 'Alemão', flag: '🇩🇪' },
];

const SOURCES: { id: SourceLang; label: string }[] = [
  { id: 'auto', label: 'Detectar automaticamente' },
  { id: 'pt', label: 'Sempre Português' },
  { id: 'en', label: 'Sempre Inglês' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useLangSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-premium w-full max-w-md p-10 rounded-[40px] space-y-8"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-6">
              <h3 className="text-white font-light tracking-widest text-xs uppercase">Ajustes de Idioma</h3>
              <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Idioma de Origem */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Idioma de Origem</p>
              <div className="space-y-1">
                {SOURCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateSettings({ source: s.id })}
                    className={`w-full flex justify-between items-center p-4 rounded-2xl transition-all text-sm font-light ${
                      settings.source === s.id
                        ? 'bg-white/5 text-white border border-white/10'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <span>{s.label}</span>
                    {settings.source === s.id && <Check size={16} className="text-purple-400" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Idioma de Destino */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Traduzir para</p>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateSettings({ target: t.id })}
                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all text-sm font-light ${
                      settings.target === t.id
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'text-white/40 hover:text-white/60 glass-premium'
                    }`}
                  >
                    <span className="text-xl">{t.flag}</span>
                    <span>{t.label}</span>
                    {settings.target === t.id && <Check size={14} className="text-purple-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={onClose}
              className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-xs tracking-[0.2em] uppercase hover:bg-white/90 transition-all active:scale-95"
            >
              Salvar Configurações
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
