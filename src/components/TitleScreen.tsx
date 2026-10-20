import React from 'react';
import { GameMode, MODE_INFO } from '../game/rules';
import { ModeIconSvg, TitleEmblemSvg } from './GameSvgAssets';
import { AppLogo } from './AppLogo';

interface TitleScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartGame: (mode?: GameMode) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedMode,
  onSelectMode,
  onStartGame,
}) => {
  const modes: GameMode[] = ['classica', 'sfida', 'buio', 'giornaliera'];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between px-4 py-3 sm:py-6 md:px-8 pointer-events-none overflow-y-auto">
      {/* Top region: App Logo with gold medallion filling the frame + Clean Title */}
      <div className="flex flex-col items-center text-center pointer-events-auto pt-1 sm:pt-2">
        <AppLogo
          size="lg"
          className="mb-2 sm:mb-3 shadow-2xl hover:scale-105 transition-transform duration-200 cursor-pointer"
        />
        <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl tracking-wider text-white">
          CRONOSFIDA
        </h1>
        <p className="mt-0.5 text-[10px] sm:text-xs font-mono-tabular tracking-widest text-[#F59E0B] uppercase font-bold">
          Il Gioco del Tempo
        </p>
        <p className="mt-1 text-xs text-slate-300 max-w-xs sm:max-w-sm font-normal">
          Sfide party e Sfida Giornaliera Cieca (5 round · 1–5000 PT).
        </p>
      </div>

      {/* Central space keeps the 60fps Chronometer dial visible in background */}
      <div className="my-auto min-h-4 sm:min-h-8" aria-hidden="true" />

      {/* Bottom region: Clean Mode selector + Primary Start CTA */}
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto gap-2.5 sm:gap-3 pointer-events-auto pb-2 sm:pb-4">
        {/* 4 Game Modes selector cards (2x2 on mobile, 4 cols on desktop) */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full"
          role="radiogroup"
          aria-label="Seleziona modalità di gioco"
        >
          {modes.map((m) => {
            const info = MODE_INFO[m];
            const isSelected = selectedMode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectMode(m);
                }}
                className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer active:scale-99 ${
                  isSelected
                    ? 'bg-[#162032] border-[#F59E0B] text-white shadow-lg ring-1 ring-[#F59E0B]/50'
                    : 'bg-[#0D131F]/90 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                    {info.shortTitle}
                  </span>
                  <ModeIconSvg mode={m} active={isSelected} />
                </div>
                <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight line-clamp-2">
                  {info.kicker}
                </p>
              </button>
            );
          })}
        </div>

        {/* Primary Start CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStartGame(selectedMode);
          }}
          className="w-full py-3.5 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-[#0B0F17] font-display font-black text-base tracking-wider shadow-lg shadow-amber-500/20 transition-all duration-150 cursor-pointer whitespace-nowrap text-center"
        >
          INIZIA A GIOCARE
        </button>

        {/* Desktop keyboard hint vs Mobile hint */}
        <p className="hidden sm:block text-[11px] text-slate-400 font-mono-tabular tracking-wide text-center">
          Spazio Avvia / Stop · 1/2/3/4 Modalità · P Pausa · M Audio
        </p>
        <p className="sm:hidden text-[10px] text-slate-400 font-mono-tabular tracking-wide text-center">
          Tocca una modalità e premi Inizia
        </p>
      </div>
    </div>
  );
};
