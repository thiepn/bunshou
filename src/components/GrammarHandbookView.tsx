import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Columns,
  FileText,
  HelpCircle,
  MessageSquare,
  Play,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import { GRAMMAR_COMPARISONS, GRAMMAR_HANDBOOK } from '../data/referenceData';
import { ALL_SENTENCES, SENTENCES_BY_UNIT } from '../data/sentences';
import { LevelId, PersistedAppState, RubySegment, SentenceItem } from '../types/curriculum';
import { speakJapaneseSentence } from '../utils/audio';
import { CharacterInspectorResult, inspectTokenOrCharacter } from '../utils/linguistics';
import { classifyCardState, getLocalDateString } from '../utils/srs';
import { CharacterPopover } from './CharacterPopover';
import { FuriganaText, HighlightedJapaneseText } from './FuriganaText';
import { StudyLaunchConfig } from './StudyView';

interface GrammarHandbookViewProps {
  appState: PersistedAppState;
  initialUnitId?: string;
  onStartStudy: (config: StudyLaunchConfig) => void;
  onGuidedLesson:(unitId:string)=>void;
  onInspectUnitInLibrary: (unitId: string, level: LevelId) => void;
  onOpenUnitStory?: (unitId: string) => void;
}

const QUICK_PARTICLE_FILTERS: Array<{ label: string; query: string }> = [
  { label: 'All Concepts', query: '' },
  { label: 'は vs. が', query: 'は' },
  { label: 'に vs. で', query: 'に' },
  { label: 'を (Object)', query: 'を' },
  { label: 'あります / います', query: 'あります' },
  { label: 'て-Form', query: 'て' },
  { label: '〜ませんか (Invite)', query: 'ませんか' },
  { label: '〜たい / 欲しい', query: 'たい' },
  { label: 'から (Reason)', query: 'から' },
];

