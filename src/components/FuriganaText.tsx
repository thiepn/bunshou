import React from 'react';
import { RubySegment } from '../types/curriculum';

const PARTICLE_SET = new Set(['は', 'が', 'を', 'に', 'で', 'も', 'の', 'と', 'か', 'から', 'へ']);

/**
 * Matches non-particle kana words/copulas first so their internal characters
 * (like で in です or は in おはよう) are never mistaken for standalone particles,
 * while capturing true grammatical particles in Group 1.
 */
const JAPANESE_TOKEN_REGEX =
  /(ではありません|じゃありません|ませんでした|おはようございます|ありがとうございます|よろしくお願いします|こんにちは|こんばんは|すみません|ありがとう|おはよう|ください|ましょう|でした|ます|ました|ません|です|とても|いつも|それから|これから|だから|けれど|けれども|くらい|ぐらい|どこ|ここ|そこ|あそこ|これ|それ|あれ|この|その|あの|どの|だれ|なに|なん|いつ|どう|なぜ|いくら|いくつ|おいしい|たのしい|うれしい|やさしい|むずかしい|おもしろい|いそがしい|あたらしい|あたたかい|すずしい|つめたい|かわいい|きれい|しずか|げんき|べんり|ゆうめい|たいへん|すき|きらい|じょうず|へた|たくさん|いっしょ|ゆっくり|ちょっと|ほんとう|ぜんぜん|あまり|よく|まだ|もう|また|すぐ|ぜひ|たぶん|きっと)|(から|[はがをにでものとかへ])/g;

function renderKanaWithParticleHighlights(text: string, keyPrefix: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  JAPANESE_TOKEN_REGEX.lastIndex = 0;
  while ((match = JAPANESE_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-pre-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const fullMatch = match[0];
    const capturedParticle = match[2];

    if (capturedParticle && PARTICLE_SET.has(capturedParticle)) {
      nodes.push(
        <span
          key={`${keyPrefix}-p-${match.index}`}
          className="inline-block px-1 py-0.2 mx-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70 font-semibold"
        >
          {capturedParticle}
        </span>
      );
    } else {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-w-${match.index}`}>{fullMatch}</React.Fragment>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-tail-${lastIndex}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return nodes;
}

interface FuriganaTextProps {
  segments: RubySegment[];
  showFurigana: boolean;
  className?: string;
  highlightParticles?: boolean;
  onSelectSegment?: (segment: RubySegment) => void;
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({
  segments,
  showFurigana,
  className = '',
  highlightParticles = false,
  onSelectSegment,
}) => {
  return (
    <span className={`font-jp leading-[2.15] tracking-normal ${className}`}>
      {segments.map((seg, idx) => {
        const interactiveClass = onSelectSegment
          ? 'hover:text-rose-600 dark:hover:text-rose-400 hover:underline decoration-rose-500/50 underline-offset-4 cursor-pointer rounded px-0.5 transition-colors'
          : '';

        if (seg.reading && showFurigana) {
          return (
            <ruby
              key={idx}
              className={`jp-ruby ${interactiveClass}`}
              onClick={
                onSelectSegment
                  ? (e) => {
                      e.stopPropagation();
                      onSelectSegment(seg);
                    }
                  : undefined
              }
            >
              {seg.text}
              <rt>{seg.reading}</rt>
            </ruby>
          );
        }

        if (onSelectSegment && seg.text.trim()) {
          return (
            <span
              key={idx}
              className={interactiveClass}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSegment(seg);
              }}
            >
              {highlightParticles && !seg.reading
                ? renderKanaWithParticleHighlights(seg.text, `seg-${idx}`)
                : seg.text}
            </span>
          );
        }

        if (highlightParticles && !seg.reading) {
          return (
            <React.Fragment key={idx}>
              {renderKanaWithParticleHighlights(seg.text, `seg-${idx}`)}
            </React.Fragment>
          );
        }

        return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
      })}
    </span>
  );
};

interface HighlightedJapaneseTextProps {
  text: string;
  className?: string;
}

/**
 * Highlights Japanese grammatical particles (は, が, を, に, で, も, の, と, か, から, へ)
 * in example sentences and grammar formulas so sentence structure is immediately legible.
 */
export const HighlightedJapaneseText: React.FC<HighlightedJapaneseTextProps> = ({
  text,
  className = '',
}) => {
  return (
    <span lang="ja" className={`font-jp ${className}`}>
      {renderKanaWithParticleHighlights(text, 'hl')}
    </span>
  );
};
