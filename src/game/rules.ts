export type GameMode = 'classica' | 'sfida' | 'buio' | 'giornaliera';

export type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export type TimerPhase = 'idle' | 'running' | 'stopped_awaiting_input' | 'revealed';

export type AccuracyGrade = 'PERFETTO' | 'CECCHINO' | 'OTTIMO' | 'BUONO' | 'FUORI_TEMPO';

export const DAILY_ROUNDS_TOTAL = 5;
export const DAILY_MIN_ROUND_SCORE = 1;
export const DAILY_MAX_ROUND_SCORE = 5000;
export const DAILY_MAX_TOTAL_SCORE = DAILY_ROUNDS_TOTAL * DAILY_MAX_ROUND_SCORE;

export interface EvaluationResult {
  actualMs: number;
  referenceMs: number;
  signedDeltaMs: number;
  absErrorMs: number;
  accuracyPercent: number;
  grade: AccuracyGrade;
  gradeLabel: string;
  gradeSubtitle: string;
  basePoints: number;
  totalPoints: number;
  nextStreak: number;
}

export interface FriendGuessInput {
  playerId: string;
  playerName: string;
  guessSeconds: number;
}

export interface RankedFriendGuess {
  playerId: string;
  playerName: string;
  guessSeconds: number;
  guessMs: number;
  absErrorMs: number;
  signedDeltaMs: number;
  accuracyPercent: number;
  grade: AccuracyGrade;
  gradeLabel: string;
  pointsAwarded: number;
  rank: number;
  isWinner: boolean;
}

export interface RoundRecord {
  id: string;
  roundNumber: number;
  mode: GameMode;
  actualMs: number;
  referenceMs: number;
  absErrorMs: number;
  accuracyPercent: number;
  grade: AccuracyGrade;
  gradeLabel: string;
  points: number;
  winnerName?: string;
}

export interface SessionSummary {
  roundsPlayed: number;
  totalPoints: number;
  bestErrorMs: number | null;
  avgErrorMs: number | null;
  avgAccuracyPercent: number;
  perfectCount: number;
  rankTitle: string;
}

export const MODE_INFO: Record<
  GameMode,
  {
    id: GameMode;
    title: string;
    shortTitle: string;
    kicker: string;
    description: string;
    howToPlay: string;
    accentHex: string;
  }
> = {
  classica: {
    id: 'classica',
    title: 'Modalità Classica',
    shortTitle: 'Classica',
    kicker: 'L’Host ferma · Gli amici indovinano',
    description:
      'Tu avvii e fermi il cronometro quando vuoi. I tuoi amici devono indovinare quanti secondi sono trascorsi!',
    howToPlay:
      'Clicca AVVIA e poi STOP quando preferisci. Inserisci le stime dei tuoi amici (o falle dire a voce) e scopri chi si è avvicinato di più.',
    accentHex: '#F59E0B',
  },
  sfida: {
    id: 'sfida',
    title: 'Modalità Sfida',
    shortTitle: 'Sfida',
    kicker: 'Dichiara un numero · Stop al bersaglio',
    description:
      'Dichiara un tempo bersaglio (es. 7.00s). I tuoi amici devono urlarti "STOP!" esattamente quando pensano sia trascorso quel tempo.',
    howToPlay:
      'Imposta il tempo obiettivo, premi AVVIA e fermalo nell’istante esatto in cui i tuoi amici dicono STOP.',
    accentHex: '#10B981',
  },
  buio: {
    id: 'buio',
    title: 'Modalità Al Buio',
    shortTitle: 'Al Buio',
    kicker: 'Cronometro nascosto · Senso del tempo',
    description:
      'Passa il telefono agli amici: cliccano AVVIA e poi STOP con il timer completamente oscurato e devono capire quanto tempo è passato.',
    howToPlay:
      'Il timer è invisibile durante il conteggio. Premi AVVIA, poi STOP, scrivi quanti secondi pensi siano passati e sblocca il risultato reale!',
    accentHex: '#38BDF8',
  },
  giornaliera: {
    id: 'giornaliera',
    title: 'Sfida Giornaliera Cieca',
    shortTitle: 'Giornaliera',
    kicker: '5 Round al Buio · Da 1 a 5000 PT a round',
    description:
      'Ogni giorno hai 5 tentativi in modalità cieca: avvia e ferma il timer al buio, indovina quanto tempo è passato e ottieni da 1 a 5.000 punti per round (fino a 25.000 PT)!',
    howToPlay:
      'Completa i 5 round giornalieri al buio. Più la tua stima è vicina al tempo reale, più ti avvicini ai 5.000 punti per round.',
    accentHex: '#A855F7',
  },
};

