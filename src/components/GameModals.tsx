import React from 'react';
import { RoundRecord, SessionSummary, formatSeconds } from '../game/rules';
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
      <div className="w-full max-w-md rounded-xl bg-[#0F172A] border border-slate-700 p-6 shadow-2xl text-center">
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
          Prenditi un respiro con i tuoi amici o cambia impostazioni prima del prossimo round.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-display font-bold text-sm tracking-wide cursor-pointer whitespace-nowrap"
          >
            RIPRENDI GIOCO
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestartSession();
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm cursor-pointer whitespace-nowrap"
          >
            AZZERA PUNTEGGI E RICOMINCIA
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm cursor-pointer whitespace-nowrap"
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
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  rounds,
  onPlayAgain,
  onReturnTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#0F172A] border border-slate-700 p-6 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <AppLogo size="md" />
          </div>
          <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#10B981]">
            RIEPILOGO SESSIONE · {summary.rankTitle}
          </p>
          <h2 id="gameover-modal-title" className="mt-1 font-display text-2xl md:text-3xl font-extrabold text-white">
            Verdetto del Cronometro
          </h2>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 text-center">
            <div className="text-[11px] font-mono-tabular uppercase text-slate-400">
              PUNTEGGIO
            </div>
            <div className="mt-1 font-mono-tabular text-xl md:text-2xl font-bold text-[#F59E0B]">
              {summary.totalPoints}
            </div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 text-center">
            <div className="text-[11px] font-mono-tabular uppercase text-slate-400">
              PRECISIONE
            </div>
            <div className="mt-1 font-mono-tabular text-xl md:text-2xl font-bold text-[#10B981]">
              {summary.avgAccuracyPercent.toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 text-center">
            <div className="text-[11px] font-mono-tabular uppercase text-slate-400">
              MIGLIOR SCARTO
            </div>
            <div className="mt-1 font-mono-tabular text-xl md:text-2xl font-bold text-[#38BDF8]">
              {summary.bestErrorMs !== null ? `${summary.bestErrorMs}ms` : '—'}
            </div>
          </div>
        </div>

        {/* Recent rounds list */}
        {rounds.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-[#0B0F17] border border-slate-800 divide-y divide-slate-800/80">
            {rounds.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3.5 py-2 text-xs font-mono-tabular"
              >
                <span className="text-slate-300">
                  #{r.roundNumber} · {r.mode.toUpperCase()}
                  {r.winnerName ? ` (${r.winnerName})` : ''}
                </span>
                <span className="text-slate-400">
                  Reale {formatSeconds(r.actualMs)} · Scarto {r.absErrorMs}ms
                </span>
                <span className="font-bold text-[#F59E0B]">+{r.points} pt</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlayAgain();
            }}
            className="flex-1 py-3 px-5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-display font-extrabold text-sm tracking-wider cursor-pointer whitespace-nowrap"
          >
            GIOCA ANCORA
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="py-3 px-4 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm cursor-pointer whitespace-nowrap"
          >
            MENU PRINCIPALE
          </button>
        </div>
      </div>
    </div>
  );
};
