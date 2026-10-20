import React, { useState } from 'react';

export const APP_LOGO_CANDIDATES = [
  './assets/aistudio/Gemini_Generated_Image_ws7f7ows7f7ows7f_3889bd19.jpg',
  './public/assets/aistudio/Gemini_Generated_Image_ws7f7ows7f7ows7f_3889bd19.jpg',
  '/assets/aistudio/Gemini_Generated_Image_ws7f7ows7f7ows7f_3889bd19.jpg',
];

export const APP_LOGO_URL = APP_LOGO_CANDIDATES[0];

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16 md:w-20 md:h-20',
    xl: 'w-24 h-24 md:w-28 md:h-28',
  }[size];

  if (loadFailed) {
    return (
      <div
        className={`${containerSizes} ${className} rounded-full bg-gradient-to-br from-amber-600 via-rose-950 to-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-lg text-amber-300 shrink-0`}
        role="img"
        aria-label="CronoSfida Logo"
      >
        <span className="font-display font-black text-xs md:text-sm">?</span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden p-0 border-2 border-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,0.35)] shrink-0 bg-[#7B1324] ${containerSizes} ${className}`}
    >
      <img
        src={APP_LOGO_CANDIDATES[candidateIndex]}
        alt="Logo CronoSfida — Il Gioco del Tempo"
        referrerPolicy="no-referrer"
        onError={() => {
          if (candidateIndex + 1 < APP_LOGO_CANDIDATES.length) {
            setCandidateIndex((prev) => prev + 1);
          } else {
            setLoadFailed(true);
          }
        }}
        className="w-full h-full object-cover scale-[1.82] object-center block select-none pointer-events-none transform-gpu"
      />
    </div>
  );
};