export const GrammarHandbookView: React.FC<GrammarHandbookViewProps> = ({
  appState,
  initialUnitId,
  onStartStudy,
  onGuidedLesson,
  onInspectUnitInLibrary,
  onOpenUnitStory,
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'comparisons'>('explorer');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | LevelId>('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialUnitId || GRAMMAR_HANDBOOK[0].unitId
  );
  const [expandedComparisonIds, setExpandedComparisonIds] = useState<Record<string, boolean>>({
    'wa-vs-ga': true,
    'ni-vs-de': true,
  });
  const [inspectorData, setInspectorData] = useState<CharacterInspectorResult | null>(null);

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
      setActiveTab('explorer');
    }
  }, [initialUnitId]);

  const todayStr = getLocalDateString();
  const showFurigana = appState.settings.furiganaMode !== 'always_off';

  const handleSpeak = (text: string) => {
    speakJapaneseSentence(
      text,
      appState.settings.audioSpeed,
      undefined,
      undefined,
      undefined,
      appState.settings.preferredVoiceURI
    );
  };

  const handleInspectSegment = (seg: RubySegment, sentenceId?: string) => {
    setInspectorData(inspectTokenOrCharacter(seg.text, seg.reading, sentenceId));
  };

  const toggleComparisonSentences = (compId: string) => {
    setExpandedComparisonIds((prev) => ({
      ...prev,
      [compId]: !prev[compId],
    }));
  };

  const filteredComparisons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GRAMMAR_COMPARISONS.filter((comp) => {
      if (levelFilter !== 'ALL') {
        const matchesLevel = comp.relatedUnitIds.some((uid) =>
          levelFilter === 'A1.1' ? uid.startsWith('a11') : uid.startsWith('a12')
        );
        if (!matchesLevel) return false;
      }
      if (!q) return true;
      return (
        comp.title.toLowerCase().includes(q) ||
        comp.summary.toLowerCase().includes(q) ||
        comp.leftPattern.toLowerCase().includes(q) ||
        comp.rightPattern.toLowerCase().includes(q) ||
        comp.leftRule.toLowerCase().includes(q) ||
        comp.rightRule.toLowerCase().includes(q) ||
        comp.leftExample.jp.toLowerCase().includes(q) ||
        comp.rightExample.jp.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, levelFilter]);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GRAMMAR_HANDBOOK.filter((entry) => {
      if (levelFilter !== 'ALL' && entry.level !== levelFilter) return false;
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
  }, [searchQuery, levelFilter]);

  const activeLesson = useMemo(() => {
    const inFiltered = filteredLessons.find((l) => l.unitId === selectedUnitId);
    if (inFiltered) return inFiltered;
    return filteredLessons[0] || GRAMMAR_HANDBOOK[0];
  }, [filteredLessons, selectedUnitId]);

  // Related comparisons for the currently selected unit in the Explorer
  const relatedComparisonsForActiveUnit = useMemo(
    () =>
      GRAMMAR_COMPARISONS.filter((c) => c.relatedUnitIds.includes(activeLesson.unitId)),
    [activeLesson.unitId]
  );

  // Helper to collect corpus sentences associated with a comparison card
  const getSentencesForComparison = (relatedUnitIds: string[]): SentenceItem[] => {
    const unitSet = new Set(relatedUnitIds);
    return ALL_SENTENCES.filter((s) => unitSet.has(s.unitId));
  };

  const activeUnitSentences = SENTENCES_BY_UNIT[activeLesson.unitId] || [];
  const activeUnitStudied = activeUnitSentences.filter((s) =>
    Boolean(appState.records[s.id])
  ).length;
  const activeUnitMastered = activeUnitSentences.filter(
    (s) => classifyCardState(appState.records[s.id], todayStr) === 'mastered'
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 md:py-10 pb-24 md:pb-16">
      {/* Page Header & 2-Tab Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[#DFD6C7] dark:border-slate-800">
        <div>
          <div className="text-xs text-stone-500 dark:text-slate-400">
            <span>文法手引 · A1.1 & A1.2 Reference & Practice Index</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>20 Unit Guides · 8 Side-by-Side Particle Contrasts · Color-Coded Particles</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-stone-900 dark:text-white">
            Grammar Handbook (文法解説)
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
            Explore A1.1 and A1.2 grammar lessons in a clean master-detail reader, or compare
            commonly confused Japanese particles (such as は vs. が and に vs. で) side by side.
          </p>
        </div>

        {/* 2-Tab Switcher (Explorer vs. Comparisons) */}
        <div
          role="tablist"
          aria-label="Grammar handbook view mode"
          className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start gap-1 max-w-full overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'explorer'}
            onClick={() => setActiveTab('explorer')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>20-Unit Grammar Explorer ({filteredLessons.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'comparisons'}
            onClick={() => setActiveTab('comparisons')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'comparisons'
                ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Particle Comparisons ({filteredComparisons.length})</span>
          </button>
        </div>
      </div>

      {/* Search Bar, Level Switcher & Quick Particle Filter Bar */}
      <div className="mt-6 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search grammar points and particles"
              placeholder="Search particles (は, が, に, で, を), patterns (〜ませんか, て-form, たい), or English topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setSearchQuery('')}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter grammar by level"
            className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start sm:self-auto"
          >
            {(
              [
                { id: 'ALL', label: 'All Levels (20)' },
                { id: 'A1.1', label: 'A1.1 (10)' },
                { id: 'A1.2', label: 'A1.2 (10)' },
              ] as const
            ).map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                role="tab"
                aria-selected={levelFilter === lvl.id}
                onClick={() => setLevelFilter(lvl.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  levelFilter === lvl.id
                    ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Particle & Concept Quick Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-stone-500 dark:text-slate-400 mr-1 whitespace-nowrap shrink-0">
            Quick Concept Filter:
          </span>
          {QUICK_PARTICLE_FILTERS.map((chip) => {
            const isActive = searchQuery === chip.query;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setSearchQuery(chip.query)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                    : 'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:border-stone-400 dark:hover:border-slate-600'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: 20-UNIT GRAMMAR EXPLORER (MASTER-DETAIL SPLIT) */}
      {activeTab === 'explorer' && (
        <section className="mt-6">
          {filteredLessons.length === 0 ? (
            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-stone-500 dark:text-slate-400">
              No grammar concepts match "{searchQuery}". Try clearing the search filter or switching
              to Particle Comparisons.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Master List: 20 Units */}
              <div className="lg:col-span-4 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6DEC8] dark:border-slate-800">
                  <div>
                    <h2 className="font-display text-sm font-bold text-stone-900 dark:text-white">
                      A1.1 & A1.2 Grammar Index
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      Select any unit to inspect rules, particle highlights, and practice sentences
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                  {filteredLessons.map((lesson) => {
                    const isSelected = lesson.unitId === activeLesson.unitId;
                    const uSentences = SENTENCES_BY_UNIT[lesson.unitId] || [];
                    const uStudied = uSentences.filter((s) =>
                      Boolean(appState.records[s.id])
                    ).length;

                    return (
                      <button
                        key={lesson.unitId}
                        type="button"
                        onClick={() => setSelectedUnitId(lesson.unitId)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer ${
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
                            {lesson.level} · Unit {String(lesson.unitNumber).padStart(2, '0')}
                          </div>
                          <div className="text-xs font-semibold truncate">{lesson.title}</div>
                        </div>

                        <span
                          className={`text-[11px] font-mono-tabular shrink-0 ${
                            isSelected ? 'text-rose-100' : 'text-stone-400 dark:text-slate-500'
                          }`}
                        >
                          {uStudied}/{uSentences.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Detail Pane: Active Unit Grammar Lesson & Corpus Sentences */}
              <div className="lg:col-span-8 space-y-5">
                <article className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 sm:p-8">
                  <button type="button" className="rounded-lg bg-[#C83E2B] text-white px-4 py-2 mb-4 font-semibold" onClick={()=>onGuidedLesson(activeLesson.unitId)}>Start guided practice for this unit</button>
                  {/* Top Metadata & 3-Step Unit Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E6DEC8] dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                        <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                          {activeLesson.level} · Unit{' '}
                          {String(activeLesson.unitNumber).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {activeUnitStudied}/{activeUnitSentences.length} studied ·{' '}
                          {activeUnitMastered} mastered
                        </span>
                      </div>

                      <h2 className="mt-1.5 font-display text-2xl font-bold text-stone-900 dark:text-white">
                        {activeLesson.title}
                      </h2>
                    </div>

                    {/* Direct 3-Step Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onStartStudy({
                            mode: 'free_practice',
                            practiceFormat: 'flashcard',
                            level: activeLesson.level,
                            unitId: activeLesson.unitId,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Practice Sentences ({activeUnitSentences.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onStartStudy({
                            mode: 'free_practice',
                            practiceFormat: 'particle_cloze',
                            level: activeLesson.level,
                            unitId: activeLesson.unitId,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Particle Drill</span>
                      </button>

                      {onOpenUnitStory && (
                        <button
                          type="button"
                          onClick={() => onOpenUnitStory(activeLesson.unitId)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Unit Story</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Structural Formula Box with Particle Highlighting */}
                  <div className="mt-5 p-4 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 mb-1">
                      Structural Formula (Particles highlighted in red)
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-stone-900 dark:text-white">
                      <HighlightedJapaneseText text={activeLesson.patternFormula} />
                    </div>
                  </div>

                  {/* Core Explanation & Key Tip */}
                  <div className="mt-5 space-y-3">
                    <p className="text-sm text-stone-700 dark:text-slate-200 leading-relaxed">
                      {activeLesson.coreExplanation}
                    </p>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 text-xs text-stone-700 dark:text-slate-200 leading-relaxed">
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        Key Tip:{' '}
                      </span>
                      <span>{activeLesson.keyTip}</span>
                    </div>
                  </div>

                  {/* Key Lesson Examples with Color-Coded Particles */}
                  <div className="mt-6">
                    <div className="text-xs font-bold text-stone-900 dark:text-white mb-2.5">
                      Core Pattern Examples
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeLesson.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-stone-900 dark:text-white">
                              <HighlightedJapaneseText text={ex.japanese} />
                            </div>
                            <div className="mt-0.5 text-xs text-stone-500 dark:text-slate-400 font-jp">
                              {ex.reading}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-stone-700 dark:text-slate-300">
                              {ex.english}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSpeak(ex.japanese)}
                            aria-label={`Pronounce ${ex.japanese}`}
                            className="p-2 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related Side-by-Side Comparison Callout (if applicable) */}
                  {relatedComparisonsForActiveUnit.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-[#E6DEC8] dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-stone-900 dark:text-white">
                          Related Particle Contrasts for Unit {activeLesson.unitNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('comparisons')}
                          className="text-xs font-semibold text-[#C83E2B] dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          View All 8 Comparisons →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {relatedComparisonsForActiveUnit.map((comp) => (
                          <div
                            key={comp.id}
                            className="p-4 rounded-xl bg-[#F6F1E6]/90 dark:bg-slate-900/90 border border-[#DFD6C7]/80 dark:border-slate-800"
                          >
                            <div className="text-xs font-bold text-stone-900 dark:text-white">
                              {comp.title}
                            </div>
                            <p className="mt-0.5 text-xs text-stone-600 dark:text-slate-400">
                              {comp.summary}
                            </p>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div className="p-2.5 rounded-lg bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7]/60 dark:border-slate-800">
                                <span className="font-bold text-[#C83E2B] dark:text-rose-400 font-jp">
                                  {comp.leftPattern}:{' '}
                                </span>
                                <span className="text-stone-600 dark:text-slate-300">
                                  {comp.leftRule}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7]/60 dark:border-slate-800">
                                <span className="font-bold text-stone-900 dark:text-white font-jp">
                                  {comp.rightPattern}:{' '}
                                </span>
                                <span className="text-stone-600 dark:text-slate-300">
                                  {comp.rightRule}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Associated Corpus Sentences for this Unit */}
                  <div className="mt-6 pt-5 border-t border-[#E6DEC8] dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                          Unit {activeLesson.unitNumber} Practice Sentences (Showing 6 of{' '}
                          {activeUnitSentences.length})
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Click any word to inspect Kanji & brush strokes; particles are highlighted in red.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onInspectUnitInLibrary(activeLesson.unitId, activeLesson.level)
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#C83E2B] dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Browse All {activeUnitSentences.length} in Library →</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeUnitSentences.slice(0, 6).map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/70 dark:border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div
                              lang="ja"
                              className="font-jp text-xs sm:text-sm font-semibold text-stone-900 dark:text-white"
                            >
                              <FuriganaText
                                segments={s.segments}
                                showFurigana={showFurigana}
                                highlightParticles={true}
                                onSelectSegment={(seg) => handleInspectSegment(seg, s.id)}
                              />
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                              {s.english}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSpeak(s.japanese)}
                            aria-label={`Pronounce ${s.japanese}`}
                            className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SIDE-BY-SIDE PARTICLE & PATTERN COMPARISONS (8 CONTRASTS) */}
      {activeTab === 'comparisons' && (
        <section className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Side-by-Side Particle & Pattern Comparisons ({filteredComparisons.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Contrast commonly confused Japanese particles (such as は vs. が and に vs. で) with
                color-coded particle highlights and direct practice sets.
              </p>
            </div>
          </div>

          {filteredComparisons.length === 0 ? (
            <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-stone-500 dark:text-slate-400">
              No particle comparisons match "{searchQuery}". Try clearing the search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredComparisons.map((comp) => {
                const associatedSentences = getSentencesForComparison(comp.relatedUnitIds);
                const isExpanded = Boolean(expandedComparisonIds[comp.id]);
                const sampleSentences = associatedSentences.slice(0, 4);
                const primaryUnitId = comp.relatedUnitIds[0] || 'a11-u01';
                const primaryLevel: LevelId = primaryUnitId.startsWith('a12') ? 'A1.2' : 'A1.1';

                return (
                  <article
                    key={comp.id}
                    className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                        <span>Particle & Pattern Contrast</span>
                        <span className="font-mono-tabular">
                          {associatedSentences.length} practice sentences linked
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-display text-lg font-bold text-stone-900 dark:text-white">
                        {comp.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-relaxed">
                        {comp.summary}
                      </p>

                      {/* Side-by-Side Columns */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-[#C83E2B] dark:text-rose-400 font-jp">
                              {comp.leftPattern}
                            </div>
                            <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                              {comp.leftRule}
                            </p>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-[#DFD6C7]/70 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-stone-900 dark:text-white">
                                <HighlightedJapaneseText text={comp.leftExample.jp} />
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                                {comp.leftExample.en}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSpeak(comp.leftExample.jp)}
                              aria-label={`Pronounce ${comp.leftExample.jp}`}
                              className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/80 dark:border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-stone-900 dark:text-white font-jp">
                              {comp.rightPattern}
                            </div>
                            <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                              {comp.rightRule}
                            </p>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-[#DFD6C7]/70 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-stone-900 dark:text-white">
                                <HighlightedJapaneseText text={comp.rightExample.jp} />
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                                {comp.rightExample.en}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSpeak(comp.rightExample.jp)}
                              aria-label={`Pronounce ${comp.rightExample.jp}`}
                              className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Direct Links to Associated Practice Sentences */}
                    <div className="mt-5 pt-4 border-t border-[#E6DEC8]/80 dark:border-slate-800/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onStartStudy({
                                mode: 'free_practice',
                                practiceFormat: 'flashcard',
                                customSet: associatedSentences,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Practice Sentences ({associatedSentences.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onStartStudy({
                                mode: 'free_practice',
                                practiceFormat: 'particle_cloze',
                                customSet: associatedSentences,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Drill Particles</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleComparisonSentences(comp.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Sentences' : 'Preview Sentences'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#E6DEC8]/70 dark:border-slate-800/70 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400">
                            <span>Associated Corpus Sentences</span>
                            <button
                              type="button"
                              onClick={() => onInspectUnitInLibrary(primaryUnitId, primaryLevel)}
                              className="font-semibold text-[#C83E2B] dark:text-rose-400 hover:underline cursor-pointer"
                            >
                              Browse in Library →
                            </button>
                          </div>

                          {sampleSentences.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7]/70 dark:border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div
                                  lang="ja"
                                  className="font-jp text-xs sm:text-sm font-semibold text-stone-900 dark:text-white"
                                >
                                  <FuriganaText
                                    segments={s.segments}
                                    showFurigana={showFurigana}
                                    highlightParticles={true}
                                    onSelectSegment={(seg) => handleInspectSegment(seg, s.id)}
                                  />
                                </div>
                                <div className="text-[11px] text-stone-500 dark:text-slate-400">
                                  {s.english}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSpeak(s.japanese)}
                                aria-label={`Pronounce ${s.japanese}`}
                                className="p-1.5 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#C83E2B] hover:text-white transition-colors shrink-0 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
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
