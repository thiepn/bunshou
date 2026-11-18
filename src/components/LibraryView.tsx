import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Eye, EyeOff, Play, Search, Volume2, X } from 'lucide-react';
import { ALL_SENTENCES, ALL_TOPICS } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import {
  DifficultyTier,
  LevelId,
  PersistedAppState,
  RubySegment,
  SentenceItem,
} from '../types/curriculum';
import { speakJapaneseSentence } from '../utils/audio';
import { CharacterInspectorResult, inspectTokenOrCharacter } from '../utils/linguistics';
import { classifyCardState, getLocalDateString } from '../utils/srs';
import { CharacterPopover } from './CharacterPopover';
import { FuriganaText } from './FuriganaText';
import { StudyLaunchConfig } from './StudyView';

interface LibraryViewProps {
  appState: PersistedAppState;
  initialUnitId?: string;
  initialLevel?: LevelId;
  initialFavoritesOnly?: boolean;
  onToggleFavorite: (sentenceId: string) => void;
  onStartStudy: (config: StudyLaunchConfig) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  appState,
  initialUnitId,
  initialLevel,
  initialFavoritesOnly = false,
  onToggleFavorite,
  onStartStudy,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | LevelId>(initialLevel || 'ALL');
  const [unitFilter, setUnitFilter] = useState<string>(initialUnitId || 'ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | DifficultyTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'UNSEEN' | 'STUDIED' | 'DUE' | 'DIFFICULT' | 'MASTERED'
  >('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(initialFavoritesOnly);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [visibleLimit, setVisibleLimit] = useState<number>(60);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<CharacterInspectorResult | null>(null);

  useEffect(() => {
    if (initialUnitId) setUnitFilter(initialUnitId);
    if (initialLevel) setLevelFilter(initialLevel);
    setFavoritesOnly(Boolean(initialFavoritesOnly));
  }, [initialUnitId, initialLevel, initialFavoritesOnly]);

  const todayStr = getLocalDateString();

  const filteredSentences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_SENTENCES.filter((s) => {
      if (levelFilter !== 'ALL' && s.level !== levelFilter) return false;
      if (unitFilter !== 'ALL' && s.unitId !== unitFilter) return false;
      if (topicFilter !== 'ALL' && s.topic !== topicFilter) return false;
      if (difficultyFilter !== 'ALL' && s.difficulty !== difficultyFilter) return false;
      if (favoritesOnly && !appState.favorites.includes(s.id)) return false;

      if (statusFilter !== 'ALL') {
        const st = classifyCardState(appState.records[s.id], todayStr);
        if (statusFilter === 'UNSEEN' && st !== 'unseen') return false;
        if (statusFilter === 'STUDIED' && st === 'unseen') return false;
        if (statusFilter === 'DUE' && st !== 'due') return false;
        if (statusFilter === 'DIFFICULT' && st !== 'difficult') return false;
        if (statusFilter === 'MASTERED' && st !== 'mastered') return false;
      }

      if (q.length > 0) {
        const matchJp = s.japanese.toLowerCase().includes(q);
        const matchKana = s.readingKana.toLowerCase().includes(q);
        const matchEn = s.english.toLowerCase().includes(q);
        const matchGrammar = s.grammarTags.some((g) => g.toLowerCase().includes(q));
        const matchVocab = s.vocabTags.some((v) => v.toLowerCase().includes(q));
        if (!matchJp && !matchKana && !matchEn && !matchGrammar && !matchVocab) {
          return false;
        }
      }

      return true;
    });
  }, [
    searchQuery,
    levelFilter,
    unitFilter,
    topicFilter,
    difficultyFilter,
    favoritesOnly,
    statusFilter,
    appState.favorites,
    appState.records,
    todayStr,
  ]);

  const displayedSentences = useMemo(
    () => filteredSentences.slice(0, visibleLimit),
    [filteredSentences, visibleLimit]
  );

