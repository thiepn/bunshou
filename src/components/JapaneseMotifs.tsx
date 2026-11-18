import React, { useId } from 'react';

export type WagaraPatternKind = 'seigaiha' | 'asanoha' | 'shippou';

interface WagaraPatternProps {
  pattern?: WagaraPatternKind;
  opacity?: number;
  className?: string;
}

/**
 * Traditional Japanese Geometric SVG Patterns (和柄 Wagara):
 * - seigaiha (青海波): Blue ocean waves symbolizing peaceful continuity
 * - asanoha (麻の葉): Hemp leaf star lattice symbolizing vigorous growth
 * - shippou (七宝): Seven treasures interlocking circles symbolizing harmony
 */
export const WagaraPattern: React.FC<WagaraPatternProps> = ({
  pattern = 'seigaiha',
  opacity = 0.055,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const patternId = `wagara-${pattern}-${uid}`;

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full select-none ${className}`}
      style={{ opacity }}
    >
      <defs>
        {pattern === 'seigaiha' && (
          <pattern
            id={patternId}
            width="48"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <circle cx="24" cy="24" r="22" />
              <circle cx="24" cy="24" r="16" />
              <circle cx="24" cy="24" r="10" />
              <circle cx="24" cy="24" r="4" />
              <circle cx="0" cy="12" r="22" />
              <circle cx="0" cy="12" r="16" />
              <circle cx="0" cy="12" r="10" />
              <circle cx="0" cy="12" r="4" />
              <circle cx="48" cy="12" r="22" />
              <circle cx="48" cy="12" r="16" />
              <circle cx="48" cy="12" r="10" />
              <circle cx="48" cy="12" r="4" />
            </g>
          </pattern>
        )}

        {pattern === 'asanoha' && (
          <pattern
            id={patternId}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M0 0 L40 40 M40 0 L0 40 M20 0 L20 40 M0 20 L40 20" />
              <polygon points="20,0 40,20 20,40 0,20" />
            </g>
          </pattern>
        )}

        {pattern === 'shippou' && (
          <pattern
            id={patternId}
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <circle cx="18" cy="18" r="18" />
              <circle cx="0" cy="0" r="18" />
              <circle cx="36" cy="0" r="18" />
              <circle cx="0" cy="36" r="18" />
              <circle cx="36" cy="36" r="18" />
            </g>
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

interface HankoSealProps {
  text: string;
  subText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle' | 'oval';
  variant?: 'vermilion' | 'indigo' | 'emerald' | 'gold' | 'muted';
  animated?: boolean;
  className?: string;
}

/**
 * Carved Traditional Japanese Hanko / Inkan Seal (判子・印鑑)
 */
export const HankoSeal: React.FC<HankoSealProps> = ({
  text,
  subText,
  size = 'md',
  shape = 'square',
  variant = 'vermilion',
  animated = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  }[size];

  const shapeClasses = {
    square: 'rounded-md',
    circle: 'rounded-full',
    oval: 'rounded-full px-2',
  }[shape];

  const variantClasses = {
    vermilion:
      'border-[#C83E2B] text-[#C83E2B] dark:border-rose-400 dark:text-rose-400 bg-[#FFF8F6]/90 dark:bg-rose-950/40 shadow-[inset_0_0_0_1px_rgba(200,62,43,0.28)]',
    indigo:
      'border-sky-800 text-sky-800 dark:border-sky-400 dark:text-sky-300 bg-sky-50/80 dark:bg-sky-950/40 shadow-[inset_0_0_0_1px_rgba(30,58,138,0.25)]',
    emerald:
      'border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.25)]',
    gold:
      'border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 shadow-[inset_0_0_0_1px_rgba(180,131,39,0.25)]',
    muted:
      'border-stone-300 text-stone-400 dark:border-slate-700 dark:text-slate-600 bg-stone-50/60 dark:bg-slate-900/50',
  }[variant];

  return (
    <div
      lang="ja"
      aria-hidden="true"
      className={`inline-flex flex-col items-center justify-center border-2 font-jp-serif font-extrabold leading-none select-none shrink-0 ${sizeClasses} ${shapeClasses} ${variantClasses} ${
        animated ? 'animate-hanko' : ''
      } ${className}`}
    >
      <span className="tracking-tighter">{text}</span>
      {subText && <span className="text-[8px] font-bold mt-0.5">{subText}</span>}
    </div>
  );
};

/**
 * Architectural Shōji & Kumiko Corner Joinery Brackets (角金具)
 */
export const ShojiCornerFrames: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-2.5 ${className}`}>
      <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#C83E2B]/45 dark:border-rose-400/40 rounded-tl-xs" />
      <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#C83E2B]/45 dark:border-rose-400/40 rounded-tr-xs" />
      <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#C83E2B]/45 dark:border-rose-400/40 rounded-bl-xs" />
      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#C83E2B]/45 dark:border-rose-400/40 rounded-br-xs" />
    </div>
  );
};

/**
 * Vertical Japanese Tategaki Pillar Kicker (縦書き柱)
 */
export const TategakiRail: React.FC<{
  text: string;
  seal?: string;
  className?: string;
}> = ({ text, seal = '文', className = '' }) => {
  return (
    <div
      lang="ja"
      aria-hidden="true"
      className={`hidden xl:flex flex-col items-center gap-2 select-none shrink-0 py-2 px-1.5 rounded-lg border border-stone-200/80 dark:border-slate-800 bg-[#FAF6EE]/90 dark:bg-slate-900/70 ${className}`}
    >
      <span className="w-5 h-5 rounded-xs border border-[#C83E2B] text-[#C83E2B] dark:border-rose-400 dark:text-rose-400 flex items-center justify-center font-jp-serif text-[10px] font-bold">
        {seal}
      </span>
      <span className="tategaki font-jp-serif text-[11px] font-semibold text-stone-600 dark:text-slate-400">
        {text}
      </span>
    </div>
  );
};

export const SEASONAL_THEMES = [
  {
    id: 'classic',
    kanji: '古典',
    label: 'Kyoto Washi',
    subLabel: 'Vermilion & Kōzo Paper',
    badgeClass: 'bg-[#C83E2B] text-white border-[#C83E2B]',
  },
  {
    id: 'sakura',
    kanji: '春桜',
    label: 'Sakura Spring',
    subLabel: 'Cherry Blossom Mist',
    badgeClass: 'bg-pink-700 text-white border-pink-700',
  },
  {
    id: 'momiji',
    kanji: '秋楓',
    label: 'Momiji Autumn',
    subLabel: 'Kyoto Maple & Amber',
    badgeClass: 'bg-amber-800 text-white border-amber-800',
  },
  {
    id: 'yuki',
    kanji: '冬雪',
    label: 'Yuki Winter',
    subLabel: 'Snow Washi & Indigo',
    badgeClass: 'bg-sky-800 text-white border-sky-800',
  },
] as const;

