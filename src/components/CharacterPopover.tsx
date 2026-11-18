import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Brush, Volume2, X } from 'lucide-react';
import { speakJapaneseSentence } from '../utils/audio';
import { CharacterInspectorResult } from '../utils/linguistics';
import { FuriganaText } from './FuriganaText';
import { ShodoCanvas } from './ShodoCanvas';

interface CharacterPopoverProps {
  data: CharacterInspectorResult | null;
  onClose: () => void;
  audioSpeed: number;
  preferredVoiceURI?: string;
}

export const CharacterPopover: React.FC<CharacterPopoverProps> = ({
  data,
  onClose,
  audioSpeed,
  preferredVoiceURI,
}) => {
  const [showBrushStudio, setShowBrushStudio] = useState<boolean>(false);
  const [selectedBrushChar, setSelectedBrushChar] = useState<string>('');
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setSelectedBrushChar('');
  }, [data?.query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (data && !dialog.open) {
      dialog.showModal();
    } else if (!data && dialog.open) {
      dialog.close();
    }
  }, [data]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  if (!data) return null;

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!isDialogContent) {
      dialog.close();
    }
  };

  const activePracticeChar =
    selectedBrushChar ||
    (data.kanjiDetails.length > 0 ? data.kanjiDetails[0].kanji : Array.from(data.query)[0] || data.query);

  const activeKanjiDetail = data.kanjiDetails.find((k) => k.kanji === activePracticeChar);

  const handlePlayWord = (text: string) => {
    speakJapaneseSentence(text, audioSpeed, undefined, undefined, undefined, preferredVoiceURI);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleDialogClick}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="w-[calc(100%-2rem)] max-w-lg max-h-[85vh] p-0 bg-transparent border-0 rounded-2xl shadow-xl"
    >
      <div className="w-full bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 text-stone-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E6DEC8] dark:border-slate-800">
          <div>
            <div className="text-xs text-stone-500 dark:text-slate-400">
              <span>原稿用紙・文字解剖 · Kanji, Kana & Corpus Inspector</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-3">
              <h2
                id={titleId}
                lang="ja"
                className="font-jp-serif text-3xl font-bold text-stone-900 dark:text-white"
              >
                {data.query}
              </h2>
              {data.reading && (
                <span
                  lang="ja"
                  className="font-jp text-base font-medium text-[#C83E2B] dark:text-rose-400"
                >
                  {data.reading}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBrushStudio((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                showBrushStudio
                  ? 'bg-[#C83E2B] text-white'
                  : 'bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100'
              }`}
            >
              <Brush className="w-3.5 h-3.5" />
              <span>書道 Brush</span>
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => handlePlayWord(data.query)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Pronounce</span>
            </button>
            <button
              type="button"
              aria-label="Close inspector"
              onClick={() => dialogRef.current?.close()}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Shodō Brush Practice Drawer */}
        {showBrushStudio && (
          <div className="mt-4">
            {data.kanjiDetails.length > 1 && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-stone-500">
                <span>Select character to trace:</span>
                {data.kanjiDetails.map((k) => (
                  <button
                    key={k.kanji}
                    type="button"
                    onClick={() => setSelectedBrushChar(k.kanji)}
                    className={`px-2.5 py-1 rounded-md font-jp-serif font-bold cursor-pointer ${
                      activePracticeChar === k.kanji
                        ? 'bg-[#C83E2B] text-white'
                        : 'bg-stone-200/70 dark:bg-slate-800 text-stone-800 dark:text-slate-200'
                    }`}
                  >
                    {k.kanji}
                  </button>
                ))}
              </div>
            )}
            <ShodoCanvas
              character={activePracticeChar}
              reading={activeKanjiDetail ? `${activeKanjiDetail.onyomi} / ${activeKanjiDetail.kunyomi}` : data.reading}
              meaning={activeKanjiDetail?.coreMeaning}
              strokeCount={activeKanjiDetail?.strokes}
              audioSpeed={audioSpeed}
              preferredVoiceURI={preferredVoiceURI}
              compact
            />
          </div>
        )}

        {/* Particle Note if applicable */}
        {data.particleInfo && (
          <div className="mt-4 p-3.5 bg-[#F6F1E6] dark:bg-slate-900 border border-[#E2D9C5] dark:border-slate-800 rounded-xl">
            <div className="text-xs font-bold text-[#C83E2B] dark:text-rose-400">
              Particle Role: {data.particleInfo.roleTitle}
            </div>
            <p className="mt-1 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              {data.particleInfo.explanation}
            </p>
          </div>
        )}

        {/* Kanji Breakdown Cards */}
        {data.kanjiDetails.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-stone-600 dark:text-slate-400 mb-2">
              Kanji Character Reference (原稿用紙バランス)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.kanjiDetails.map((k) => (
                <div
                  key={k.kanji}
                  className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 border border-[#E2D9C5] dark:border-slate-800 rounded-xl flex items-start gap-3"
                >
                  <button
                    type="button"
                    title="Click to practice brush calligraphy"
                    onClick={() => {
                      setSelectedBrushChar(k.kanji);
                      setShowBrushStudio(true);
                    }}
                    lang="ja"
                    className="genko-cell w-12 h-12 rounded-lg bg-[#FCFBF7] dark:bg-[#141923] border border-[#C83E2B]/40 dark:border-rose-500/40 flex items-center justify-center font-jp-serif text-2xl font-bold text-stone-900 dark:text-white shrink-0 hover:border-[#C83E2B] cursor-pointer"
                  >
                    {k.kanji}
                  </button>
                  <div className="text-xs space-y-0.5 min-w-0">
                    <div className="font-semibold text-stone-900 dark:text-white truncate">
                      {k.coreMeaning}
                    </div>
                    <div className="text-stone-500 dark:text-slate-400 font-mono-tabular">
                      Strokes: {k.strokes}画
                    </div>
                    <div className="text-stone-500 dark:text-slate-400 truncate">
                      On: {k.onyomi} · Kun: {k.kunyomi}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corpus Concordance Examples */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-slate-400 mb-2.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Related Sentences in Corpus ({data.matchingSentences.length})</span>
          </div>

          {data.matchingSentences.length === 0 ? (
            <div className="text-xs text-stone-400 dark:text-slate-500 py-3">
              No additional matching sentences found in the corpus.
            </div>
          ) : (
            <div className="space-y-2">
              {data.matchingSentences.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-[#F6F1E6] dark:bg-slate-900 border border-[#E2D9C5] dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div lang="ja" className="text-sm font-semibold text-stone-900 dark:text-white">
                      <FuriganaText segments={s.segments} showFurigana={true} />
                    </div>
                    <div className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                      {s.english}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlayWord(s.japanese)}
                    aria-label={`Play audio for ${s.japanese}`}
                    className="p-2 rounded-lg bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
