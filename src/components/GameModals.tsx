import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  DAILY_MAX_ROUND_SCORE,
  DAILY_MAX_TOTAL_SCORE,
  DAILY_ROUNDS_TOTAL,
  GameMode,
  RoundRecord,
  SessionSummary,
  formatSeconds,
} from '../game/rules';
import { AppLogo } from './AppLogo';

interface PauseModalProps {
  onResume: () => void;
  onRestartSession: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestartSession,
  onReturnTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-slate-700 p-6 shadow-2xl text-center">
        <div className="flex justify-center mb-2">
          <AppLogo size="md" />
        </div>
        <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#F59E0B]">
          CRONOMETRO IN PAUSA
        </p>
        <h2 id="pause-modal-title" className="mt-1 font-display text-2xl font-bold text-white">
          Partita Sospesa
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Prenditi un respiro con i tuoi amici o cambia modalità prima del prossimo round.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-display font-bold text-sm tracking-wide cursor-pointer whitespace-nowrap"
          >
            RIPRENDI GIOCO
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestartSession();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm cursor-pointer whitespace-nowrap"
          >
            AZZERA PUNTEGGI E RICOMINCIA
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm cursor-pointer whitespace-nowrap"
          >
            TORNA ALLA SCHERMATA INIZIALE
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  summary: SessionSummary;
  rounds: RoundRecord[];
  activeMode?: GameMode;
  dailyBestScore?: number | null;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  rounds,
  activeMode,
  dailyBestScore,
  onPlayAgain,
  onReturnTitle,
}) => {
  const isDailySession =
    activeMode === 'giornaliera' ||
    (rounds.length > 0 && rounds.every((r) => r.mode === 'giornaliera'));

  const chronologicalRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  const chartData = useMemo(
    () =>
      chronologicalRounds.map((r) => ({
        name: `R${r.roundNumber}`,
        roundNumber: r.roundNumber,
        scartoMs: r.absErrorMs,
        precisione: r.accuracyPercent,
        punti: r.points,
        reale: formatSeconds(r.actualMs),
        stima: formatSeconds(r.referenceMs),
      })),
    [chronologicalRounds]
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/80 pointer-events-auto overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#0F172A] border border-slate-700 p-4 sm:p-6 shadow-2xl my-auto">
        <div className="text-center">
          <div className="flex justify-center mb-1.5">
            <AppLogo size="md" />
          </div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#10B981] font-bold">
            {isDailySession
              ? `SFIDA GIORNALIERA CIECA (${rounds.length}/${DAILY_ROUNDS_TOTAL} ROUND)`
              : `RIEPILOGO SESSIONE · ${summary.rankTitle}`}
          </p>
          <h2
            id="gameover-modal-title"
            className="mt-0.5 font-display text-xl sm:text-2xl font-extrabold text-white"
          >
            {isDailySession ? 'Risultato Giornaliero' : 'Verdetto del Cronometro'}
          </h2>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
              {isDailySession ? 'TOTALE (MAX 25K)' : 'PUNTEGGIO'}
            </div>
            <div className="mt-0.5 font-mono-tabular text-lg sm:text-xl font-black text-[#F59E0B]">
              {summary.totalPoints.toLocaleString('it-IT')}
              {isDailySession && (
                <span className="text-[10px] text-slate-400 font-normal">
                  /{DAILY_MAX_TOTAL_SCORE / 1000}k
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
              SCARTO MEDIO
            </div>
            <div className="mt-0.5 font-mono-tabular text-lg sm:text-xl font-black text-[#10B981]">
              {summary.avgErrorMs !== null ? `${summary.avgErrorMs}ms` : '—'}
            </div>
          </div>
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-2.5 text-center">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400">
              MIGLIOR SCARTO
            </div>
            <div className="mt-0.5 font-mono-tabular text-lg sm:text-xl font-black text-[#38BDF8]">
              {summary.bestErrorMs !== null ? `${summary.bestErrorMs}ms` : '—'}
            </div>
          </div>
        </div>

        {isDailySession && dailyBestScore !== null && dailyBestScore !== undefined && (
          <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono-tabular">
            <span className="text-purple-200">Record Giornaliero di Oggi:</span>
            <strong className="text-amber-400 font-bold">
              {dailyBestScore.toLocaleString('it-IT')} / {DAILY_MAX_TOTAL_SCORE.toLocaleString('it-IT')} PT
            </strong>
          </div>
        )}

        {/* Recharts Accuracy Evolution Line Chart (Scarto ms over rounds) */}
        <div
          className="mt-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 p-3"
          data-testid="accuracy-line-chart"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-mono-tabular uppercase tracking-wider text-slate-300 font-bold">
              Evoluzione Accuratezza · Scarto (ms) nel Tempo
            </span>
            <span className="text-[10px] font-mono-tabular text-[#38BDF8]">
              Più basso = più preciso
            </span>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-36 sm:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -12, bottom: 2 }}
                >
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    unit="ms"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      if (name === 'scartoMs') {
                        return [`${value} ms`, 'Scarto dal tempo reale'];
                      }
                      return [String(value), String(name)];
                    }}
                    labelFormatter={(label: unknown) => `Round ${String(label).replace('R', '')}`}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#10B981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <Line
                    type="monotone"
                    dataKey="scartoMs"
                    name="scartoMs"
                    stroke="#38BDF8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#F59E0B', stroke: '#0B0F17', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#10B981' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-slate-500 font-mono-tabular">
              Completa almeno un round per visualizzare il grafico dello scarto (ms).
            </div>
          )}
        </div>

        {/* Rounds Breakdown List */}
        {chronologicalRounds.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-xl bg-[#0B0F17] border border-slate-800 divide-y divide-slate-800/80">
            {chronologicalRounds.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-1.5 text-xs font-mono-tabular"
              >
                <span className="text-slate-300 font-bold">
                  Round #{r.roundNumber}
                  {r.winnerName ? ` · ${r.winnerName}` : ''}
                </span>
                <span className="text-slate-400">
                  Reale {formatSeconds(r.actualMs)} · Scarto{' '}
                  <strong className="text-[#38BDF8]">{r.absErrorMs}ms</strong>
                </span>
                <span className="font-extrabold text-[#F59E0B]">
                  +{r.points.toLocaleString('it-IT')}
                  {r.mode === 'giornaliera' ? `/${DAILY_MAX_ROUND_SCORE}` : ' pt'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayAgain();
            }}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0B0F17] font-display font-black text-sm tracking-wider cursor-pointer whitespace-nowrap shadow-lg shadow-amber-500/20"
          >
            {isDailySession ? 'RIGIOCA SFIDA GIORNALIERA (5 ROUND)' : 'GIOCA ANCORA'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="py-3 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap"
          >
            MENU PRINCIPALE
          </button>
        </div>
      </div>
    </div>
  );
};