export function isTimerHiddenDuringRun(mode: GameMode, hideInClassicOrChallenge = false): boolean {
  if (mode === 'buio' || mode === 'giornaliera') {
    return true;
  }
  return hideInClassicOrChallenge;
}

export function getTodayDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates a score strictly between 1 and 5000 based on absolute millisecond error.
 * 0-15ms error awards the full 5000 points; larger errors decay smoothly down to a minimum of 1 point.
 */
export function calculateDailyRoundScore(absErrorMs: number): number {
  const safeError = Math.max(0, Math.round(absErrorMs));
  if (safeError <= 15) {
    return DAILY_MAX_ROUND_SCORE;
  }
  const raw = Math.round(DAILY_MAX_ROUND_SCORE * Math.exp(-(safeError - 15) / 1150));
  return Math.max(DAILY_MIN_ROUND_SCORE, Math.min(DAILY_MAX_ROUND_SCORE, raw));
}

export function splitTimerParts(ms: number): {
  secondsStr: string;
  centisecondsStr: string;
  millisecondsStr: string;
  formatted: string;
} {
  const clamped = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const remMs = clamped % 1000;
  const centiseconds = Math.floor(remMs / 10);

  const secondsStr = String(totalSeconds).padStart(2, '0');
  const centisecondsStr = String(centiseconds).padStart(2, '0');
  const millisecondsStr = String(remMs).padStart(3, '0');

  return {
    secondsStr,
    centisecondsStr,
    millisecondsStr,
    formatted: `${secondsStr}.${centisecondsStr}`,
  };
}

export function formatSeconds(ms: number): string {
  const { formatted } = splitTimerParts(ms);
  return `${formatted}s`;
}

export function formatSignedDelta(deltaMs: number): string {
  const sign = deltaMs > 0 ? '+' : deltaMs < 0 ? '-' : '±';
  const absSec = (Math.abs(deltaMs) / 1000).toFixed(2);
  return `${sign}${absSec}s`;
}

export function parseSecondsInput(raw: string | number): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0 || raw > 600) return null;
    return Math.round(raw * 100) / 100;
  }
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 600) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

export function evaluateAttempt(
  actualMs: number,
  referenceMs: number,
  currentStreak = 0,
  isDailyMode = false
): EvaluationResult {
  const safeActual = Math.max(0, Math.round(actualMs));
  const safeRef = Math.max(100, Math.round(referenceMs));
  const signedDeltaMs = safeActual - safeRef;
  const absErrorMs = Math.abs(signedDeltaMs);

  // Relative and absolute accuracy blend so both short (3s) and longer (15s) timers feel fair
  const relativeRatio = absErrorMs / Math.max(3000, safeRef);
  const rawAccuracy = Math.max(0, 100 * (1 - relativeRatio * 1.15));
  const accuracyPercent = Math.round(rawAccuracy * 10) / 10;

  let grade: AccuracyGrade;
  let gradeLabel: string;
  let gradeSubtitle: string;
  let basePoints: number;
  let keepsStreak = false;

  if (absErrorMs <= 60) {
    grade = 'PERFETTO';
    gradeLabel = 'OROLOGIO SVIZZERO!';
    gradeSubtitle = 'Precisione assoluta entro 60 millisecondi';
    basePoints = 1000;
    keepsStreak = true;
  } else if (absErrorMs <= 220) {
    grade = 'CECCHINO';
    gradeLabel = 'CECCHINO DEL TEMPO!';
    gradeSubtitle = 'Riflessi fulminei, scarto quasi impercettibile';
    basePoints = 750;
    keepsStreak = true;
  } else if (absErrorMs <= 500) {
    grade = 'OTTIMO';
    gradeLabel = 'OTTIMO SENSO DEL RITMO';
    gradeSubtitle = 'Meno di mezzo secondo di differenza';
    basePoints = 500;
    keepsStreak = true;
  } else if (absErrorMs <= 1100) {
    grade = 'BUONO';
    gradeLabel = 'BUON TENTATIVO';
    gradeSubtitle = 'Vicino al bersaglio, affina il conteggio mentale';
    basePoints = 250;
    keepsStreak = false;
  } else {
    grade = 'FUORI_TEMPO';
    gradeLabel = 'FUORI TEMPO';
    gradeSubtitle = 'Il tempo scorre più veloce (o più lento) di quanto pensi!';
    basePoints = Math.max(50, Math.round(accuracyPercent * 2));
    keepsStreak = false;
  }

  const nextStreak = keepsStreak ? currentStreak + 1 : 0;

  if (isDailyMode) {
    const dailyScore = calculateDailyRoundScore(absErrorMs);
    return {
      actualMs: safeActual,
      referenceMs: safeRef,
      signedDeltaMs,
      absErrorMs,
      accuracyPercent,
      grade,
      gradeLabel,
      gradeSubtitle,
      basePoints: dailyScore,
      totalPoints: dailyScore,
      nextStreak,
    };
  }

  const streakBonus = keepsStreak ? Math.min(currentStreak, 5) * 100 : 0;
  const totalPoints = basePoints + streakBonus;

  return {
    actualMs: safeActual,
    referenceMs: safeRef,
    signedDeltaMs,
    absErrorMs,
    accuracyPercent,
    grade,
    gradeLabel,
    gradeSubtitle,
    basePoints,
    totalPoints,
    nextStreak,
  };
}

