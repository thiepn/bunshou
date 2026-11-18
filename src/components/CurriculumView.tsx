import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Grid,
  Layers,
  MessageSquare,
  Play,
  Search,
  Volume2,
} from 'lucide-react';
import { UNIT_DIALOGUES } from '../data/dialogues';
import { UNIT_GOSHUIN_STAMPS } from '../data/japaneseCulture';
import {
  GRAMMAR_COMPARISONS,
  GRAMMAR_HANDBOOK,
  HIRAGANA_GOJUON,
  KATAKANA_GOJUON,
  KanaCell,
} from '../data/referenceData';
import { ALL_SENTENCES, SENTENCES_BY_UNIT } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import { CurriculumSubTab, LevelId, PersistedAppState } from '../types/curriculum';
import { speakJapaneseSentence } from '../utils/audio';
import {
  A1_KANJI_DICTIONARY,
  CharacterInspectorResult,
  inspectTokenOrCharacter,
} from '../utils/linguistics';
import { classifyCardState, getLocalDateString, isSentenceDue } from '../utils/srs';
import { CharacterPopover } from './CharacterPopover';
import { FuriganaText } from './FuriganaText';
import { ShodoCanvas } from './ShodoCanvas';
import { StudyLaunchConfig } from './StudyView';

interface CurriculumViewProps {
  appState: PersistedAppState;
  initialSubTab?: CurriculumSubTab;
  initialDialogueUnitId?: string;
  onStartStudy: (config: StudyLaunchConfig) => void;
  onInspectUnitInLibrary: (unitId: string, level: LevelId) => void;
  onCompleteDialogue: (unitId: string) => void;
  onOpenUnitGrammar?: (unitId: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  appState,
  initialSubTab = 'units',
  initialDialogueUnitId,
  onStartStudy,
  onInspectUnitInLibrary,
  onCompleteDialogue,
  onOpenUnitGrammar,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CurriculumSubTab>(initialSubTab);
  const [activeLevelFilter, setActiveLevelFilter] = useState<'ALL' | LevelId>('ALL');

  // Mini-Dialogue state
  const [selectedDialogueUnitId, setSelectedDialogueUnitId] = useState<string>(
    initialDialogueUnitId || UNIT_DIALOGUES[0].unitId
  );
  const [showDialogueEnglish, setShowDialogueEnglish] = useState<boolean>(false);
  const [playingLineIndex, setPlayingLineIndex] = useState<number | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);

  // Grammar Handbook state
  const [grammarSearchQuery, setGrammarSearchQuery] = useState<string>('');
  const [grammarLevelFilter, setGrammarLevelFilter] = useState<'ALL' | LevelId>('ALL');