  const handlePlaySentence = (item: SentenceItem) => {
    setSpeakingId(item.id);
    speakJapaneseSentence(
      item.japanese,
      appState.settings.audioSpeed,
      () => setSpeakingId(item.id),
      () => setSpeakingId(null),
      () => setSpeakingId(null),
      appState.settings.preferredVoiceURI
    );
  };

  const handleInspectSegment = (seg: RubySegment, sentenceId: string) => {
    setInspectorData(inspectTokenOrCharacter(seg.text, seg.reading, sentenceId));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setLevelFilter('ALL');
    setUnitFilter('ALL');
    setTopicFilter('ALL');
    setDifficultyFilter('ALL');
    setStatusFilter('ALL');
    setFavoritesOnly(false);
    setVisibleLimit(60);
  };

  const showFurigana = appState.settings.furiganaMode !== 'always_off';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-24 md:pb-16">
      {/* Header & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#DFD6C7] dark:border-slate-800">
        <div>
          <div className="text-xs text-stone-500 dark:text-slate-400">
            <span>例文蔵書 · Complete Corpus Explorer</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>
              Showing {filteredSentences.length} of {ALL_SENTENCES.length} sentences
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-stone-900 dark:text-white">
            Sentence Library & Favorites
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
            Search across all A1.1 and A1.2 sentences by Japanese, kana reading, English meaning, or
            grammar pattern. Click any Japanese word to inspect kanji strokes and corpus examples.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTranslations((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showTranslations ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide English in List</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show English in List</span>
              </>
            )}
          </button>

          {filteredSentences.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onStartStudy({
                  mode: 'free_practice',
                  customSet: filteredSentences,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Practice Matching ({filteredSentences.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters Panel */}
      <div className="mt-6 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              role="searchbox"
              aria-label="Search sentences in Japanese or English"
              placeholder="Search Japanese (e.g. 学生, がくせい), English (e.g. train, movie), or grammar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(60);
              }}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-xl text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C83E2B]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* All vs Favorites Segmented Toggle */}
          <div className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-stone-800 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setFavoritesOnly(false)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !favoritesOnly
                  ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              All ({ALL_SENTENCES.length})
            </button>
            <button
              type="button"
              onClick={() => setFavoritesOnly(true)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                favoritesOnly
                  ? 'bg-[#FCFBF7] dark:bg-slate-900 text-[#C83E2B] dark:text-rose-400 shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>Favorites ({appState.favorites.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Selects Row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 dark:text-slate-400">
            <span>Level</span>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value as 'ALL' | LevelId);
                setUnitFilter('ALL');
                setVisibleLimit(60);
              }}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 dark:text-white"
            >
              <option value="ALL">All Levels (A1.1 & A1.2)</option>
              <option value="A1.1">A1.1 (310 sentences)</option>
              <option value="A1.2">A1.2 (310 sentences)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 dark:text-slate-400">
            <span>Unit</span>
            <select
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setVisibleLimit(60);
              }}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 dark:text-white"
            >
              <option value="ALL">All 20 Units</option>
              {CURRICULUM_UNITS.filter(
                (u) => levelFilter === 'ALL' || u.level === levelFilter
              ).map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitNumber}: {u.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 dark:text-slate-400">
            <span>Topic</span>
            <select
              value={topicFilter}
              onChange={(e) => {
                setTopicFilter(e.target.value);
                setVisibleLimit(60);
              }}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 dark:text-white"
            >
              <option value="ALL">All Topics</option>
              {ALL_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 dark:text-slate-400">
            <span>Difficulty</span>
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value as 'ALL' | DifficultyTier);
                setVisibleLimit(60);
              }}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 dark:text-white"
            >
              <option value="ALL">All Difficulties</option>
              <option value="foundational">Foundational</option>
              <option value="developing">Developing</option>
              <option value="confident">Confident</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-stone-500 dark:text-slate-400">
            <span>Study Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setVisibleLimit(60);
              }}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNSEEN">Unseen</option>
              <option value="STUDIED">Previously Studied</option>
              <option value="DUE">Due for Review</option>
              <option value="DIFFICULT">Difficult</option>
              <option value="MASTERED">Mastered</option>
            </select>
          </label>
        </div>
      </div>

      {/* Results List */}
      {filteredSentences.length === 0 ? (
        <div className="mt-8 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-10 text-center">
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
            No Matching Sentences Found
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-400 max-w-md mx-auto">
            {favoritesOnly && appState.favorites.length === 0
              ? 'You have not bookmarked any favorite sentences yet. Click the bookmark icon on any flashcard or library row to save it here.'
              : 'No sentences matched your search query and active filters.'}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 px-4 py-2 bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {displayedSentences.map((item) => {
            const isFav = appState.favorites.includes(item.id);
            const rec = appState.records[item.id];
            const cardState = classifyCardState(rec, todayStr);
            const unit = CURRICULUM_UNITS.find((u) => u.id === item.unitId);

            return (
              <div
                key={item.id}
                className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  {/* Unboxed Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
                    <span className="font-semibold text-stone-800 dark:text-slate-200">
                      #{String(item.order).padStart(3, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.level} Unit {unit ? unit.unitNumber : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{item.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.grammarTags.join(' / ')}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        cardState === 'mastered'
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : cardState === 'due'
                          ? 'text-[#C83E2B] dark:text-rose-400 font-semibold'
                          : cardState === 'unseen'
                          ? 'text-stone-400 dark:text-slate-500'
                          : 'text-sky-700 dark:text-sky-400 font-semibold'
                      }
                    >
                      {cardState === 'unseen'
                        ? 'Unseen'
                        : cardState === 'due'
                        ? 'Due Now'
                        : cardState === 'mastered'
                        ? 'Mastered'
                        : cardState === 'progressing'
                        ? 'Progressing'
                        : cardState === 'difficult'
                        ? 'Needs Practice'
                        : 'Learning'}
                    </span>
                  </div>

                  {/* Japanese Sentence with Clickable Ruby Furigana */}
                  <div
                    lang="ja"
                    className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-slate-100"
                  >
                    <FuriganaText
                      segments={item.segments}
                      showFurigana={showFurigana}
                      onSelectSegment={(seg) => handleInspectSegment(seg, item.id)}
                    />
                  </div>

                  {/* English Translation */}
                  {showTranslations && (
                    <div className="text-sm sm:text-base text-stone-600 dark:text-slate-300">
                      {item.english}
                    </div>
                  )}
                </div>

                {/* Row Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handlePlaySentence(item)}
                    aria-label={`Play audio for ${item.japanese}`}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                      speakingId === item.id
                        ? 'bg-[#C83E2B] text-white'
                        : 'bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-slate-200 hover:bg-[#E5DEC9] dark:hover:bg-slate-700'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item.id)}
                    aria-label={
                      isFav
                        ? `Remove ${item.japanese} from favorites`
                        : `Add ${item.japanese} to favorites`
                    }
                    aria-pressed={isFav}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                      isFav
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-[#C83E2B] dark:text-rose-400'
                        : 'bg-[#EFE9DC] dark:bg-stone-800 text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        mode: 'free_practice',
                        customSet: [item],
                      })
                    }
                    className="px-3 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Practice Card
                  </button>
                </div>
              </div>
            );
          })}

          {filteredSentences.length > visibleLimit && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 60)}
                className="px-5 py-2.5 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 hover:border-stone-500 text-stone-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Show More Sentences ({filteredSentences.length - visibleLimit} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Character & Vocabulary Inspector Modal */}
      <CharacterPopover
        data={inspectorData}
        onClose={() => setInspectorData(null)}
        audioSpeed={appState.settings.audioSpeed}
        preferredVoiceURI={appState.settings.preferredVoiceURI}
      />
    </div>
  );
};
