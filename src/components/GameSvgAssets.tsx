import React from 'react';
import { GameMode } from '../game/rules';

export const TitleEmblemSvg: React.FC = () => (
  <svg
    viewBox="0 0 540 130"
    className="w-full max-w-[440px] h-auto select-none"
    role="img"
    aria-label="CronoSfida — L'Occhio del Tempo"
  >
    {/* Outer horological crest frame */}
    <path
      d="M28 24 L512 24 L526 38 L526 92 L512 106 L28 106 L14 92 L14 38 Z"
      fill="#0D131F"
      stroke="#334155"
      strokeWidth="2"
    />
    <path
      d="M34 30 L506 30 L518 42 L518 88 L506 100 L34 100 L22 88 L22 42 Z"
      fill="none"
      stroke="#F59E0B"
      strokeWidth="1"
      strokeOpacity="0.45"
    />

    {/* Left & right mechanical escapement jewels */}
    <circle cx="46" cy="65" r="10" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
    <circle cx="46" cy="65" r="3.5" fill="#F59E0B" />
    <line x1="62" y1="65" x2="86" y2="65" stroke="#475569" strokeWidth="1.5" />

    <circle cx="494" cy="65" r="10" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
    <circle cx="494" cy="65" r="3.5" fill="#38BDF8" />
    <line x1="454" y1="65" x2="478" y2="65" stroke="#475569" strokeWidth="1.5" />

    {/* Top crown pusher silhouette */}
    <rect x="252" y="10" width="36" height="9" rx="2" fill="#F59E0B" />
    <rect x="262" y="19" width="16" height="5" fill="#94A3B8" />

    {/* Main title lettering */}
    <text
      x="270"
      y="68"
      textAnchor="middle"
      fill="#F8FAFC"
      fontFamily="Outfit, sans-serif"
      fontWeight="800"
      fontSize="42"
      letterSpacing="5"
    >
      CRONOSFIDA
    </text>

    {/* Subtitle engraving */}
    <text
      x="270"
      y="91"
      textAnchor="middle"
      fill="#94A3B8"
      fontFamily="JetBrains Mono, monospace"
      fontWeight="600"
      fontSize="11"
      letterSpacing="3.5"
    >
      CLASSICA · SFIDA AL BERSAGLIO · AL BUIO
    </text>
  </svg>
);

export const ModeIconSvg: React.FC<{ mode: GameMode; active?: boolean }> = ({ mode, active }) => {
  const strokeColor = active ? '#0B0F17' : '#E2E8F0';
  const accentFill =
    mode === 'classica'
      ? '#F59E0B'
      : mode === 'sfida'
      ? '#10B981'
      : mode === 'giornaliera'
      ? '#A855F7'
      : '#38BDF8';

  if (mode === 'classica') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="13" r="8" fill="#0F172A" stroke={strokeColor} strokeWidth="2" />
        <rect x="9" y="2" width="6" height="2.5" rx="1" fill={accentFill} />
        <path d="M12 13 L12 8 M12 13 L15.5 15" stroke={accentFill} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (mode === 'sfida') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#0F172A" stroke={strokeColor} strokeWidth="2" />
        <circle cx="12" cy="12" r="5" fill="none" stroke={accentFill} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2" fill={accentFill} />
      </svg>
    );
  }

  if (mode === 'giornaliera') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2.5" fill="#0F172A" stroke={strokeColor} strokeWidth="2" />
        <line x1="8" y1="3" x2="8" y2="7" stroke={accentFill} strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="3" x2="16" y2="7" stroke={accentFill} strokeWidth="2" strokeLinecap="round" />
        <path
          d="M12 10 L13.2 12.6 L16 13 L14 14.9 L14.5 17.6 L12 16.3 L9.5 17.6 L10 14.9 L8 13 L10.8 12.6 Z"
          fill={accentFill}
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path
        d="M2 12 C5 6.5 19 6.5 22 12 C19 17.5 5 17.5 2 12 Z"
        fill="#0F172A"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <line x1="4" y1="4" x2="20" y2="20" stroke={accentFill} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const SoundIconSvg: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path
      d="M4 9 H8 L13 5 V19 L8 15 H4 Z"
      fill="#0F172A"
      stroke="#F8FAFC"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {muted ? (
      <path
        d="M16 9 L21 15 M21 9 L16 15"
        stroke="#F43F5E"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ) : (
      <path
        d="M16 8.5 C17.8 10.2 17.8 13.8 16 15.5 M18.8 6 C21.8 9.2 21.8 14.8 18.8 18"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const PauseIconSvg: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" fill="#F8FAFC" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="#F8FAFC" />
  </svg>
);

export const ResetIconSvg: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path
      d="M4 12 A8 8 0 1 1 6.3 17.6"
      fill="none"
      stroke="#F8FAFC"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M4 7 V12 H9" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
