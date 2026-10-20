import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DAILY_MAX_ROUND_SCORE,
  DAILY_MAX_TOTAL_SCORE,
  DAILY_ROUNDS_TOTAL,
  EvaluationResult,
  FriendGuessInput,
  GameMode,
  MODE_INFO,
  RankedFriendGuess,
  RoundRecord,
  ShellState,
  TimerPhase,
  computeSessionSummary,
  evaluateAttempt,
  evaluateClassicGuesses,
  formatSeconds,
  formatSignedDelta,
  getTodayDateKey,
  isTimerHiddenDuringRun,
  parseSecondsInput,
  splitTimerParts,
} from './game/rules';
import { soundEngine } from './game/sound';
import { CanvasBridgeState, ChronoCanvas } from './components/ChronoCanvas';
import { ModeIconSvg, PauseIconSvg, SoundIconSvg } from './components/GameSvgAssets';
import { TitleScreen } from './components/TitleScreen';
import { GameOverModal, PauseModal } from './components/GameModals';
import { AppLogo } from './components/AppLogo';

const PRESET_TARGETS = [3, 5, 7.5, 10, 15];

interface FriendSlot {
  id: string;
  name: string;
  guessInput: string;
}

const DEFAULT_FRIENDS: FriendSlot[] = [
  { id: 'f1', name: 'Amico 1', guessInput: '5.0' },
  { id: 'f2', name: 'Amico 2', guessInput: '6.5' },
];

