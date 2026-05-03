import { useState, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard } from 'lucide-react';
import { OrbState } from './types';
import { useSpeech } from './hooks/useSpeech';
import { useTranslation } from './hooks/useTranslation';
import { useHistory, HistoryEntry } from './hooks/useHistory';
import { useLangSettings } from './hooks/useLangSettings';

import HeroVideoScrub from './components/HeroVideoScrub';
import Orb from './components/Orb';
import ResultSheet from './components/ResultSheet';
import TopBar from './components/TopBar';
import CosmicBackground from './components/CosmicBackground';

// Modais não críticos em Lazy Load (Code Splitting)
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const TextInputOverlay = lazy(() => import('./components/TextInputOverlay'));
const HistoryPanel = lazy(() => import('./components/HistoryPanel'));

export default function App() {
  const [appState, setAppState] = useState<OrbState>('idle');
  const [showInput, setShowInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [heroMode, setHeroMode] = useState<'VIDEO' | 'APP'>('VIDEO');

  // ─── HOOKS ─────────────────────────────────────────────────────────────────
  const { settings } = useLangSettings();
  const { result, direction, inputText, isFallback, translate, clearResult } = useTranslation();
  const { history, addEntry } = useHistory();

  // ─── HANDLERS DE VOZ ───────────────────────────────────────────────────────
  const handleSpeechResult = useCallback((text: string) => {
    setAppState('processing');
    translate(text, settings.source, settings.target).then(() => {
      setAppState('result');
    }).catch(() => {
      setAppState('idle');
    });
  }, [translate, settings.source, settings.target]);

  const handleSpeechEnd = useCallback(() => {
    setAppState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, []);

  const { error: speechError, startListening, stopListening, clearError } = useSpeech(
    handleSpeechResult,
    handleSpeechEnd,
    settings.source,
    setInterimText
  );

  // ─── CONTROLE DO ORB ───────────────────────────────────────────────────────
  const toggleListen = useCallback(() => {
    if (appState === 'idle' || appState === 'result') {
      clearResult();
      clearError();
      setInterimText('');
      const started = startListening();
      if (started) setAppState('listening');
    } else if (appState === 'listening') {
      stopListening();
      // Assíncrono: onresult → 'processing' → 'result'  |  onend sem fala → 'idle'
    }
    // 'processing': clique ignorado intencionalmente
  }, [appState, clearResult, clearError, startListening, stopListening]);

  // ─── SUBMISSÃO DE TEXTO ───────────────────────────────────────────────────
  const handleTextSubmit = useCallback(async (text: string) => {
    setShowInput(false);
    clearResult();
    setAppState('processing');
    try {
      await translate(text, settings.source, settings.target);
      setAppState('result');
    } catch {
      setAppState('idle');
    }
  }, [translate, clearResult, settings.source, settings.target]);

  // ─── REUTILIZAR ENTRADA DO HISTÓRICO ─────────────────────────────────────
  const handleReuseHistory = useCallback((entry: HistoryEntry) => {
    clearResult();
    setAppState('processing');
    translate(entry.inputText, settings.source, settings.target).then(() => {
      setAppState('result');
    }).catch(() => setAppState('idle'));
  }, [translate, clearResult, settings.source, settings.target]);

  // ─── FECHAR RESULTADO (salva no histórico) ────────────────────────────────
  const closeResult = useCallback(() => {
    if (result && inputText) {
      addEntry({ inputText, outputText: result, direction });
    }
    clearResult();
    setAppState('idle');
  }, [result, inputText, direction, addEntry, clearResult]);

  return (
    <div className="relative font-sans">
      {/* ══════════════════════════════════════════════════════════════════════
          PHASE 1: Scroll-scrub video hero
          Pinned visually while user scrolls through the track.
          After completion → heroMode = 'APP' → show Orb UI.
          z-0 ensures this becomes the base background for the app.
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-0">
        <HeroVideoScrub onModeChange={setHeroMode} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PHASE 2: Main app content — appears AFTER the video track
          ══════════════════════════════════════════════════════════════════════ */}
      {/* Cosmic background — mounts after video completes. It is transparent and z-10 so it layers OVER the video. */}
      {heroMode === 'APP' && <CosmicBackground state={appState} />}

        {/* ── Fixed UI layer — only visible AFTER video scrub completes ── */}
        <AnimatePresence>
          {heroMode === 'APP' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="fixed inset-0 z-20 flex flex-col pointer-events-none"
            >
              {/* TopBar */}
              <div className="pointer-events-auto">
                <TopBar
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenHistory={() => setShowHistory(true)}
                  historyCount={history.length}
                />
              </div>

              {/* Central ORB */}
              <main className="flex-1 flex flex-col items-center justify-center w-full">
                <h1 className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 font-semibold text-[4.5vw] sm:text-2xl md:text-3xl lg:text-4xl tracking-tight leading-tight pb-2 whitespace-nowrap mb-16 md:mb-24 text-center pointer-events-none select-none drop-shadow-sm">
                  Seu tradutor inteligente em tempo real
                </h1>
                <div className="relative pointer-events-auto flex flex-col items-center">
                  {/* Interim Text Overlay */}
                  <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 w-[80vw] max-w-md text-center pointer-events-none z-20 pb-4">
                    <AnimatePresence>
                      {(appState === 'listening' || appState === 'processing') && interimText && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="text-white/60 text-[13px] md:text-sm font-medium drop-shadow-2xl italic tracking-wide"
                        >
                          "{interimText}"
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <Orb state={appState} onClick={toggleListen} />
                </div>
              </main>

              {/* Footer */}
              <footer className="pb-6 w-full text-center">
                <p className="text-[8px] uppercase tracking-[0.5em] text-white/10 font-bold">
                  Orbita Intelligence Core v3.2
                </p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating text input button — only after video completes ── */}
        <AnimatePresence>
          {heroMode === 'APP' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="fixed bottom-12 right-6 md:right-12 z-40"
            >
              <button
                onClick={() => setShowInput(true)}
                className="p-5 glass-premium rounded-full text-white/40 hover:text-white transition-all hover:scale-110 active:scale-95 shadow-2xl focus-visible:ring-2 focus-visible:ring-purple-500 outline-none"
                aria-label="Digitar texto para traduzir"
              >
                <Keyboard size={24} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Overlays & Modals (fixed positioning handles themselves) ── */}
        <AnimatePresence>
          {appState === 'result' && (
            <ResultSheet
              text={result || "Aviso: Nenhuma tradução foi retornada."}
              onClose={closeResult}
              direction={direction}
              isFallback={isFallback}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {speechError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-32 text-center w-full z-50 pointer-events-none"
            >
              <span className="bg-red-500/10 text-red-400 font-medium text-[10px] tracking-widest uppercase px-4 py-2 rounded-full backdrop-blur-sm border border-red-500/20">
                {speechError}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lazy Loaded Modals ── */}
        <Suspense fallback={null}>
          {showInput && (
            <TextInputOverlay
              isOpen={showInput}
              onClose={() => setShowInput(false)}
              onSubmit={handleTextSubmit}
            />
          )}

          {showSettings && (
            <SettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            />
          )}

          {showHistory && (
            <HistoryPanel
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
              onReuse={handleReuseHistory}
            />
          )}
        </Suspense>
    </div>
  );
}