export function evaluateClassicGuesses(
  actualMs: number,
  guesses: FriendGuessInput[]
): RankedFriendGuess[] {
  if (!guesses.length) return [];

  const evaluated = guesses.map((g) => {
    const guessMs = Math.round(g.guessSeconds * 1000);
    const ev = evaluateAttempt(actualMs, guessMs, 0);
    return {
      playerId: g.playerId,
      playerName: g.playerName.trim() || 'Amico',
      guessSeconds: g.guessSeconds,
      guessMs,
      absErrorMs: ev.absErrorMs,
      signedDeltaMs: guessMs - Math.round(actualMs),
      accuracyPercent: ev.accuracyPercent,
      grade: ev.grade,
      gradeLabel: ev.gradeLabel,
      pointsAwarded: ev.basePoints,
      rank: 1,
      isWinner: false,
    };
  });

  evaluated.sort((a, b) => a.absErrorMs - b.absErrorMs);

  const bestError = evaluated[0].absErrorMs;
  return evaluated.map((item, idx) => {
    const isWinner = item.absErrorMs === bestError;
    return {
      ...item,
      rank: idx + 1,
      isWinner,
      pointsAwarded: isWinner ? item.pointsAwarded + 150 : item.pointsAwarded,
    };
  });
}

export function computeSessionSummary(rounds: RoundRecord[]): SessionSummary {
  if (rounds.length === 0) {
    return {
      roundsPlayed: 0,
      totalPoints: 0,
      bestErrorMs: null,
      avgErrorMs: null,
      avgAccuracyPercent: 0,
      perfectCount: 0,
      rankTitle: 'Apprendista del Tempo',
    };
  }

  const totalPoints = rounds.reduce((acc, r) => acc + r.points, 0);
  const bestErrorMs = Math.min(...rounds.map((r) => r.absErrorMs));
  const sumErrorMs = rounds.reduce((acc, r) => acc + r.absErrorMs, 0);
  const avgErrorMs = Math.round(sumErrorMs / rounds.length);
  const sumAccuracy = rounds.reduce((acc, r) => acc + r.accuracyPercent, 0);
  const avgAccuracyPercent = Math.round((sumAccuracy / rounds.length) * 10) / 10;
  const perfectCount = rounds.filter(
    (r) => r.grade === 'PERFETTO' || r.grade === 'CECCHINO'
  ).length;

  let rankTitle = 'Apprendista del Tempo';
  if (avgAccuracyPercent >= 94 || bestErrorMs <= 50) {
    rankTitle = 'Maestro Orologiaio Svizzero';
  } else if (avgAccuracyPercent >= 85) {
    rankTitle = 'Signore dei Cronografi';
  } else if (avgAccuracyPercent >= 72) {
    rankTitle = 'Custode del Tempo';
  }

  return {
    roundsPlayed: rounds.length,
    totalPoints,
    bestErrorMs,
    avgErrorMs,
    avgAccuracyPercent,
    perfectCount,
    rankTitle,
  };
}