export default function App() {
  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const todayKey = useMemo(() => getTodayDateKey(), []);

  const [shellState, setShellState] = useState<ShellState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [mode, setMode] = useState<GameMode>('classica');
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('idle');
  const [muted, setMuted] = useState<boolean>(false);

  // Timer & Round state
  const [stoppedElapsedMs, setStoppedElapsedMs] = useState<number>(0);
  const [targetSeconds, setTargetSeconds] = useState<number>(5.0);
  const [customTargetInput, setCustomTargetInput] = useState<string>('5.0');
  const [hideInChallengeOrClassic, setHideInChallengeOrClassic] = useState<boolean>(false);

  // Blind mode & Classic mode inputs
  const [blindGuessInput, setBlindGuessInput] = useState<string>('5.0');
  const [blindInputError, setBlindInputError] = useState<string | null>(null);
  const [classicFriends, setClassicFriends] = useState<FriendSlot[]>(DEFAULT_FRIENDS);
  const [classicSecretHold, setClassicSecretHold] = useState<boolean>(false);
  const [classicError, setClassicError] = useState<string | null>(null);
  const [showClassicFriendsInputs, setShowClassicFriendsInputs] = useState<boolean>(false);

  // Evaluation & Session progression
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [lastRankedFriends, setLastRankedFriends] = useState<RankedFriendGuess[]>([]);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [dailyBestScore, setDailyBestScore] = useState<number | null>(() => {
    try {
      const saved = window.localStorage.getItem(`cronosfida_daily_best_${todayKey}`);
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  // Refs for 60Hz canvas decoupling
  const startTimePerfRef = useRef<number>(0);
  const liveDigitsDomRef = useRef<HTMLSpanElement | null>(null);
  const liveCentisDomRef = useRef<HTMLSpanElement | null>(null);

  const hideDigitsDuringRun = isTimerHiddenDuringRun(mode, hideInChallengeOrClassic);

  const bridgeRef = useRef<CanvasBridgeState>({
    shellState: initialAutostart ? 'playing' : 'title',
    mode: 'classica',
    timerPhase: 'idle',
    startTimePerf: 0,
    stoppedElapsedMs: 0,
    targetSeconds: 5.0,
    hideDigitsInRun: false,
    lastGrade: null,
    burstTriggerCount: 0,
    burstColorHex: '#F59E0B',
    burstHeavy: false,
  });

  // Sync body[data-state] and bridgeRef
  useEffect(() => {
    document.body.dataset.state = shellState;
    bridgeRef.current.shellState = shellState;
  }, [shellState]);

  useEffect(() => {
    bridgeRef.current.mode = mode;
    bridgeRef.current.timerPhase = timerPhase;
    bridgeRef.current.stoppedElapsedMs = stoppedElapsedMs;
    bridgeRef.current.targetSeconds = targetSeconds;
    bridgeRef.current.hideDigitsInRun = hideDigitsDuringRun;
  }, [mode, timerPhase, stoppedElapsedMs, targetSeconds, hideDigitsDuringRun]);

  const triggerCanvasBurst = useCallback((colorHex: string, heavy: boolean) => {
    bridgeRef.current.burstColorHex = colorHex;
    bridgeRef.current.burstHeavy = heavy;
    bridgeRef.current.burstTriggerCount += 1;
  }, []);

  const resetCurrentRound = useCallback(() => {
    setTimerPhase('idle');
    setStoppedElapsedMs(0);
    setLastEvaluation(null);
    setLastRankedFriends([]);
    setBlindInputError(null);
    setClassicError(null);
    setShowClassicFriendsInputs(false);
    bridgeRef.current.timerPhase = 'idle';
    bridgeRef.current.stoppedElapsedMs = 0;
    if (liveDigitsDomRef.current) liveDigitsDomRef.current.textContent = '00';
    if (liveCentisDomRef.current) liveCentisDomRef.current.textContent = '.00';
  }, []);

  const handleSelectMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode !== mode && (nextMode === 'giornaliera' || mode === 'giornaliera')) {
        setRounds([]);
        setStreak(0);
      }
      setMode(nextMode);
      resetCurrentRound();
      soundEngine.playTick(1.15);
    },
    [mode, resetCurrentRound]
  );

  const handleStartGameFromTitle = useCallback(
    (chosenMode?: GameMode) => {
      const targetMode = chosenMode || mode;
      if (targetMode !== mode || targetMode === 'giornaliera') {
        setRounds([]);
        setStreak(0);
      }
      setMode(targetMode);
      bridgeRef.current.mode = targetMode;
      document.body.dataset.state = 'playing';
      bridgeRef.current.shellState = 'playing';
      setShellState('playing');
      resetCurrentRound();
      soundEngine.playStartClick();
      triggerCanvasBurst(MODE_INFO[targetMode].accentHex, false);
    },
    [mode, resetCurrentRound, triggerCanvasBurst]
  );

  const handleStartChrono = useCallback(() => {
    const nowPerf = performance.now();
    startTimePerfRef.current = nowPerf;
    bridgeRef.current.startTimePerf = nowPerf;
    bridgeRef.current.timerPhase = 'running';

    setStoppedElapsedMs(0);
    setLastEvaluation(null);
    setLastRankedFriends([]);
    setBlindInputError(null);
    setClassicError(null);
    setTimerPhase('running');

    soundEngine.playStartClick();
    triggerCanvasBurst(MODE_INFO[mode].accentHex, false);
  }, [mode, triggerCanvasBurst]);

  const finalizeRoundRecord = useCallback(
    (ev: EvaluationResult, winnerName?: string) => {
      setLastEvaluation(ev);
      setStreak(ev.nextStreak);
      setTimerPhase('revealed');
      bridgeRef.current.timerPhase = 'revealed';
      bridgeRef.current.lastGrade = ev.grade;

      const gradeColor =
        ev.grade === 'PERFETTO' || ev.grade === 'CECCHINO'
          ? '#10B981'
          : ev.grade === 'OTTIMO'
          ? '#F59E0B'
          : '#F43F5E';

      soundEngine.playGradeFanfare(ev.grade);
      triggerCanvasBurst(gradeColor, ev.grade === 'PERFETTO' || ev.grade === 'CECCHINO');

      setRounds((prev) => {
        const nextRounds: RoundRecord[] = [
          {
            id: `r-${Date.now()}-${prev.length + 1}`,
            roundNumber: prev.length + 1,
            mode,
            actualMs: ev.actualMs,
            referenceMs: ev.referenceMs,
            absErrorMs: ev.absErrorMs,
            accuracyPercent: ev.accuracyPercent,
            grade: ev.grade,
            gradeLabel: ev.gradeLabel,
            points: ev.totalPoints,
            winnerName,
          },
          ...prev,
        ];

        if (mode === 'giornaliera') {
          const totalDailyPts = nextRounds.reduce((acc, r) => acc + r.points, 0);
          setDailyBestScore((prevBest) => {
            const updatedBest = prevBest === null ? totalDailyPts : Math.max(prevBest, totalDailyPts);
            try {
              window.localStorage.setItem(
                `cronosfida_daily_best_${todayKey}`,
                String(updatedBest)
              );
            } catch {
              // Ignore storage quota errors
            }
            return updatedBest;
          });
        }

        return nextRounds;
      });
    },
    [mode, todayKey, triggerCanvasBurst]
  );

  const handleStopChrono = useCallback(() => {
    const nowPerf = performance.now();
    const elapsedMs = Math.max(80, Math.round(nowPerf - startTimePerfRef.current));
    setStoppedElapsedMs(elapsedMs);
    bridgeRef.current.stoppedElapsedMs = elapsedMs;
    soundEngine.playStopImpact();

    if (mode === 'sfida') {
      // In Modalità Sfida, stopping immediately compares elapsed time against targetSeconds
      const targetMs = Math.round(targetSeconds * 1000);
      const ev = evaluateAttempt(elapsedMs, targetMs, streak, false);
      finalizeRoundRecord(ev);
    } else {
      // In Modalità Classica, Al Buio, and Giornaliera, transition to input/reveal stage
      setTimerPhase('stopped_awaiting_input');
      bridgeRef.current.timerPhase = 'stopped_awaiting_input';
      triggerCanvasBurst(MODE_INFO[mode].accentHex, true);
    }
  }, [finalizeRoundRecord, mode, streak, targetSeconds, triggerCanvasBurst]);

  const handleRevealBlindGuess = useCallback(
    (skipEstimate = false) => {
      const isDaily = mode === 'giornaliera';
      if (skipEstimate && !isDaily) {
        const ev = evaluateAttempt(stoppedElapsedMs, stoppedElapsedMs, streak, false);
        finalizeRoundRecord(ev);
        return;
      }
      const parsedSec = parseSecondsInput(blindGuessInput);
      if (parsedSec === null) {
        setBlindInputError('Inserisci un numero di secondi valido (es. 5.5)');
        return;
      }
      setBlindInputError(null);
      const guessMs = Math.round(parsedSec * 1000);
      const ev = evaluateAttempt(stoppedElapsedMs, guessMs, streak, isDaily);
      finalizeRoundRecord(ev);
    },
    [blindGuessInput, finalizeRoundRecord, mode, stoppedElapsedMs, streak]
  );

  const handleRevealClassicGuesses = useCallback(
    (oralQuickReveal = false) => {
      if (oralQuickReveal) {
        const ev = evaluateAttempt(stoppedElapsedMs, stoppedElapsedMs, streak, false);
        setLastRankedFriends([]);
        finalizeRoundRecord(ev, 'Sfida a Voce');
        return;
      }

      const validInputs: FriendGuessInput[] = [];
      for (const f of classicFriends) {
        const sec = parseSecondsInput(f.guessInput);
        if (sec === null) {
          setClassicError(`Inserisci una stima valida in secondi per ${f.name || 'Amico'}`);
          return;
        }
        validInputs.push({
          playerId: f.id,
          playerName: f.name || 'Amico',
          guessSeconds: sec,
        });
      }

      setClassicError(null);
      const ranked = evaluateClassicGuesses(stoppedElapsedMs, validInputs);
      setLastRankedFriends(ranked);

      const best = ranked[0];
      const ev = evaluateAttempt(
        stoppedElapsedMs,
        best ? best.guessMs : stoppedElapsedMs,
        streak,
        false
      );
      finalizeRoundRecord(ev, best?.playerName);
    },
    [classicFriends, finalizeRoundRecord, stoppedElapsedMs, streak]
  );

  const handleRestartSession = useCallback(() => {
    setRounds([]);
    setStreak(0);
    resetCurrentRound();
    setShellState('playing');
    document.body.dataset.state = 'playing';
    soundEngine.playStartClick();
  }, [resetCurrentRound]);

  const handleNextRoundOrFinishDaily = useCallback(() => {
    if (mode === 'giornaliera' && rounds.length >= DAILY_ROUNDS_TOTAL) {
      setShellState('gameover');
    } else {
      resetCurrentRound();
    }
  }, [mode, resetCurrentRound, rounds.length]);

  // Global keyboard shortcuts (Title Enter/Space handshake, Playing Space Avvia/Stop, 1/2/3/4 Modes, P Pause, M Mute, R Reset)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (shellState === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          handleStartGameFromTitle();
        }
        return;
      }

      if (shellState === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleRestartSession();
        }
        return;
      }

      if (e.code === 'Escape' || (!isTyping && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setShellState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        return;
      }

      if (shellState !== 'playing' || isTyping) return;

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMuted(soundEngine.toggleMute());
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        resetCurrentRound();
      } else if (e.key === '1' && timerPhase !== 'running') {
        e.preventDefault();
        handleSelectMode('classica');
      } else if (e.key === '2' && timerPhase !== 'running') {
        e.preventDefault();
        handleSelectMode('sfida');
      } else if (e.key === '3' && timerPhase !== 'running') {
        e.preventDefault();
        handleSelectMode('buio');
      } else if (e.key === '4' && timerPhase !== 'running') {
        e.preventDefault();
        handleSelectMode('giornaliera');
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (timerPhase === 'idle') {
          handleStartChrono();
        } else if (timerPhase === 'running') {
          handleStopChrono();
        } else if (timerPhase === 'revealed') {
          handleNextRoundOrFinishDaily();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleNextRoundOrFinishDaily,
    handleRestartSession,
    handleSelectMode,
    handleStartChrono,
    handleStartGameFromTitle,
    handleStopChrono,
    resetCurrentRound,
    shellState,
    timerPhase,
  ]);

  const sessionSummary = useMemo(() => computeSessionSummary(rounds), [rounds]);
  const stoppedParts = useMemo(() => splitTimerParts(stoppedElapsedMs), [stoppedElapsedMs]);
  const activeModeInfo = MODE_INFO[mode];
  const chronologicalDailyRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  const currentDailyRoundIndex = Math.min(
    DAILY_ROUNDS_TOTAL,
    rounds.length + (timerPhase === 'revealed' ? 0 : 1)
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#0B0F17] text-[#F8FAFC]">
      {/* Isolated 60fps Canvas Arena */}
      <ChronoCanvas
        bridgeRef={bridgeRef}
        liveDigitsDomRef={liveDigitsDomRef}
        liveCentisDomRef={liveCentisDomRef}
      />

      {/* TITLE SCREEN */}
      {shellState === 'title' && (
        <TitleScreen
          selectedMode={mode}
          onSelectMode={handleSelectMode}
          onStartGame={handleStartGameFromTitle}
        />
      )}

      {/* PLAYING HUD & INTERACTIVE DECK */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 pointer-events-none">
          {/* TOP PERIMETER HUD - Clean Single-Line Header on Mobile & Desktop */}
          <header className="flex items-center justify-between gap-1 sm:gap-2 w-full max-w-5xl mx-auto">
            {/* Top-Left: Logo & Score */}
            <div className="flex items-center gap-1 sm:gap-2 bg-[#0D131F]/95 border border-slate-800 rounded-xl px-1.5 py-1 sm:px-2.5 sm:py-1.5 pointer-events-auto shrink-0 shadow-md">
              <button
                type="button"
                onClick={() => setShellState('title')}
                title="Torna alla schermata iniziale"
                className="cursor-pointer hover:scale-105 transition-transform"
                aria-label="Torna al menu iniziale CronoSfida"
              >
                <AppLogo size="sm" />
              </button>
              <div className="flex flex-col leading-none">
                <span className="text-[8px] sm:text-[9px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  {mode === 'giornaliera' ? 'OGGI' : 'PUNTI'}
                </span>
                <span
                  className="font-mono-tabular text-[11px] sm:text-sm font-extrabold text-[#F59E0B]"
                  data-testid="hud-score"
                >
                  {sessionSummary.totalPoints}
                </span>
              </div>
              <div className="hidden sm:block h-5 w-px bg-slate-800" aria-hidden="true" />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  ROUND
                </span>
                <span className="font-mono-tabular text-sm font-bold text-white">
                  {mode === 'giornaliera'
                    ? `${currentDailyRoundIndex}/${DAILY_ROUNDS_TOTAL}`
                    : `#${rounds.length + (timerPhase === 'revealed' ? 0 : 1)}`}
                </span>
              </div>
            </div>

            {/* Top-Center: 4-Mode Segmented Switcher */}
            <div
              className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl bg-[#0D131F]/95 border border-slate-800 pointer-events-auto shadow-md shrink min-w-0"
              role="tablist"
              aria-label="Modalità di gioco"
            >
              {(['classica', 'sfida', 'buio', 'giornaliera'] as GameMode[]).map((m) => {
                const info = MODE_INFO[m];
                const isActive = mode === m;
                const mobileShort =
                  m === 'giornaliera' ? '5x' : m === 'classica' ? 'Class.' : info.shortTitle;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    disabled={timerPhase === 'running'}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleSelectMode(m);
                    }}
                    className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#F59E0B] text-[#0B0F17] shadow-sm'
                        : 'text-slate-300 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    <ModeIconSvg mode={m} active={isActive} />
                    <span className="sm:hidden">{mobileShort}</span>
                    <span className="hidden sm:inline">{info.shortTitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Top-Right: Sound & Pause Icon Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Riattiva audio' : 'Disattiva audio'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMuted(soundEngine.toggleMute());
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#0D131F]/95 border border-slate-800 hover:border-slate-600 cursor-pointer shadow-md"
              >
                <SoundIconSvg muted={muted} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Pausa"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellState('paused');
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#0D131F]/95 border border-slate-800 hover:border-slate-600 cursor-pointer shadow-md"
              >
                <PauseIconSvg />
              </button>
            </div>
          </header>

          {/* CENTER CHRONOMETER DIAL READOUT (Matched to canvas center at 29% Y on mobile, 38% on desktop) */}
          <div className="fixed left-1/2 top-[29%] md:top-[38%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none w-full max-w-sm px-4">
            <span className="text-[10px] md:text-[11px] font-mono-tabular uppercase tracking-widest text-slate-400 hud-stroke">
              {activeModeInfo.title}
            </span>

            {mode === 'sfida' && (
              <div className="mt-0.5 font-mono-tabular text-xs md:text-sm font-bold text-[#10B981] hud-stroke">
                OBIETTIVO: {targetSeconds.toFixed(2)}s
              </div>
            )}

            {mode === 'giornaliera' && (
              <div className="mt-0.5 font-mono-tabular text-[11px] md:text-xs font-bold text-[#A855F7] hud-stroke">
                ROUND {currentDailyRoundIndex}/{DAILY_ROUNDS_TOTAL} · MAX {DAILY_MAX_ROUND_SCORE} PT
              </div>
            )}

            {/* Main Numeric Readout */}
            <div
              className="mt-0.5 flex items-baseline justify-center font-mono-tabular font-black tracking-tight hud-stroke"
              data-testid="chrono-readout"
            >
              {timerPhase === 'idle' && (
                <>
                  <span className="text-4xl sm:text-5xl md:text-6xl text-white">00</span>
                  <span className="text-2xl sm:text-3xl md:text-4xl text-[#F59E0B]">.00</span>
                  <span className="ml-1 text-base text-slate-400">s</span>
                </>
              )}

              {timerPhase === 'running' &&
                (hideDigitsDuringRun ? (
                  <div className="flex flex-col items-center">
                    <span
                      className="text-4xl sm:text-5xl md:text-6xl text-[#38BDF8] tracking-widest"
                      data-testid="blind-masked-digits"
                    >
                      ??.??
                    </span>
                    <span className="mt-1 text-[10px] font-mono-tabular uppercase tracking-widest text-[#38BDF8]">
                      TIMER NASCOSTO
                    </span>
                  </div>
                ) : (
                  <>
                    <span
                      ref={liveDigitsDomRef}
                      className="text-4xl sm:text-5xl md:text-6xl text-white"
                    >
                      00
                    </span>
                    <span
                      ref={liveCentisDomRef}
                      className="text-2xl sm:text-3xl md:text-4xl text-[#F59E0B]"
                    >
                      .00
                    </span>
                    <span className="ml-1 text-base text-slate-400">s</span>
                  </>
                ))}

              {timerPhase === 'stopped_awaiting_input' &&
                (mode === 'buio' ||
                mode === 'giornaliera' ||
                (mode === 'classica' && classicSecretHold) ? (
                  <div className="flex flex-col items-center">
                    <span
                      className="text-4xl sm:text-5xl md:text-6xl text-[#38BDF8] tracking-widest"
                      data-testid="stopped-masked-digits"
                    >
                      ??.??
                    </span>
                    <span className="mt-1 text-[10px] font-mono-tabular uppercase tracking-widest text-amber-400">
                      TEMPO SEGRETO
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl sm:text-5xl md:text-6xl text-white">
                      {stoppedParts.secondsStr}
                    </span>
                    <span className="text-2xl sm:text-3xl md:text-4xl text-[#F59E0B]">
                      .{stoppedParts.centisecondsStr}
                    </span>
                    <span className="ml-1 text-base text-slate-400">s</span>
                  </>
                ))}

              {timerPhase === 'revealed' && (
                <>
                  <span className="text-4xl sm:text-5xl md:text-6xl text-white">
                    {stoppedParts.secondsStr}
                  </span>
                  <span className="text-2xl sm:text-3xl md:text-4xl text-[#10B981]">
                    .{stoppedParts.centisecondsStr}
                  </span>
                  <span className="ml-1 text-base text-slate-400">s</span>
                </>
              )}
            </div>
          </div>

          {/* BOTTOM PERIMETER INTERACTION DOCK - Mobile First & Super Clean */}
          <div className="w-full max-w-xl mx-auto pointer-events-auto pb-1 sm:pb-3">
            <div className="rounded-2xl sm:rounded-3xl bg-[#0D131F]/95 backdrop-blur-md border border-slate-800 p-3 sm:p-5 shadow-2xl">
              {/* DAILY 5-ROUND TRACKER PILLS (Visible in Modalità Giornaliera) */}
              {mode === 'giornaliera' && (
                <div className="mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular mb-1.5">
                    <span className="text-purple-300 font-bold uppercase tracking-wider">
                      Sfida Giornaliera ({rounds.length}/{DAILY_ROUNDS_TOTAL} completati)
                    </span>
                    <span className="text-amber-400 font-extrabold">
                      {sessionSummary.totalPoints.toLocaleString('it-IT')} /{' '}
                      {DAILY_MAX_TOTAL_SCORE.toLocaleString('it-IT')} PT
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: DAILY_ROUNDS_TOTAL }).map((_, idx) => {
                      const doneRound = chronologicalDailyRounds[idx];
                      const isCurrent = idx + 1 === currentDailyRoundIndex && !doneRound;
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg py-1 px-1 text-center font-mono-tabular text-[10px] border ${
                            doneRound
                              ? 'bg-purple-950/60 border-purple-500/60 text-amber-300 font-bold'
                              : isCurrent
                              ? 'bg-slate-800/90 border-amber-400 text-white font-bold'
                              : 'bg-[#0B0F17] border-slate-800 text-slate-500'
                          }`}
                        >
                          {doneRound ? `${doneRound.points}pt` : `R${idx + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PHASE 1: IDLE SETUP & START BUTTON */}
              {timerPhase === 'idle' && (
                <div className="flex flex-col gap-2.5 sm:gap-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-300 leading-snug">
                      {mode === 'classica' &&
                        'Avvia e ferma il cronometro a sorpresa: gli amici indovinano.'}
                      {mode === 'sfida' &&
                        `Gli amici dicono STOP a ${targetSeconds.toFixed(1)}s esatti.`}
                      {mode === 'buio' &&
                        'Timer invisibile: ferma quando vuoi e indovina quanti secondi sono passati.'}
                      {mode === 'giornaliera' &&
                        `Round ${currentDailyRoundIndex} di ${DAILY_ROUNDS_TOTAL}: avvia e ferma al buio, poi indovina il tempo per ottenere da 1 a 5.000 PT!`}
                    </p>

                    {/* Optional visibility toggle */}
                    {mode !== 'buio' && mode !== 'giornaliera' && (
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={hideInChallengeOrClassic}
                          onChange={(e) => setHideInChallengeOrClassic(e.target.checked)}
                          className="rounded border-slate-600 text-[#F59E0B] focus:ring-[#F59E0B]"
                        />
                        <span>Oscura</span>
                      </label>
                    )}
                  </div>

                  {/* Mode-specific pre-start controls */}
                  {mode === 'sfida' && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
                          Scegli Obiettivo:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, Math.round((targetSeconds - 0.5) * 10) / 10);
                              setTargetSeconds(next);
                              setCustomTargetInput(String(next));
                            }}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono-tabular text-sm font-extrabold text-[#10B981] px-1.5">
                            {targetSeconds.toFixed(1)}s
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(60, Math.round((targetSeconds + 0.5) * 10) / 10);
                              setTargetSeconds(next);
                              setCustomTargetInput(String(next));
                            }}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {PRESET_TARGETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setTargetSeconds(preset);
                              setCustomTargetInput(String(preset));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono-tabular font-bold cursor-pointer whitespace-nowrap transition-colors ${
                              Math.abs(targetSeconds - preset) < 0.01
                                ? 'bg-[#10B981] text-[#0B0F17]'
                                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {preset}s
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const randomTarget =
                              Math.round((2 + Math.random() * 12) * 2) / 2;
                            setTargetSeconds(randomTarget);
                            setCustomTargetInput(String(randomTarget));
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono-tabular bg-slate-800/90 hover:bg-slate-700 text-[#F59E0B] font-bold cursor-pointer whitespace-nowrap ml-auto"
                        >
                          Casuale 🎲
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'classica' && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span>Suspense per gli amici:</span>
                      <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={classicSecretHold}
                          onChange={(e) => setClassicSecretHold(e.target.checked)}
                          className="rounded border-slate-600 text-[#F59E0B] focus:ring-[#F59E0B]"
                        />
                        <span>Nascondi cifre allo STOP</span>
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleStartChrono();
                    }}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-[#0B0F17] font-display font-black text-base tracking-wider cursor-pointer whitespace-nowrap shadow-lg shadow-amber-500/20 transition-all"
                  >
                    {mode === 'giornaliera'
                      ? `AVVIA ROUND ${currentDailyRoundIndex}/${DAILY_ROUNDS_TOTAL} AL BUIO`
                      : 'AVVIA CRONOMETRO'}
                  </button>
                </div>
              )}

              {/* PHASE 2: RUNNING -> GIANT TACTILE STOP BUTTON */}
              {timerPhase === 'running' && (
                <div className="flex flex-col items-center gap-2.5 sm:gap-3">
                  <p className="text-xs sm:text-sm text-slate-300 text-center font-medium">
                    {mode === 'classica' &&
                      'Ferma il cronometro a sorpresa e chiedi agli amici: "Quanto tempo è passato?"'}
                    {mode === 'sfida' &&
                      `I tuoi amici devono dirti STOP esattamente a ${targetSeconds.toFixed(1)} secondi!`}
                    {(mode === 'buio' || mode === 'giornaliera') &&
                      'Il cronometro scorre al buio! Premi STOP quando decidi tu.'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleStopChrono();
                    }}
                    className="w-full py-4 sm:py-5 px-8 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 active:scale-97 text-white font-display font-black text-2xl tracking-widest cursor-pointer whitespace-nowrap shadow-xl shadow-rose-600/30 transition-all animate-pulse"
                  >
                    STOP!
                  </button>
                </div>
              )}

              {/* PHASE 3A: STOPPED IN MODALITÀ AL BUIO OR GIORNALIERA -> GUESS HOW MUCH TIME PASSED */}
              {timerPhase === 'stopped_awaiting_input' &&
                (mode === 'buio' || mode === 'giornaliera') && (
                  <div className="flex flex-col gap-3">
                    <div className="text-center">
                      <h3 className="font-display font-bold text-base text-white">
                        {mode === 'giornaliera'
                          ? `Round ${currentDailyRoundIndex}/${DAILY_ROUNDS_TOTAL} Fermato al Buio!`
                          : 'Timer Fermato al Buio!'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {mode === 'giornaliera'
                          ? 'Indovina quanti secondi sono passati (da 1 a 5.000 punti):'
                          : 'Quanti secondi pensi siano trascorsi?'}
                      </p>
                    </div>

                    {/* Clean Stepper */}
                    <div className="flex items-center justify-center gap-2 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          const curr = parseSecondsInput(blindGuessInput) ?? 5;
                          const next = Math.max(0.5, Math.round((curr - 1) * 10) / 10);
                          setBlindGuessInput(next.toFixed(1));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer"
                      >
                        -1s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curr = parseSecondsInput(blindGuessInput) ?? 5;
                          const next = Math.max(0.5, Math.round((curr - 0.5) * 10) / 10);
                          setBlindGuessInput(next.toFixed(1));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer"
                      >
                        -0.5s
                      </button>

                      <div className="flex items-center gap-1 px-3 py-1 bg-[#0B0F17] border border-slate-700 rounded-xl">
                        <input
                          id="blind-guess-input"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="300"
                          value={blindGuessInput}
                          aria-label="Secondi stimati"
                          onChange={(e) => {
                            setBlindGuessInput(e.target.value);
                            setBlindInputError(null);
                          }}
                          className="w-16 bg-transparent text-center font-mono-tabular text-lg font-black text-[#38BDF8] focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-mono-tabular">sec</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const curr = parseSecondsInput(blindGuessInput) ?? 5;
                          const next = Math.round((curr + 0.5) * 10) / 10;
                          setBlindGuessInput(next.toFixed(1));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer"
                      >
                        +0.5s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curr = parseSecondsInput(blindGuessInput) ?? 5;
                          const next = Math.round((curr + 1) * 10) / 10;
                          setBlindGuessInput(next.toFixed(1));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-tabular text-slate-200 cursor-pointer"
                      >
                        +1s
                      </button>
                    </div>

                    {blindInputError && (
                      <p className="text-xs text-rose-400 text-center font-medium" role="alert">
                        {blindInputError}
                      </p>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleRevealBlindGuess(false)}
                        className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 active:scale-98 text-[#0B0F17] font-display font-black text-sm tracking-wider cursor-pointer whitespace-nowrap shadow-lg shadow-sky-500/20"
                      >
                        {mode === 'giornaliera'
                          ? 'CONFERMA STIMA E CALCOLA (1–5000 PT)'
                          : 'RIVELA IL TEMPO SEGRETO'}
                      </button>

                      {mode === 'buio' && (
                        <button
                          type="button"
                          onClick={() => handleRevealBlindGuess(true)}
                          className="text-center text-xs text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
                        >
                          Rivela subito senza stima
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* PHASE 3B: STOPPED IN MODALITÀ CLASSICA */}
              {timerPhase === 'stopped_awaiting_input' && mode === 'classica' && (
                <div className="flex flex-col gap-3">
                  {!showClassicFriendsInputs ? (
                    <div className="flex flex-col gap-2.5 text-center">
                      <h3 className="font-display font-bold text-base text-white">
                        Cronometro Fermato!
                      </h3>
                      <p className="text-xs text-slate-300">
                        {classicSecretHold
                          ? 'Il tempo è segreto. Chiedi a voce agli amici quanti secondi sono passati, poi rivelalo!'
                          : 'Confronta a voce le risposte dei tuoi amici con il tempo effettivo!'}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleRevealClassicGuesses(true)}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-[#0B0F17] font-display font-black text-base tracking-wider cursor-pointer whitespace-nowrap shadow-lg shadow-amber-500/20"
                      >
                        RIVELA IL TEMPO
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowClassicFriendsInputs(true)}
                        className="py-2 px-3 text-xs text-slate-400 hover:text-[#F59E0B] font-medium cursor-pointer transition-colors"
                      >
                        📝 Inserisci le stime degli amici per calcolare la classifica
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Stime dei giocatori:</span>
                        {classicFriends.length < 4 && (
                          <button
                            type="button"
                            onClick={() =>
                              setClassicFriends((prev) => [
                                ...prev,
                                {
                                  id: `f-${Date.now()}`,
                                  name: `Amico ${prev.length + 1}`,
                                  guessInput: '5.0',
                                },
                              ])
                            }
                            className="text-xs text-[#F59E0B] hover:underline cursor-pointer"
                          >
                            + Aggiungi
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {classicFriends.map((friend, idx) => (
                          <div
                            key={friend.id}
                            className="flex items-center gap-2 bg-[#0B0F17] border border-slate-800 rounded-lg px-2.5 py-1.5"
                          >
                            <input
                              type="text"
                              aria-label={`Nome giocatore ${idx + 1}`}
                              value={friend.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setClassicFriends((prev) =>
                                  prev.map((item) =>
                                    item.id === friend.id ? { ...item, name: val } : item
                                  )
                                );
                              }}
                              className="w-20 bg-transparent text-xs font-medium text-slate-200 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400">sec:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="300"
                              aria-label={`Stima di ${friend.name}`}
                              value={friend.guessInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setClassicError(null);
                                setClassicFriends((prev) =>
                                  prev.map((item) =>
                                    item.id === friend.id ? { ...item, guessInput: val } : item
                                  )
                                );
                              }}
                              className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono-tabular text-xs font-bold text-[#F59E0B] focus:outline-none"
                            />
                            {classicFriends.length > 1 && (
                              <button
                                type="button"
                                aria-label={`Rimuovi ${friend.name}`}
                                onClick={() =>
                                  setClassicFriends((prev) =>
                                    prev.filter((item) => item.id !== friend.id)
                                  )
                                }
                                className="ml-auto text-xs text-slate-500 hover:text-rose-400 cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {classicError && (
                        <p className="text-xs text-rose-400 font-medium" role="alert">
                          {classicError}
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRevealClassicGuesses(false)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-display font-extrabold text-sm tracking-wider cursor-pointer whitespace-nowrap"
                        >
                          CALCOLA VINCITORE
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClassicFriendsInputs(false)}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PHASE 4: REVEALED VERDICT & ACCURACY BREAKDOWN */}
              {timerPhase === 'revealed' && lastEvaluation && (
                <div className="flex flex-col gap-2.5 sm:gap-3" data-testid="round-verdict">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#10B981] font-bold">
                        {lastEvaluation.gradeLabel} · +{lastEvaluation.totalPoints.toLocaleString('it-IT')}
                        {mode === 'giornaliera' ? ` / ${DAILY_MAX_ROUND_SCORE} PT` : ' PT'}
                      </span>
                      <h3 className="font-display font-bold text-sm sm:text-base text-white">
                        {lastEvaluation.gradeSubtitle}
                      </h3>
                    </div>
                    {streak > 1 && mode !== 'giornaliera' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[#F59E0B] text-xs font-mono-tabular font-bold border border-amber-400/30">
                        🔥 {streak}x Streak
                      </span>
                    )}
                  </div>

                  {/* Clean 3-Column Metric Grid on Mobile */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-[#0B0F17]/90 border border-slate-800 text-center font-mono-tabular">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Reale</span>
                      <strong className="text-sm sm:text-base text-white font-extrabold">
                        {formatSeconds(lastEvaluation.actualMs)}
                      </strong>
                    </div>
                    <div className="flex flex-col border-x border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {mode === 'sfida' ? 'Bersaglio' : 'Stima'}
                      </span>
                      <strong className="text-sm sm:text-base text-[#F59E0B] font-extrabold">
                        {formatSeconds(lastEvaluation.referenceMs)}
                      </strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Scarto</span>
                      <strong className="text-sm sm:text-base text-[#38BDF8] font-extrabold">
                        {formatSignedDelta(lastEvaluation.signedDeltaMs)} ({lastEvaluation.absErrorMs}ms)
                      </strong>
                    </div>
                  </div>

                  {/* Classic Mode Friends Podium if evaluated */}
                  {mode === 'classica' && lastRankedFriends.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                      {lastRankedFriends.map((rf) => (
                        <div
                          key={rf.playerId}
                          className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs font-mono-tabular ${
                            rf.isWinner
                              ? 'bg-[#10B981]/20 border-[#10B981] text-white shadow-sm'
                              : 'bg-[#0B0F17] border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-sans font-semibold">
                            {rf.isWinner ? '👑 ' : ''}
                            {rf.rank}° {rf.playerName}
                          </span>
                          <span>
                            {rf.guessSeconds.toFixed(2)}s ({rf.absErrorMs}ms)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleNextRoundOrFinishDaily();
                      }}
                      className="flex-1 py-3 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-[#0B0F17] font-display font-black text-xs sm:text-sm tracking-wider cursor-pointer whitespace-nowrap shadow-lg shadow-amber-500/20"
                    >
                      {mode === 'giornaliera'
                        ? rounds.length >= DAILY_ROUNDS_TOTAL
                          ? 'VEDI RIEPILOGO GIORNALIERO (5/5)'
                          : `PROSSIMO ROUND (${rounds.length + 1}/${DAILY_ROUNDS_TOTAL})`
                        : 'PROSSIMO ROUND'}
                    </button>
                    {!(mode === 'giornaliera' && rounds.length >= DAILY_ROUNDS_TOTAL) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setShellState('gameover');
                        }}
                        className="py-3 px-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-300 cursor-pointer whitespace-nowrap"
                      >
                        Riepilogo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <PauseModal
          onResume={() => setShellState('playing')}
          onRestartSession={handleRestartSession}
          onReturnTitle={() => {
            resetCurrentRound();
            setShellState('title');
          }}
        />
      )}

      {/* GAME OVER / SESSION SUMMARY MODAL */}
      {shellState === 'gameover' && (
        <GameOverModal
          summary={sessionSummary}
          rounds={rounds}
          activeMode={mode}
          dailyBestScore={dailyBestScore}
          onPlayAgain={handleRestartSession}
          onReturnTitle={() => {
            resetCurrentRound();
            setShellState('title');
          }}
        />
      )}
    </main>
  );
}