  // Kana & Kanji Grid state
  const [scriptTab, setScriptTab] = useState<'kanji' | 'hiragana' | 'katakana'>('kanji');
  const [selectedKanaCell, setSelectedKanaCell] = useState<KanaCell | null>(HIRAGANA_GOJUON[0]);
  const [selectedShodoKanji, setSelectedShodoKanji] = useState<string>('日');
  const [inspectorData, setInspectorData] = useState<CharacterInspectorResult | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialDialogueUnitId) {
      setSelectedDialogueUnitId(initialDialogueUnitId);
      setSelectedQuizOption(null);
    }
  }, [initialDialogueUnitId]);

  const todayStr = getLocalDateString();

  const a11Total = ALL_SENTENCES.filter((s) => s.level === 'A1.1').length;
  const a11Studied = ALL_SENTENCES.filter(
    (s) => s.level === 'A1.1' && Boolean(appState.records[s.id])
  ).length;

  const a12Total = ALL_SENTENCES.filter((s) => s.level === 'A1.2').length;
  const a12Studied = ALL_SENTENCES.filter(
    (s) => s.level === 'A1.2' && Boolean(appState.records[s.id])
  ).length;

  const visibleUnits = CURRICULUM_UNITS.filter(
    (u) => activeLevelFilter === 'ALL' || u.level === activeLevelFilter
  );

  const completedDialogues = appState.completedDialogues || [];

  const activeDialogue = useMemo(
    () =>
      UNIT_DIALOGUES.find((d) => d.unitId === selectedDialogueUnitId) || UNIT_DIALOGUES[0],
    [selectedDialogueUnitId]
  );

  const handleOpenDialogueForUnit = (unitId: string) => {
    setSelectedDialogueUnitId(unitId);
    setSelectedQuizOption(null);
    setActiveSubTab('dialogues');
  };

  const handleSpeakText = (text: string, lineIdx?: number) => {
    if (typeof lineIdx === 'number') {
      setPlayingLineIndex(lineIdx);
    }
    speakJapaneseSentence(
      text,
      appState.settings.audioSpeed,
      undefined,
      () => {
        if (typeof lineIdx === 'number') {
          setPlayingLineIndex(null);
        }
      },
      () => {
        if (typeof lineIdx === 'number') {
          setPlayingLineIndex(null);
        }
      },
      appState.settings.preferredVoiceURI
    );
  };

  const handlePlayFullDialogue = () => {
    const combinedText = activeDialogue.lines.map((l) => l.japanese).join(' ');
    setPlayingLineIndex(-1);
    speakJapaneseSentence(
      combinedText,
      appState.settings.audioSpeed,
      undefined,
      () => setPlayingLineIndex(null),
      () => setPlayingLineIndex(null),
      appState.settings.preferredVoiceURI
    );
  };

  const handleAnswerDialogueQuiz = (optIndex: number) => {
    setSelectedQuizOption(optIndex);
    if (optIndex === activeDialogue.comprehensionQuestion.correctIndex) {
      onCompleteDialogue(activeDialogue.unitId);
    }
  };

  // Filtered Grammar Handbook entries
  const filteredGrammarLessons = useMemo(() => {
    const q = grammarSearchQuery.trim().toLowerCase();
    return GRAMMAR_HANDBOOK.filter((entry) => {
      if (grammarLevelFilter !== 'ALL' && entry.level !== grammarLevelFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.patternFormula.toLowerCase().includes(q) ||
        entry.coreExplanation.toLowerCase().includes(q) ||
        entry.keyTip.toLowerCase().includes(q) ||
        entry.examples.some(
          (ex) =>
            ex.japanese.toLowerCase().includes(q) ||
            ex.reading.toLowerCase().includes(q) ||
            ex.english.toLowerCase().includes(q)
        )
      );
    });
  }, [grammarSearchQuery, grammarLevelFilter]);

  const filteredComparisons = useMemo(() => {
    const q = grammarSearchQuery.trim().toLowerCase();
    if (!q) return GRAMMAR_COMPARISONS;
    return GRAMMAR_COMPARISONS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.leftPattern.toLowerCase().includes(q) ||
        c.rightPattern.toLowerCase().includes(q)
    );
  }, [grammarSearchQuery]);

  // Precompute Kanji Mastery Grid stats across ALL_SENTENCES
  const kanjiGridItems = useMemo(() => {
    const entries = Object.values(A1_KANJI_DICTIONARY);
    return entries.map((kInfo) => {
      let totalSentences = 0;
      let studiedSentences = 0;
      let masteredSentences = 0;

      for (const s of ALL_SENTENCES) {
        if (s.japanese.includes(kInfo.kanji)) {
          totalSentences++;
          const rec = appState.records[s.id];
          if (rec) {
            studiedSentences++;
            if (classifyCardState(rec, todayStr) === 'mastered') {
              masteredSentences++;
            }
          }
        }
      }

      const status: 'mastered' | 'studying' | 'unseen' =
        masteredSentences > 0
          ? 'mastered'
          : studiedSentences > 0
          ? 'studying'
          : 'unseen';

      return {
        ...kInfo,
        totalSentences,
        studiedSentences,
        masteredSentences,
        status,
      };
    });
  }, [appState.records, todayStr]);

  const kanjiStatsSummary = useMemo(() => {
    const total = kanjiGridItems.length;
    const encountered = kanjiGridItems.filter((k) => k.studiedSentences > 0).length;
    const mastered = kanjiGridItems.filter((k) => k.masteredSentences > 0).length;
    return { total, encountered, mastered };
  }, [kanjiGridItems]);

  const showFuriganaInDialogues = appState.settings.furiganaMode !== 'always_off';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-24 md:pb-16">
      {/* Page Header & 4-Tab Curriculum Hub Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[#DFD6C7] dark:border-slate-800">
        <div>
          <div className="text-xs text-stone-500 dark:text-slate-400">
            <span>課程単元・対話物語 · Structured Beginner Progression & Reference Hub</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>20 Units · 20 Stories · Grammar & Kanji</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-stone-900 dark:text-white">
            A1.1 & A1.2 Japanese Curriculum
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
            Step through 20 structured units, read situational mini-dialogues with native audio,
            compare core grammar patterns, and inspect every A1 kanji and kana character.
          </p>
        </div>

        {/* 4-Tab Sub-Navigation Switcher */}
        <div
          role="tablist"
          aria-label="Curriculum section tabs"
          className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start gap-1 max-w-full overflow-x-auto"
        >
          {(
            [
              {
                id: 'units',
                label: '20 Units',
                icon: Layers,
              },
              {
                id: 'dialogues',
                label: `Mini-Dialogues (${completedDialogues.length}/20)`,
                icon: MessageSquare,
              },
              {
                id: 'grammar',
                label: 'Grammar Handbook',
                icon: FileText,
              },
              {
                id: 'kana_kanji',
                label: 'Kana & Kanji Grid',
                icon: Grid,
              },
            ] as Array<{ id: CurriculumSubTab; label: string; icon: React.ComponentType<{ className?: string }> }>
          ).map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 20 CURRICULUM UNITS */}
      {activeSubTab === 'units' && (
        <div>
          {/* Level Filter Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-stone-500 dark:text-slate-400">
              Filter by CEFR subdivision or launch any unit’s sentences or dialogue story directly.
            </div>
            <div
              role="tablist"
              aria-label="Curriculum level filter"
              className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl"
            >
              {(
                [
                  { id: 'ALL', label: `All Units (20)` },
                  { id: 'A1.1', label: `A1.1 (${a11Studied}/${a11Total})` },
                  { id: 'A1.2', label: `A1.2 (${a12Studied}/${a12Total})` },
                ] as Array<{ id: 'ALL' | LevelId; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeLevelFilter === tab.id}
                  onClick={() => setActiveLevelFilter(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeLevelFilter === tab.id
                      ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Level Overview Banner Cards */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                  <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                    Level A1.1 · Recommended Starting Point
                  </span>
                  <span className="font-mono-tabular">
                    {a11Studied} / {a11Total} studied
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-stone-900 dark:text-white">
                  A1.1 — Absolute Beginner Foundation
                </h2>
                <p className="mt-1 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  Units 1–10: Greetings, です/ではありません, demonstratives, locations, numbers,
                  existence (あります/います), everyday polite verbs, and basic い/な adjectives.
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full h-1.5 bg-[#EFE9DC] dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C83E2B] transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${a11Total > 0 ? a11Studied / a11Total : 0})` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                  <span className="font-semibold text-stone-700 dark:text-slate-300">
                    Level A1.2 · Developing Beginner
                  </span>
                  <span className="font-mono-tabular">
                    {a12Studied} / {a12Total} studied
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-stone-900 dark:text-white">
                  A1.2 — Everyday Interactions & Connected Ideas
                </h2>
                <p className="mt-1 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  Units 11–20: Past tense verbs and adjectives, daily routines with て-form, polite
                  requests (〜てください), invitations (〜ませんか), shopping, 〜ています, wishes, and
                  reasons with から.
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full h-1.5 bg-[#EFE9DC] dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900 dark:bg-slate-200 transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${a12Total > 0 ? a12Studied / a12Total : 0})` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Units Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleUnits.map((unit) => {
              const sentences = SENTENCES_BY_UNIT[unit.id] || [];
              const total = sentences.length;
              let studied = 0;
              let due = 0;
              let mastered = 0;
              let progressing = 0;

              for (const s of sentences) {
                const rec = appState.records[s.id];
                if (rec) {
                  studied++;
                  if (isSentenceDue(rec, todayStr)) due++;
                  const st = classifyCardState(rec, todayStr);
                  if (st === 'mastered') mastered++;
                  else if (st === 'progressing') progressing++;
                }
              }

              const unseen = total - studied;
              const isDialogueDone = completedDialogues.includes(unit.id);
              const goshuin = UNIT_GOSHUIN_STAMPS[unit.id];

              return (
                <article
                  key={unit.id}
                  className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Clean Unboxed Metadata Header + Traditional Goshuinchō Ordinal & Calligraphy */}
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {goshuin && (
                          <span
                            lang="ja"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/90 dark:bg-rose-950/50 border border-[#C83E2B]/35 text-[#C83E2B] dark:text-rose-300 font-jp-serif text-[11px] font-bold"
                          >
                            <span>{goshuin.ordinalKanji}</span>
                            <span aria-hidden="true">·</span>
                            <span>{goshuin.calligraphyKanji}</span>
                          </span>
                        )}
                        <span className="font-semibold text-stone-800 dark:text-slate-200">
                          {unit.level} · Unit {String(unit.unitNumber).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-jp">{unit.japaneseSubtitle}</span>
                      </div>
                      <span className="font-mono-tabular shrink-0">
                        {studied}/{total} studied
                      </span>
                    </div>

                    <h3 className="mt-2 font-display text-lg font-bold text-stone-900 dark:text-white">
                      {unit.title}
                    </h3>

                    <p className="mt-1.5 text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-relaxed">
                      {unit.description}
                    </p>

                    <div className="mt-3 text-xs text-stone-500 dark:text-slate-400">
                      <span className="font-semibold text-stone-700 dark:text-slate-300">
                        Grammar:{' '}
                      </span>
                      <span>{unit.grammarFocus.join(' · ')}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#E6DEC8] dark:border-slate-800/80">
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-[#EFE9DC] dark:bg-slate-800 rounded-full overflow-hidden mb-2.5">
                      <div
                        className="h-full bg-[#C83E2B] transition-transform duration-200 origin-left"
                        style={{ transform: `scaleX(${total > 0 ? studied / total : 0})` }}
                      />
                    </div>

                    {/* Unboxed Status Breakdown */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
                      <span>{unseen} unseen</span>
                      <span aria-hidden="true">·</span>
                      <span>{due} due</span>
                      <span aria-hidden="true">·</span>
                      <span>{progressing} progressing</span>
                      <span aria-hidden="true">·</span>
                      <span>{mastered} mastered</span>
                      {isDialogueDone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Story Read ✓
                          </span>
                        </>
                      )}
                    </div>

                    {/* Unit Action Buttons (3-Step Learning Loop) */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {onOpenUnitGrammar && (
                        <button
                          type="button"
                          onClick={() => onOpenUnitGrammar(unit.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>1. Grammar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onStartStudy({
                            mode: unseen > 0 ? 'learn_new' : 'free_practice',
                            level: unit.level,
                            unitId: unit.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>
                          {unseen > 0 ? `2. Study New (${unseen})` : '2. Practice Unit'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDialogueForUnit(unit.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isDialogueDone ? '3. Story ✓' : '3. Read Story'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectUnitInLibrary(unit.id, unit.level)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Browse ({total})</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 20 UNIT MINI-DIALOGUE STORIES */}
      {activeSubTab === 'dialogues' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 20 Unit Story Selector */}
          <div className="lg:col-span-4 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6DEC8] dark:border-slate-800">
              <div>
                <h2 className="font-display text-sm font-bold text-stone-900 dark:text-white">
                  20 Situational Stories
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {completedDialogues.length} of 20 comprehension checks passed
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {UNIT_DIALOGUES.map((story) => {
                const isSelected = story.unitId === activeDialogue.unitId;
                const isDone = completedDialogues.includes(story.unitId);
                return (
                  <button
                    key={story.unitId}
                    type="button"
                    onClick={() => {
                      setSelectedDialogueUnitId(story.unitId);
                      setSelectedQuizOption(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#C83E2B] text-white'
                        : 'hover:bg-[#EFE9DC]/70 dark:hover:bg-slate-800/80 text-stone-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div
                        className={`text-[11px] font-mono-tabular ${
                          isSelected ? 'text-rose-100' : 'text-stone-500 dark:text-slate-400'
                        }`}
                      >
                        {story.level} · Unit {String(story.unitNumber).padStart(2, '0')}
                      </div>
                      <div className="text-xs font-semibold truncate">{story.title}</div>
                    </div>
                    {isDone && (
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Mini-Dialogue Reader & Comprehension Check */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DFD6C7] dark:border-slate-800">
                <div>
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                      {activeDialogue.level} · Unit {String(activeDialogue.unitNumber).padStart(2, '0')}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span lang="ja" className="font-jp">
                      {activeDialogue.japaneseTitle}
                    </span>
                    {completedDialogues.includes(activeDialogue.unitId) && (
                      <>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Completed ✓
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-bold text-stone-900 dark:text-white">
                    {activeDialogue.title}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                    Setting: {activeDialogue.setting}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start">
                  <button
                    type="button"
                    onClick={handlePlayFullDialogue}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {playingLineIndex === -1 ? 'Playing Story...' : 'Play Full Conversation'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDialogueEnglish((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {showDialogueEnglish ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide English</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show English</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Conversation Lines */}
              <div className="mt-6 space-y-4">
                {activeDialogue.lines.map((line, idx) => {
                  const isRoleA = line.speakerRole === 'A';
                  const isPlayingThis = playingLineIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
                        isPlayingThis
                          ? 'border-[#C83E2B] bg-rose-50/40 dark:bg-rose-950/30'
                          : isRoleA
                          ? 'border-[#DFD6C7]/90 dark:border-slate-800 bg-[#F6F1E6]/80 dark:bg-slate-900/80'
                          : 'border-[#DFD6C7] dark:border-slate-800 bg-[#FCFBF7] dark:bg-[#141923]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                            {line.speaker}
                          </div>
                          <div
                            lang="ja"
                            className="font-jp text-lg sm:text-xl font-semibold text-stone-900 dark:text-white leading-relaxed"
                          >
                            <FuriganaText
                              segments={line.segments}
                              showFurigana={showFuriganaInDialogues}
                              onSelectSegment={(seg) =>
                                setInspectorData(inspectTokenOrCharacter(seg.text, seg.reading))
                              }
                            />
                          </div>
                          {showDialogueEnglish && (
                            <div className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 pt-1">
                              {line.english}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSpeakText(line.japanese, idx)}
                          aria-label={`Play line ${idx + 1} audio`}
                          className="p-2.5 rounded-xl bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#C83E2B] hover:text-white text-stone-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comprehension Check Quiz */}
              <div className="mt-8 pt-6 border-t border-[#DFD6C7] dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#C83E2B] dark:text-rose-400">
                  Comprehension Check
                </div>
                <h3 className="mt-1 font-display text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {activeDialogue.comprehensionQuestion.question}
                </h3>

                <div className="mt-4 space-y-2.5">
                  {activeDialogue.comprehensionQuestion.options.map((optionText, optIdx) => {
                    const isSelected = selectedQuizOption === optIdx;
                    const isCorrect = optIdx === activeDialogue.comprehensionQuestion.correctIndex;
                    let btnStyle =
                      'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900 hover:border-stone-400 dark:hover:border-slate-600 text-stone-800 dark:text-slate-200';

                    if (selectedQuizOption !== null) {
                      if (isCorrect) {
                        btnStyle =
                          'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle =
                          'border-[#C83E2B] bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleAnswerDialogueQuiz(optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-colors flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                      >
                        <span>{optionText}</span>
                        {selectedQuizOption !== null && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedQuizOption !== null && (
                  <div className="mt-4 p-4 rounded-xl bg-[#F4EFE6]/80 dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 text-xs text-stone-700 dark:text-slate-300 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">
                        {selectedQuizOption === activeDialogue.comprehensionQuestion.correctIndex
                          ? 'Correct! Story marked complete. '
                          : 'Not quite. '}
                      </span>
                      <span>{activeDialogue.comprehensionQuestion.explanation}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onStartStudy({
                          mode: 'learn_new',
                          level: activeDialogue.level,
                          unitId: activeDialogue.unitId,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors shrink-0 self-start cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Study Unit {activeDialogue.unitNumber} Sentences</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEARCHABLE GRAMMAR HANDBOOK & COMPARISONS */}
      {activeSubTab === 'grammar' && (
        <div className="mt-6 space-y-8">
          {/* Search & Level Filter Bar */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search grammar handbook"
                placeholder="Search particles (は, が, に, で), patterns (〜ませんか, て-form), or English topics..."
                value={grammarSearchQuery}
                onChange={(e) => setGrammarSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start sm:self-auto">
              {(['ALL', 'A1.1', 'A1.2'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setGrammarLevelFilter(lvl)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    grammarLevelFilter === lvl
                      ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? 'All 20 Lessons' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Particle & Pattern Comparison Guides */}
          {filteredComparisons.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                  Essential A1 Particle & Pattern Comparisons
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Side-by-side contrasts for the most commonly confused beginner Japanese grammar
                  points.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredComparisons.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                        {comp.title}
                      </h3>
                      <p className="mt-1 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                        {comp.summary}
                      </p>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800">
                          <div className="text-xs font-bold text-[#C83E2B] dark:text-rose-400 font-jp">
                            {comp.leftPattern}
                          </div>
                          <p className="mt-1 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                            {comp.leftRule}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-[#DFD6C7]/60 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <div
                                lang="ja"
                                className="font-jp text-xs font-semibold text-stone-900 dark:text-white"
                              >
                                {comp.leftExample.jp}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-slate-400">
                                {comp.leftExample.en}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSpeakText(comp.leftExample.jp)}
                              aria-label={`Pronounce ${comp.leftExample.jp}`}
                              className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800">
                          <div className="text-xs font-bold text-stone-900 dark:text-white font-jp">
                            {comp.rightPattern}
                          </div>
                          <p className="mt-1 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                            {comp.rightRule}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-[#DFD6C7]/60 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <div
                                lang="ja"
                                className="font-jp text-xs font-semibold text-stone-900 dark:text-white"
                              >
                                {comp.rightExample.jp}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-slate-400">
                                {comp.rightExample.en}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSpeakText(comp.rightExample.jp)}
                              aria-label={`Pronounce ${comp.rightExample.jp}`}
                              className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Unit-by-Unit Grammar Lessons */}
          <section>
            <div className="mb-4">
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Unit-by-Unit Grammar Reference ({filteredGrammarLessons.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Concise structural formulas, usage rules, and spoken examples for every curriculum
                unit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredGrammarLessons.map((lesson) => (
                <article
                  key={lesson.unitId}
                  className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                      <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                        {lesson.level} · Unit {String(lesson.unitNumber).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onStartStudy({
                            mode: 'free_practice',
                            level: lesson.level,
                            unitId: lesson.unitId,
                          })
                        }
                        className="font-semibold text-stone-700 dark:text-slate-300 hover:text-[#C83E2B] dark:hover:text-rose-400 cursor-pointer"
                      >
                        Practice Unit →
                      </button>
                    </div>

                    <h3 className="mt-1.5 font-display text-lg font-bold text-stone-900 dark:text-white">
                      {lesson.title}
                    </h3>

                    <div
                      lang="ja"
                      className="mt-2.5 px-3 py-2 rounded-xl bg-[#EFE9DC]/70 dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800 font-jp text-xs font-semibold text-stone-900 dark:text-slate-100"
                    >
                      Formula: {lesson.patternFormula}
                    </div>

                    <p className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                      {lesson.coreExplanation}
                    </p>

                    <div className="mt-2.5 text-xs text-stone-500 dark:text-slate-400">
                      <span className="font-semibold text-stone-800 dark:text-slate-200">
                        Key Tip:{' '}
                      </span>
                      <span>{lesson.keyTip}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#E6DEC8] dark:border-slate-800 space-y-2">
                    {lesson.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/70 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div
                            lang="ja"
                            className="font-jp text-sm font-semibold text-stone-900 dark:text-white"
                          >
                            {ex.japanese}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400">
                            {ex.reading} · {ex.english}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSpeakText(ex.japanese)}
                          aria-label={`Pronounce ${ex.japanese}`}
                          className="p-2 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: INTERACTIVE KANA & A1 KANJI MASTERY GRID */}
      {activeSubTab === 'kana_kanji' && (
        <div className="mt-6 space-y-6">
          {/* Script Switcher */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Interactive Japanese Script & Kanji Mastery Grid
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Click any A1 Kanji to inspect stroke counts, On/Kun readings, and corpus sentences,
                or click any Hiragana/Katakana character to hear native pronunciation.
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start">
              {(
                [
                  { id: 'kanji', label: `A1 Kanji (${kanjiStatsSummary.total})` },
                  { id: 'hiragana', label: 'Hiragana (46)' },
                  { id: 'katakana', label: 'Katakana (46)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setScriptTab(tab.id);
                    if (tab.id === 'hiragana') setSelectedKanaCell(HIRAGANA_GOJUON[0]);
                    if (tab.id === 'katakana') setSelectedKanaCell(KATAKANA_GOJUON[0]);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    scriptTab === tab.id
                      ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* A1 KANJI MASTERY GRID */}
          {scriptTab === 'kanji' && (
            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6DEC8] dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
                <div>
                  <span>
                    Encountered in study: {kanjiStatsSummary.encountered} / {kanjiStatsSummary.total}
                  </span>
                  <span className="mx-2">·</span>
                  <span>
                    Mastered (14d+ interval): {kanjiStatsSummary.mastered} / {kanjiStatsSummary.total}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    <span>Mastered</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#C83E2B] inline-block" />
                    <span>Studying</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-stone-300 dark:bg-slate-700 inline-block" />
                    <span>Unseen</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {kanjiGridItems.map((item) => {
                  let borderClass =
                    'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900';
                  if (item.status === 'mastered') {
                    borderClass =
                      'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/30';
                  } else if (item.status === 'studying') {
                    borderClass = 'border-[#C83E2B]/80 bg-rose-50/40 dark:bg-rose-950/30';
                  }

                  return (
                    <button
                      key={item.kanji}
                      type="button"
                      onClick={() => {
                        setSelectedShodoKanji(item.kanji);
                        const result = inspectTokenOrCharacter(
                          item.kanji,
                          item.kunyomi
                        );
                        setInspectorData(result);
                      }}
                      className={`p-3 rounded-xl border text-left transition-transform hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer ${borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          lang="ja"
                          className="w-10 h-10 rounded-lg border border-stone-300/70 dark:border-slate-700 genko-cell inline-flex items-center justify-center font-jp-serif text-2xl font-bold text-stone-900 dark:text-white"
                        >
                          {item.kanji}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-stone-400 dark:text-slate-500">
                          {item.strokes}画
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-stone-800 dark:text-slate-200 truncate">
                          {item.coreMeaning}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-stone-500 dark:text-slate-400 mt-0.5">
                          {item.studiedSentences}/{item.totalSentences} sent.
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dedicated A1 Kanji Shodō Calligraphy Practice Bar */}
              <div className="mt-6 pt-6 border-t border-stone-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#C83E2B] dark:text-rose-400">
                    書道道場 · Interactive Kanji Brush Studio
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold text-stone-900 dark:text-white">
                    Practice Writing A1 Kanji with Sumi Ink
                  </h3>
                  <p className="mt-1 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                    Select any A1 Kanji below to practice stroke proportions on the Genkō Yōshi
                    4-quadrant calligraphy square, or click any Kanji card above to inspect its
                    corpus sentences.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {kanjiGridItems.slice(0, 24).map((k) => (
                      <button
                        key={k.kanji}
                        type="button"
                        onClick={() => setSelectedShodoKanji(k.kanji)}
                        className={`w-9 h-9 rounded-lg font-jp-serif font-bold text-base border transition-colors cursor-pointer ${
                          selectedShodoKanji === k.kanji
                            ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                            : 'border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 hover:border-[#C83E2B]'
                        }`}
                      >
                        {k.kanji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-7">
                  {(() => {
                    const activeK =
                      A1_KANJI_DICTIONARY[selectedShodoKanji] ||
                      A1_KANJI_DICTIONARY['日'];
                    return (
                      <ShodoCanvas
                        character={activeK.kanji}
                        reading={`${activeK.onyomi} · ${activeK.kunyomi}`}
                        meaning={activeK.coreMeaning}
                        strokeCount={activeK.strokes}
                        audioSpeed={appState.settings.audioSpeed}
                        preferredVoiceURI={appState.settings.preferredVoiceURI}
                        soundEffectsEnabled={appState.settings.soundEffectsEnabled}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* HIRAGANA / KATAKANA GOJUON CHART */}
          {(scriptTab === 'hiragana' || scriptTab === 'katakana') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6DEC8] dark:border-slate-800">
                  <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                    {scriptTab === 'hiragana'
                      ? 'Hiragana Gojūon Chart (ひらがな五十音)'
                      : 'Katakana Gojūon Chart (カタカナ五十音)'}
                  </h3>
                  <span className="text-xs text-stone-500 dark:text-slate-400">
                    Click any character to pronounce
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {(scriptTab === 'hiragana' ? HIRAGANA_GOJUON : KATAKANA_GOJUON).map((cell) => {
                    const isSelected = selectedKanaCell?.kana === cell.kana;
                    return (
                      <button
                        key={cell.kana}
                        type="button"
                        onClick={() => {
                          setSelectedKanaCell(cell);
                          handleSpeakText(cell.kana);
                        }}
                        className={`p-3 rounded-xl border text-center transition-colors genko-cell cursor-pointer ${
                          isSelected
                            ? 'border-[#C83E2B] bg-rose-50 dark:bg-rose-950/60 text-stone-900 dark:text-white'
                            : 'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900 hover:border-stone-400 dark:hover:border-slate-600'
                        }`}
                      >
                        <div
                          lang="ja"
                          className="font-jp-serif text-2xl font-bold text-stone-900 dark:text-white"
                        >
                          {cell.kana}
                        </div>
                        <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mt-0.5">
                          {cell.romaji}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Kana Detail Card */}
              <div className="lg:col-span-4 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
                {selectedKanaCell && (
                  <div>
                    <div className="text-xs text-stone-500 dark:text-slate-400">
                      Selected Kana Character (原稿用紙)
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          lang="ja"
                          className="w-16 h-16 rounded-xl border border-[#DFD6C7] dark:border-slate-700 genko-cell inline-flex items-center justify-center font-jp-serif text-4xl font-bold text-stone-900 dark:text-white"
                        >
                          {selectedKanaCell.kana}
                        </span>
                        <span className="font-mono-tabular text-lg font-semibold text-[#C83E2B] dark:text-rose-400">
                          [{selectedKanaCell.romaji}]
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeakText(selectedKanaCell.kana)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Speak Kana</span>
                      </button>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[#E6DEC8] dark:border-slate-800">
                      <div className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                        A1 Vocabulary Example
                      </div>
                      <div className="mt-2 p-4 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <div
                            lang="ja"
                            className="font-jp text-lg font-bold text-stone-900 dark:text-white"
                          >
                            {selectedKanaCell.exampleWord}
                          </div>
                          <div className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                            {selectedKanaCell.exampleMeaning}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleSpeakText(selectedKanaCell.exampleWord.split(' ')[0])
                          }
                          aria-label={`Pronounce ${selectedKanaCell.exampleWord}`}
                          className="p-2.5 rounded-xl bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5">
                      <ShodoCanvas
                        character={selectedKanaCell.kana}
                        reading={selectedKanaCell.romaji}
                        meaning={selectedKanaCell.exampleWord}
                        audioSpeed={appState.settings.audioSpeed}
                        preferredVoiceURI={appState.settings.preferredVoiceURI}
                        soundEffectsEnabled={appState.settings.soundEffectsEnabled}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Character & Kanji Concordance Popover */}
      <CharacterPopover
        data={inspectorData}
        onClose={() => setInspectorData(null)}
        audioSpeed={appState.settings.audioSpeed}
        preferredVoiceURI={appState.settings.preferredVoiceURI}
      />
    </div>
  );
};
