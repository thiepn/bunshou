import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, Feather, Play, RotateCcw, Sparkles, Undo2, Volume2 } from 'lucide-react';
import { HankoSeal } from './JapaneseMotifs';
import { playJapaneseChime, speakJapaneseSentence } from '../utils/audio';

interface StrokePoint {
  x: number;
  y: number;
  width: number;
  velocity: number;
}

interface ShodoCanvasProps {
  character: string;
  reading?: string;
  meaning?: string;
  strokeCount?: number;
  audioSpeed?: number;
  preferredVoiceURI?: string;
  soundEffectsEnabled?: boolean;
  compact?: boolean;
}

/**
 * Interactive Japanese Shodō (書道) Sumi-Ink Brush Practice Canvas
 * Features velocity-responsive Fude (毛筆) brush physics, multi-bristle Kasure (かすれ)
 * dry-brush streaks, SVG fibrous paper displacement, and CSS keyframe dry-brush animations.
 */
export const ShodoCanvas: React.FC<ShodoCanvasProps> = ({
  character,
  reading,
  meaning,
  strokeCount,
  audioSpeed = 1.0,
  preferredVoiceURI = '',
  soundEffectsEnabled = true,
  compact = false,
}) => {
  const filterUid = useId().replace(/:/g, '');
  const kasureFilterId = `shodo-kasure-${filterUid}`;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<StrokePoint[][]>([]);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointTimeRef = useRef<number>(0);

  const [showGhostGuide, setShowGhostGuide] = useState<boolean>(true);
  const [kasureEnabled, setKasureEnabled] = useState<boolean>(true);
  const [isSettlingStroke, setIsSettlingStroke] = useState<boolean>(false);
  const [isPlayingBrushDemo, setIsPlayingBrushDemo] = useState<boolean>(false);
  const [stampedComplete, setStampedComplete] = useState<boolean>(false);

  const canvasSize = compact ? 220 : 260;

  // Reset strokes when target character changes
  useEffect(() => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setStampedComplete(false);
    setIsPlayingBrushDemo(false);
  }, [character]);

  const redrawCanvas = useCallback(
    (allStrokes: StrokePoint[][], activeStroke: StrokePoint[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      if (canvas.width !== canvasSize * dpr || canvas.height !== canvasSize * dpr) {
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
      const inkRgb = isDark ? '244, 239, 230' : '28, 25, 23';

      const drawSingleStroke = (points: StrokePoint[]) => {
        if (points.length === 0) return;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (points.length === 1) {
          ctx.fillStyle = `rgba(${inkRgb}, 0.95)`;
          ctx.beginPath();
          ctx.arc(points[0].x, points[0].y, points[0].width / 2, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        const total = points.length;
        for (let i = 1; i < total; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          const segWidth = (prev.width + curr.width) / 2;
          const progress = i / total;

          // Calculate Kasure (かすれ) dry-brush factor based on brush speed & stroke tail
          const isDryBrushZone =
            kasureEnabled && (curr.velocity > 0.72 || (progress > 0.65 && curr.velocity > 0.35));

          const p0x =
            i === 1 ? prev.x : (points[i - 2].x + prev.x) / 2;
          const p0y =
            i === 1 ? prev.y : (points[i - 2].y + prev.y) / 2;

          if (!isDryBrushZone) {
            ctx.strokeStyle = `rgba(${inkRgb}, 0.94)`;
            ctx.lineWidth = segWidth;
            ctx.beginPath();
            ctx.moveTo(p0x, p0y);
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            ctx.stroke();
          } else {
            // Simulate split Fude hair bristles (かすれ) leaving fine un-inked paper streaks
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const len = Math.max(0.001, Math.hypot(dx, dy));
            const nx = -dy / len;
            const ny = dx / len;

            const bristleOffsets = [-0.38, -0.15, 0.08, 0.34];
            const bristleWeights = [0.22, 0.28, 0.24, 0.18];

            for (let b = 0; b < bristleOffsets.length; b++) {
              // Deterministic dry-brush gap modulation along the stroke
              const gapWave = Math.sin(i * 1.7 + b * 2.3);
              if (gapWave < -0.55 && progress > 0.75) continue;

              const offset = bristleOffsets[b] * segWidth;
              const alpha = Math.max(
                0.28,
                Math.min(0.88, 0.85 - curr.velocity * 0.16 - progress * 0.18)
              );

              ctx.strokeStyle = `rgba(${inkRgb}, ${alpha.toFixed(2)})`;
              ctx.lineWidth = Math.max(1.1, segWidth * bristleWeights[b]);
              ctx.beginPath();
              ctx.moveTo(p0x + nx * offset, p0y + ny * offset);
              ctx.quadraticCurveTo(
                prev.x + nx * offset,
                prev.y + ny * offset,
                midX + nx * offset,
                midY + ny * offset
              );
              ctx.stroke();
            }
          }
        }
      };

      for (const s of allStrokes) {
        drawSingleStroke(s);
      }
      if (activeStroke.length > 0) {
        drawSingleStroke(activeStroke);
      }

      ctx.restore();
    },
    [canvasSize, kasureEnabled]
  );

  useEffect(() => {
    redrawCanvas(strokes, currentStrokeRef.current);
  }, [strokes, redrawCanvas]);

  // Re-render strokes if light/dark theme class changes on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      redrawCanvas(strokes, currentStrokeRef.current);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [strokes, redrawCanvas]);

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasSize,
      y: ((e.clientY - rect.top) / rect.height) * canvasSize,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer events without active pointerId
    }
    setIsPlayingBrushDemo(false);
    isDrawingRef.current = true;
    const { x, y } = getPointerCoords(e);
    lastPointTimeRef.current = performance.now();
    const initialPoint: StrokePoint = {
      x,
      y,
      width: compact ? 11.5 : 14,
      velocity: 0,
    };
    currentStrokeRef.current = [initialPoint];
    redrawCanvas(strokes, currentStrokeRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getPointerCoords(e);
    const active = currentStrokeRef.current;
    const last = active[active.length - 1];
    if (!last) return;

    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) return;

    const now = performance.now();
    const dt = Math.max(4, now - lastPointTimeRef.current);
    const velocity = dist / dt; // px per ms

    const maxW = compact ? 14 : 16.5;
    const minW = compact ? 4.2 : 5.0;
    const targetWidth = Math.max(minW, Math.min(maxW, maxW - velocity * 4.4));
    const smoothedWidth = last.width * 0.62 + targetWidth * 0.38;
    const smoothedVelocity = last.velocity * 0.5 + velocity * 0.5;

    lastPointTimeRef.current = now;
    currentStrokeRef.current.push({
      x,
      y,
      width: smoothedWidth,
      velocity: smoothedVelocity,
    });
    redrawCanvas(strokes, currentStrokeRef.current);
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      const completed = [...currentStrokeRef.current];
      currentStrokeRef.current = [];
      setStrokes((prev) => [...prev, completed]);
      setIsSettlingStroke(true);
      window.setTimeout(() => setIsSettlingStroke(false), 430);
    }
  };

  const handleUndoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
    setStampedComplete(false);
    playJapaneseChime('flip', soundEffectsEnabled);
  };

  const handleClearCanvas = () => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setStampedComplete(false);
    setIsPlayingBrushDemo(false);
    playJapaneseChime('flip', soundEffectsEnabled);
  };

  const handlePlayKasureDemo = () => {
    setIsPlayingBrushDemo(false);
    window.setTimeout(() => {
      setIsPlayingBrushDemo(true);
      playJapaneseChime('flip', soundEffectsEnabled);
    }, 20);
  };

  const handleStampSeal = () => {
    setStampedComplete(true);
    playJapaneseChime('good', soundEffectsEnabled);
  };

  const handleSpeakCharacter = () => {
    speakJapaneseSentence(
      character,
      audioSpeed,
      undefined,
      undefined,
      undefined,
      preferredVoiceURI
    );
  };

  return (
    <div
      data-testid="shodo-practice-canvas"
      className="rounded-2xl bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 p-4 sm:p-5"
    >
      {/* Hidden SVG Filter for Authentic Kasure (かすれ) Dry-Brush Texture */}
      <svg aria-hidden="true" className="w-0 h-0 absolute pointer-events-none">
        <defs>
          <filter id={kasureFilterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65 0.18"
              numOctaves="2"
              result="washiGrain"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="washiGrain"
              scale="2.2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6DEC8] dark:border-slate-800">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#C83E2B] dark:text-rose-400">
            書道練習 · Shodō Sumi-Ink & Kasure (かすれ) Studio
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-600 dark:text-slate-300">
            <span
              lang="ja"
              className="font-jp-serif font-bold text-sm text-stone-900 dark:text-white"
            >
              「{character}」
            </span>
            {reading && <span className="font-mono-tabular">[{reading}]</span>}
            {meaning && <span>· {meaning}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayKasureDemo}
            title="Preview animated Kasure dry-brush stroke effect"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F4EFE6] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>筆勢 Demo</span>
          </button>
          <button
            type="button"
            onClick={handleSpeakCharacter}
            aria-label={`Pronounce ${character}`}
            className="p-2 rounded-xl bg-[#F4EFE6] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Genkō Yōshi Squared Canvas */}
      <div className="mt-4 flex flex-col items-center">
        <div
          style={{ width: canvasSize, height: canvasSize }}
          className="relative rounded-2xl border-2 border-[#C83E2B]/55 dark:border-rose-500/45 bg-[#FAF6EE] dark:bg-[#0D1118] genko-cell shadow-inner overflow-hidden select-none touch-none"
        >
          {/* Diagonal subtle guide lines */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-20 text-[#C83E2B] dark:text-rose-400"
          >
            <line
              x1="0"
              y1="0"
              x2="100%"
              y2="100%"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="100%"
              y1="0"
              x2="0"
              y2="100%"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Ghost Watermark Character for Tracing */}
          {showGhostGuide && !isPlayingBrushDemo && (
            <div
              lang="ja"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-jp-serif font-bold text-stone-300/75 dark:text-slate-700/70 select-none"
              style={{ fontSize: Math.round(canvasSize * 0.72), lineHeight: 1 }}
            >
              {character}
            </div>
          )}

          {/* Animated CSS Keyframe Kasure Dry-Brush Demonstration Overlay */}
          {isPlayingBrushDemo && (
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${canvasSize} ${canvasSize}`}
              className="pointer-events-none absolute inset-0 w-full h-full z-20 shodo-kasure-surface"
              style={{ filter: `url(#${kasureFilterId})` }}
            >
              <text
                x="50%"
                y="54%"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-jp-serif font-extrabold fill-stone-900/90 dark:fill-stone-100/90 stroke-stone-900 dark:stroke-stone-100 animate-shodo-kasure-stroke"
                style={{
                  fontSize: Math.round(canvasSize * 0.72),
                  strokeWidth: 2.5,
                }}
              >
                {character}
              </text>
            </svg>
          )}

          {/* Interactive Brush Drawing Canvas with Kasure SVG Displacement & Settle Keyframes */}
          <canvas
            ref={canvasRef}
            style={{
              width: canvasSize,
              height: canvasSize,
              filter: kasureEnabled ? `url(#${kasureFilterId})` : undefined,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            onPointerLeave={finishStroke}
            className={`relative z-10 block cursor-crosshair touch-none ${
              kasureEnabled ? 'shodo-kasure-surface' : ''
            } ${kasureEnabled && isSettlingStroke ? 'animate-shodo-sumi-settle' : ''}`}
          />

          {/* Stroke Counter & Kasure Status Pill */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-md bg-[#FCFBF7]/90 dark:bg-slate-900/85 border border-stone-200/80 dark:border-slate-700 text-[10px] font-mono-tabular font-semibold text-stone-600 dark:text-slate-300">
            {strokes.length}
            {strokeCount ? ` / ${strokeCount}` : ''} 画{kasureEnabled ? ' · かすれ筆' : ''}
          </div>

          {/* Vermilion Hanko Stamp Overlay when approved */}
          {stampedComplete && (
            <div className="pointer-events-none absolute bottom-3 right-3 z-20">
              <HankoSeal text="書道" subText="済" size="md" variant="vermilion" animated />
            </div>
          )}
        </div>

        {/* Brush Controls Bar */}
        <div className="mt-3.5 w-full flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setKasureEnabled((prev) => !prev)}
              title="Toggle Kasure (かすれ) dry-brush bristle texture"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                kasureEnabled
                  ? 'border-[#C83E2B]/40 bg-rose-50/70 dark:bg-rose-950/40 text-[#C83E2B] dark:text-rose-300'
                  : 'border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>かすれ Dry-Brush</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGhostGuide((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showGhostGuide
                  ? 'border-[#C83E2B]/40 bg-rose-50/70 dark:bg-rose-950/40 text-[#C83E2B] dark:text-rose-300'
                  : 'border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300'
              }`}
            >
              {showGhostGuide ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>手本 Guide</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>手本 Off</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleUndoStroke}
              disabled={strokes.length === 0}
              aria-label="Undo last brush stroke"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleClearCanvas}
              disabled={strokes.length === 0 && !stampedComplete && !isPlayingBrushDemo}
              aria-label="Clear brush canvas"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleStampSeal}
            disabled={strokes.length === 0 && !isPlayingBrushDemo}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C83E2B] hover:bg-[#B03322] disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stamp 朱印</span>
          </button>
        </div>
      </div>
    </div>
  );
};
