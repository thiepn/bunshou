import React, { useEffect, useId, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import { ShojiCornerFrames } from './JapaneseMotifs';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

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

  const shortcuts = [
    { key: 'Space / Enter', action: 'Reveal English translation or grade Good' },
    { key: '1', action: 'Grade Again (Review again today)' },
    { key: '2', action: 'Grade Hard (Short review interval)' },
    { key: '3', action: 'Grade Good (Standard SM-2 interval)' },
    { key: '4', action: 'Grade Easy (Extended review interval)' },
    { key: 'G', action: 'Toggle Word Breakdown & Grammar Notes on revealed card' },
    { key: 'R', action: 'Replay Japanese sentence audio' },
    { key: 'F', action: 'Reveal or hide furigana (when in On-Demand mode)' },
    { key: 'B', action: 'Bookmark / favorite current sentence' },
    { key: 'Z', action: 'Undo last graded card in current session' },
    { key: '?', action: 'Open or close this keyboard shortcut guide' },
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleDialogClick}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="w-[calc(100%-2rem)] max-w-md p-0 bg-transparent border-0 rounded-2xl shadow-xl overflow-visible"
    >
      <div className="relative overflow-hidden bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 text-stone-900 dark:text-white">
        <ShojiCornerFrames />
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#E6DEC8] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#C83E2B] dark:text-rose-400" />
            <h2 id={titleId} className="font-display text-lg font-bold text-stone-900 dark:text-white">
              Keyboard & Touch Controls
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close shortcuts guide"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 mt-4 divide-y divide-[#E6DEC8]/70 dark:divide-slate-800/80">
          {shortcuts.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between gap-4 text-xs">
              <span className="text-stone-600 dark:text-slate-300">{s.action}</span>
              <kbd className="px-2 py-1 font-mono-tabular font-semibold bg-[#F4EFE6] dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-[#DFD6C7] dark:border-stone-700 rounded-md whitespace-nowrap shrink-0">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-4 pt-3 border-t border-[#E6DEC8] dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400">
          <span className="font-semibold text-stone-700 dark:text-slate-200">Mobile Touch Gestures: </span>
          <span>Swipe left on a revealed card to grade Again, or swipe right to grade Good.</span>
        </div>
      </div>
    </dialog>
  );
};
