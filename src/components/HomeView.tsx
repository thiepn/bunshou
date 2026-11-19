import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Ear,
  FileText,
  Grid,
  HelpCircle,
  MessageSquare,
  Play,
  Puzzle,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { UNIT_DIALOGUES } from '../data/dialogues';
import { OMIKUJI_PROVERBS, OmikujiProverbItem } from '../data/japaneseCulture';
import { GRAMMAR_HANDBOOK } from '../data/referenceData';
import { ALL_SENTENCES, SENTENCES_BY_UNIT } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import {
  CurriculumSubTab,
  LevelId,
  PersistedAppState,
  SeasonalTheme,
} from '../types/curriculum';
import { playJapaneseChime, speakJapaneseSentence } from '../utils/audio';
import {
  calculateStudyStreak,
  getDueReviewQueue,
  getLeechAndDifficultSentences,
  getLocalDateString,
  getWeeklyGoalStats,
} from '../utils/srs';
import { FuriganaText, HighlightedJapaneseText } from './FuriganaText';
import {
  HankoSeal,
  SEASONAL_THEMES,
  ShojiCornerFrames,
  TategakiRail,
  WagaraPattern,
} from './JapaneseMotifs';
import { StudyLaunchConfig } from './StudyView';

interface HomeViewProps {
  appState: PersistedAppState;
  onStartStudy: (config: StudyLaunchConfig) => void;
  onGuidedLesson: (unitId?:string)=>void;
  onSelectLevel: (level: LevelId) => void;
  onSelectSeasonalTheme?: (season: SeasonalTheme) => void;
  onNavigateToCurriculum: (subTab?: CurriculumSubTab, dialogueUnitId?: string) => void;
  onOpenUnitGrammar: (unitId: string) => void;
  onNavigateToLibrary: (favoritesOnly?: boolean) => void;
  onSaveOmikujiDraw?: (proverbId: string, dateStr: string) => void;
}

const KYOTO_HERO_IMAGE = '/bunshou/src/assets/images/kyoto_study_pavilion_hero_1794960349061.jpg';

export const HomeView: React.FC<HomeViewProps> = ({
  appState,
  onStartStudy,
  onGuidedLesson,
  onSelectLevel,
  onSelectSeasonalTheme,
  onNavigateToCurriculum,
  onOpenUnitGrammar,
  onNavigateToLibrary,
  onSaveOmikujiDraw,
}) => {
  const todayStr = getLocalDateString();
  const [heroImgError, setHeroImgError] = useState(false);

  // Daily Omikuji & Japanese Proverb Slip state
  const initialProverbIndex = useMemo(() => {
    if (appState.lastOmikujiId) {
      const idx = OMIKUJI_PROVERBS.findIndex((p) => p.id === appState.lastOmikujiId);
      if (idx >= 0) return idx;
    }
    // Deterministic daily default based on date string
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash * 31 + todayStr.charCodeAt(i)) % OMIKUJI_PROVERBS.length;
    }
    return Math.abs(hash) % OMIKUJI_PROVERBS.length;
  }, [appState.lastOmikujiId, todayStr]);

  const [omikujiIndex, setOmikujiIndex] = useState<number>(initialProverbIndex);
  const [omikujiDrawnAnimation, setOmikujiDrawnAnimation] = useState<boolean>(false);

  useEffect(() => {
    setOmikujiIndex(initialProverbIndex);
  }, [initialProverbIndex]);

  const activeOmikuji: OmikujiProverbItem =
    OMIKUJI_PROVERBS[omikujiIndex] || OMIKUJI_PROVERBS[0];

  const handleDrawNewOmikuji = () => {
    playJapaneseChime('omikuji', appState.settings.soundEffectsEnabled);
    const nextIdx = (omikujiIndex + 1) % OMIKUJI_PROVERBS.length;
    setOmikujiIndex(nextIdx);
    setOmikujiDrawnAnimation(true);
    window.setTimeout(() => setOmikujiDrawnAnimation(false), 300);
    const nextProverb = OMIKUJI_PROVERBS[nextIdx];
    if (nextProverb && onSaveOmikujiDraw) {
      onSaveOmikujiDraw(nextProverb.id, todayStr);
    }
  };

  const handleSpeakProverb = (text: string) => {
    speakJapaneseSentence(
      text,
      appState.settings.audioSpeed,
      undefined,
      undefined,
      undefined,
      appState.settings.preferredVoiceURI
    );
  };

  const dueQueue = useMemo(
    () => getDueReviewQueue(ALL_SENTENCES, appState.records, todayStr),
    [appState.records, todayStr]
  );

  const leechSentences = useMemo(
    () => getLeechAndDifficultSentences(ALL_SENTENCES, appState.records, todayStr),
    [appState.records, todayStr]
  );

  const totalStudied = Object.keys(appState.records).length;
  const totalUnseen = ALL_SENTENCES.length - totalStudied;

  const a11Sentences = useMemo(() => ALL_SENTENCES.filter((s) => s.level === 'A1.1'), []);
  const a12Sentences = useMemo(() => ALL_SENTENCES.filter((s) => s.level === 'A1.2'), []);

  const a11StudiedCount = useMemo(
    () => a11Sentences.filter((s) => Boolean(appState.records[s.id])).length,
    [a11Sentences, appState.records]
  );
  const a12StudiedCount = useMemo(
    () => a12Sentences.filter((s) => Boolean(appState.records[s.id])).length,
    [a12Sentences, appState.records]
  );

  const todayLog = appState.dailyLogs[todayStr] || {
    date: todayStr,
    newStudiedCount: 0,
    reviewsCompletedCount: 0,
    practiceCount: 0,
    grades: { again: 0, hard: 0, good: 0, easy: 0 },
  };

  const streakDays = useMemo(
    () => calculateStudyStreak(appState.dailyLogs, todayStr),
    [appState.dailyLogs, todayStr]
  );

  const weeklyGoal = useMemo(
    () =>
      getWeeklyGoalStats(
        appState.dailyLogs,
        appState.settings.weeklyDaysTarget || 5,
        todayStr
      ),
    [appState.dailyLogs, appState.settings.weeklyDaysTarget, todayStr]
  );

  // Determine the recommended curriculum unit for the current level
  const recommendedUnit = useMemo(() => {
    const unitsForLevel = CURRICULUM_UNITS.filter(
      (u) => u.level === appState.settings.selectedLevel
    );
    for (const u of unitsForLevel) {
      const unitSentences = SENTENCES_BY_UNIT[u.id] || [];
      const hasUnseen = unitSentences.some((s) => !appState.records[s.id]);
      if (hasUnseen) return u;
    }
    return unitsForLevel[0] || CURRICULUM_UNITS[0];
  }, [appState.settings.selectedLevel, appState.records]);

  const [selectedPathUnitId, setSelectedPathUnitId] = useState<string>(recommendedUnit.id);

  useEffect(() => {
    setSelectedPathUnitId(recommendedUnit.id);
  }, [recommendedUnit.id]);

  const activeUnit = useMemo(
    () => CURRICULUM_UNITS.find((u) => u.id === selectedPathUnitId) || recommendedUnit,
    [selectedPathUnitId, recommendedUnit]
  );

  const activeUnitSentences = SENTENCES_BY_UNIT[activeUnit.id] || [];
  const activeUnitStudied = activeUnitSentences.filter(
    (s) => Boolean(appState.records[s.id])
  ).length;
  const activeUnitUnseen = activeUnitSentences.length - activeUnitStudied;

  const activeGrammarLesson = useMemo(
    () => GRAMMAR_HANDBOOK.find((g) => g.unitId === activeUnit.id),
    [activeUnit.id]
  );

  const activeDialogue = useMemo(
    () => UNIT_DIALOGUES.find((d) => d.unitId === activeUnit.id),
    [activeUnit.id]
  );

  const isActiveDialogueDone = (appState.completedDialogues || []).includes(activeUnit.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 md:py-10 pb-24 md:pb-16 space-y-8">
      <section className="rounded-xl border border-[#DFD6C7] dark:border-slate-700 bg-[#FCFBF7] dark:bg-[#141923] p-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold">Learn a unit step by step</h2><p className="text-sm">Grammar, context, listening and active Japanese production.</p></div>
        <button type="button" className="rounded-lg bg-[#C83E2B] text-white px-4 py-2 font-semibold" onClick={()=>onGuidedLesson(recommendedUnit.id)}>Start guided lesson</button>
      </section>
      {/* SECTION 1: KYOTO STUDY PAVILION HERO & SHOJI TELEMETRY WINDOW */}
      <section
        aria-label="Daily study overview and telemetry"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        {/* Left Column: Primary Daily Study Sanctuary with Ukiyo-e Woodblock Banner */}
        <div className="lg:col-span-7 relative overflow-hidden bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-xs">
          <WagaraPattern pattern="seigaiha" opacity={0.045} className="text-stone-900 dark:text-slate-200" />
          <ShojiCornerFrames />

          {/* Top Ukiyo-e Woodblock Art Header Strip */}
          <div className="relative h-40 sm:h-44 w-full overflow-hidden border-b border-[#DFD6C7] dark:border-slate-800 bg-stone-900">
            {!heroImgError ? (
              <img
                src={KYOTO_HERO_IMAGE}
                alt="Traditional Japanese Kyoto wooden study pavilion overlooking cherry blossoms and Mount Fuji at sunset"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#2B1B17] via-[#4A2520] to-[#1E3A5F] flex items-center justify-center">
                <span lang="ja" className="font-jp-serif text-3xl text-amber-100/80">
                  京都・文章道場
                </span>
              </div>
            )}

            {/* Measured Contrast Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />

            {/* Overlay Kicker & Carved Vermilion Hanko Seal */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:px-7 flex items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-200 font-semibold drop-shadow-xs">
                  <span>CEFR A1.1 – A1.2 Japanese Sentence Sanctuary</span>
                  <span aria-hidden="true">·</span>
                  <span lang="ja" className="font-jp-serif tracking-wider">
                    京都和紙・文章道場
                  </span>
                </div>
                <div
                  lang="ja"
                  className="mt-1 font-jp-serif text-xs sm:text-sm text-stone-100 tracking-wider drop-shadow-xs"
                >
                  「日日是好日」 — Every day is a fine day for Japanese study
                </div>
              </div>

              <HankoSeal
                text="文章"
                subText="道場"
                size="md"
                shape="square"
                variant="vermilion"
              />
            </div>

            {/* Top-Right Four-Seasons (四季) Atmosphere Switcher */}
            {onSelectSeasonalTheme && (
              <div
                aria-label="Japanese Seasonal Atmosphere"
                className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 p-1 rounded-xl bg-black/55 backdrop-blur-xs border border-white/15"
              >
                {SEASONAL_THEMES.map((s) => {
                  const isActive =
                    (appState.settings.seasonalTheme || 'classic') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      title={`${s.label} (${s.subLabel})`}
                      onClick={() => onSelectSeasonalTheme(s.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-jp-serif font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#C83E2B] text-white shadow-xs'
                          : 'text-stone-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {s.kanji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Callout Body */}
          <div className="relative z-10 p-6 sm:p-7 flex-1 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                      本日の修練 · Today’s Immersion
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>Unit {activeUnit.unitNumber}: {activeUnit.title}</span>
                  </div>

                  {appState.favorites.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onNavigateToLibrary(true)}
                      className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-slate-300 hover:text-[#C83E2B] dark:hover:text-rose-400 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#C83E2B] dark:text-rose-400" />
                      <span>{appState.favorites.length} Saved</span>
                    </button>
                  )}
                </div>

                <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white balance">
                  {dueQueue.length > 0
                    ? `You have ${dueQueue.length} ${
                        dueQueue.length === 1 ? 'sentence' : 'sentences'
                      } due for review today.`
                    : `Ready for your next ${appState.settings.dailyNewTarget} Japanese sentences.`}
                </h1>

                <p className="mt-2 text-sm text-stone-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  Read authentic Japanese sentences printed on warm <em>washi</em> cards, inspect
                  vermilion-highlighted particles on the card back, and earn your <em>Goshuinchō</em>{' '}
                  temple mastery seals.
                </p>
              </div>

              <TategakiRail text="一期一会・言霊" seal="道" />
            </div>

            <div className="mt-6 pt-5 border-t border-[#E6DEC8] dark:border-slate-800/80 flex flex-wrap items-center gap-3">
              {dueQueue.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => onStartStudy({ mode: 'daily_review' })}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#C83E2B] hover:bg-[#B03221] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Start Daily Review ({dueQueue.length} Due)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        mode: 'learn_new',
                        level: activeUnit.level,
                        unitId: activeUnit.id,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-900 dark:text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Learn {appState.settings.dailyNewTarget} New Sentences</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        mode: 'learn_new',
                        level: activeUnit.level,
                        unitId: activeUnit.id,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#C83E2B] hover:bg-[#B03221] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Play className="w-4 h-4" />
                    <span>
                      Learn {appState.settings.dailyNewTarget} New Sentences (Unit{' '}
                      {activeUnit.unitNumber})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartStudy({ mode: 'free_practice' })}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-900 dark:text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Free Practice</span>
                  </button>
                </>
              )}

              {leechSentences.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onStartStudy({
                      mode: 'free_practice',
                      practiceFormat: 'particle_cloze',
                      customSet: leechSentences,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Remedial Leech Drill ({leechSentences.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Shōji Lattice 2x2 Telemetry Panel + Daily Omikuji Fortune Slip */}
        <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
          {/* Shōji Lattice 2x2 Telemetry Grid */}
          <div
            aria-label="Study metrics summary"
            className="relative overflow-hidden bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-5 grid grid-cols-2 gap-3.5 shadow-xs"
          >
            <WagaraPattern pattern="asanoha" opacity={0.035} className="text-stone-900 dark:text-slate-200" />

            <div className="relative z-10 p-3.5 rounded-xl bg-[#F6F1E6]/90 dark:bg-slate-900/90 border border-[#E2D9C5] dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>Reviews Due</span>
                <span lang="ja" className="font-jp-serif text-[11px] text-[#C83E2B] dark:text-rose-400">
                  復習
                </span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
                {dueQueue.length}
              </div>
              <div className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400 font-mono-tabular">
                {todayLog.reviewsCompletedCount} reviewed today
              </div>
            </div>

            <div className="relative z-10 p-3.5 rounded-xl bg-[#F6F1E6]/90 dark:bg-slate-900/90 border border-[#E2D9C5] dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>New Today</span>
                <span lang="ja" className="font-jp-serif text-[11px] text-[#C83E2B] dark:text-rose-400">
                  新規
                </span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
                {todayLog.newStudiedCount} / {appState.settings.dailyNewTarget}
              </div>
              <div className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400 font-mono-tabular">
                {totalUnseen} unseen left
              </div>
            </div>

            <div className="relative z-10 p-3.5 rounded-xl bg-[#F6F1E6]/90 dark:bg-slate-900/90 border border-[#E2D9C5] dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>Total Learned</span>
                <span lang="ja" className="font-jp-serif text-[11px] text-[#C83E2B] dark:text-rose-400">
                  習得
                </span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
                {totalStudied} / {ALL_SENTENCES.length}
              </div>
              <div className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400 font-mono-tabular whitespace-nowrap">
                A1.1: {a11StudiedCount}/{a11Sentences.length} · A1.2: {a12StudiedCount}/{a12Sentences.length}
              </div>
            </div>

            <div className="relative z-10 p-3.5 rounded-xl bg-[#F6F1E6]/90 dark:bg-slate-900/90 border border-[#E2D9C5] dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>Weekly Goal</span>
                <span className="font-mono-tabular font-semibold text-[#C83E2B] dark:text-rose-400">
                  {streakDays}d 連続
                </span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
                {weeklyGoal.activeDaysCount} / {weeklyGoal.weeklyDaysTarget}d
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                {weeklyGoal.days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date} (${d.shortLabel}): ${d.totalActions} cards studied`}
                    className={`h-1.5 flex-1 rounded-full ${
                      d.active
                        ? 'bg-[#C83E2B] dark:bg-rose-500'
                        : 'bg-[#DFD6C7] dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Daily Omikuji (おみくじ) & Kotowaza Proverb Slip */}
          <div
            data-testid="daily-omikuji-card"
            className={`relative overflow-hidden bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-transform duration-200 ${
              omikujiDrawnAnimation ? 'scale-[0.99]' : 'scale-100'
            }`}
          >
            <WagaraPattern pattern="shippou" opacity={0.04} className="text-[#C83E2B] dark:text-rose-400" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6DEC8] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HankoSeal
                    text={activeOmikuji.blessing}
                    size="sm"
                    shape="square"
                    variant="vermilion"
                    animated={omikujiDrawnAnimation}
                  />
                  <div>
                    <div className="text-[11px] font-semibold text-[#C83E2B] dark:text-rose-400">
                      本日のおみくじ・ことわざ · Daily Omikuji & Proverb
                    </div>
                    <div className="text-xs font-bold text-stone-800 dark:text-slate-200">
                      {activeOmikuji.blessing} ({activeOmikuji.blessingRomaji} —{' '}
                      {activeOmikuji.blessingEnglish})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSpeakProverb(activeOmikuji.japanese)}
                    aria-label={`Pronounce proverb ${activeOmikuji.japanese}`}
                    className="p-2 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#C83E2B] hover:text-white text-stone-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDrawNewOmikuji}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>おみくじを引く (Draw)</span>
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div
                  lang="ja"
                  className="font-jp-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white tracking-wide"
                >
                  <FuriganaText
                    segments={activeOmikuji.segments}
                    showFurigana={true}
                    highlightParticles={true}
                  />
                </div>
                <div className="mt-1 text-xs font-semibold text-stone-800 dark:text-slate-200">
                  “{activeOmikuji.literalEnglish}”
                </div>
                <p className="mt-1 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                  {activeOmikuji.meaning} {activeOmikuji.culturalNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: GUIDED 3-STEP UNIT LEARNING PATH (修行の三段道) */}
      <section
        aria-label="Guided 3-step unit learning path"
        className="relative overflow-hidden bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs"
      >
        <WagaraPattern pattern="asanoha" opacity={0.03} className="text-stone-900 dark:text-slate-200" />

        {/* Path Header with Level Switcher & Unit Selector */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6DEC8] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
              <span className="font-semibold text-[#C83E2B] dark:text-rose-400">
                修行の三段道 · Guided 3-Step Unit Path
              </span>
              <span aria-hidden="true">·</span>
              <span>壱. Grammar Guide → 弐. 31 Unit Sentences → 参. Situational Story</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
              Unit {activeUnit.unitNumber}: {activeUnit.title}{' '}
              <span className="font-jp-serif text-base font-normal text-stone-600 dark:text-slate-400 ml-1">
                ({activeUnit.japaneseSubtitle})
              </span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-slate-400">
              {activeUnit.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Level Switcher */}
            <div className="inline-flex items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl">
              {(['A1.1', 'A1.2'] as LevelId[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onSelectLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    appState.settings.selectedLevel === lvl
                      ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Unit Selector Dropdown */}
            <select
              aria-label="Select curriculum unit for guided path"
              value={activeUnit.id}
              onChange={(e) => setSelectedPathUnitId(e.target.value)}
              className="bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 text-stone-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer"
            >
              {CURRICULUM_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.level} · Unit {String(u.unitNumber).padStart(2, '0')}: {u.title} ({u.japaneseSubtitle})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Sequential Learning Step Cards */}
        <div className="relative z-10 mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* STEP 1: READ GRAMMAR GUIDE (壱) */}
          <div className="p-5 rounded-xl bg-[#F6F1E6]/85 dark:bg-slate-900/80 border border-[#E2D9C5] dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-mono-tabular font-bold text-[#C83E2B] dark:text-rose-400">
                  <span
                    lang="ja"
                    className="w-5 h-5 rounded-xs border border-[#C83E2B] dark:border-rose-400 flex items-center justify-center font-jp-serif text-[11px]"
                  >
                    壱
                  </span>
                  <span>STEP 1 · 文法 GRAMMAR</span>
                </span>
                <FileText className="w-4 h-4 text-stone-400 dark:text-slate-500" />
              </div>

              <h3 className="mt-2.5 font-display text-base font-bold text-stone-900 dark:text-white">
                {activeGrammarLesson ? activeGrammarLesson.title : activeUnit.title}
              </h3>

              <div className="mt-2.5 p-2.5 rounded-lg bg-[#FCFBF7] dark:bg-[#141923] border border-[#E2D9C5] dark:border-slate-800 text-xs">
                <HighlightedJapaneseText
                  text={
                    activeGrammarLesson
                      ? activeGrammarLesson.patternFormula
                      : activeUnit.grammarFocus.join(' · ')
                  }
                  className="font-semibold text-stone-900 dark:text-slate-100"
                />
              </div>

              <p className="mt-2.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                {activeGrammarLesson
                  ? activeGrammarLesson.coreExplanation
                  : activeUnit.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2D9C5] dark:border-slate-800">
              <button
                type="button"
                onClick={() => onOpenUnitGrammar(activeUnit.id)}
                className="w-full inline-flex items-center justify-between px-3.5 py-2 bg-[#FCFBF7] dark:bg-slate-800 hover:border-[#C83E2B] border border-[#DFD6C7] dark:border-slate-700 text-stone-900 dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <span>1. Read Unit {activeUnit.unitNumber} Grammar Guide</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C83E2B] dark:text-rose-400" />
              </button>
            </div>
          </div>

          {/* STEP 2: TRAIN 31 SENTENCES (弐) */}
          <div className="p-5 rounded-xl bg-[#F6F1E6]/85 dark:bg-slate-900/80 border border-[#E2D9C5] dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#C83E2B] dark:text-rose-400">
                  <span
                    lang="ja"
                    className="w-5 h-5 rounded-xs border border-[#C83E2B] dark:border-rose-400 flex items-center justify-center font-jp-serif text-[11px]"
                  >
                    弐
                  </span>
                  <span>STEP 2 · 文章 SENTENCES</span>
                </span>
                <span className="text-stone-600 dark:text-slate-400">
                  {activeUnitStudied} / {activeUnitSentences.length} studied
                </span>
              </div>

              <h3 className="mt-2.5 font-display text-base font-bold text-stone-900 dark:text-white">
                Practice {activeUnitSentences.length} Contextual Sentences
              </h3>

              <div className="mt-3 w-full h-2 bg-[#DFD6C7] dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C83E2B] transition-transform duration-200 origin-left"
                  style={{
                    transform: `scaleX(${
                      activeUnitSentences.length > 0
                        ? activeUnitStudied / activeUnitSentences.length
                        : 0
                    })`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {activeUnitUnseen > 0
                  ? `${activeUnitUnseen} unseen sentences remaining in Unit ${activeUnit.unitNumber}. Flip washi cards to inspect vermilion particle seals.`
                  : `All ${activeUnitSentences.length} sentences in Unit ${activeUnit.unitNumber} have been introduced! Practice freely or drill particles.`}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2D9C5] dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onStartStudy({
                    mode: activeUnitUnseen > 0 ? 'learn_new' : 'free_practice',
                    level: activeUnit.level,
                    unitId: activeUnit.id,
                  })
                }
                className="flex-1 inline-flex items-center justify-between px-3.5 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  2. {activeUnitUnseen > 0 ? `Study Unit ${activeUnit.unitNumber}` : 'Practice Unit'}
                </span>
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STEP 3: READ SITUATIONAL MINI-DIALOGUE (参) */}
          <div className="p-5 rounded-xl bg-[#F6F1E6]/85 dark:bg-slate-900/80 border border-[#E2D9C5] dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-mono-tabular font-bold text-[#C83E2B] dark:text-rose-400">
                  <span
                    lang="ja"
                    className="w-5 h-5 rounded-xs border border-[#C83E2B] dark:border-rose-400 flex items-center justify-center font-jp-serif text-[11px]"
                  >
                    参
                  </span>
                  <span>STEP 3 · 物語 STORY</span>
                </span>
                {isActiveDialogueDone ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                ) : (
                  <MessageSquare className="w-4 h-4 text-stone-400 dark:text-slate-500" />
                )}
              </div>

              <h3 className="mt-2.5 font-display text-base font-bold text-stone-900 dark:text-white">
                {activeDialogue ? activeDialogue.title : `Unit ${activeUnit.unitNumber} Dialogue`}
              </h3>

              {activeDialogue && (
                <div
                  lang="ja"
                  className="mt-1 font-jp-serif text-xs font-semibold text-stone-700 dark:text-slate-300"
                >
                  {activeDialogue.japaneseTitle}
                </div>
              )}

              <p className="mt-2 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                {activeDialogue
                  ? `Setting: ${activeDialogue.setting.replace(/\.$/, '')}. Read the 4-line Japanese conversation with full audio and answer the comprehension check.`
                  : 'Read the situational conversation for this unit with native audio.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2D9C5] dark:border-slate-800">
              <button
                type="button"
                onClick={() => onNavigateToCurriculum('dialogues', activeUnit.id)}
                className="w-full inline-flex items-center justify-between px-3.5 py-2 bg-[#FCFBF7] dark:bg-slate-800 hover:border-[#C83E2B] border border-[#DFD6C7] dark:border-slate-700 text-stone-900 dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  3. {isActiveDialogueDone ? 'Review Unit Story ✓' : 'Read Unit Story & Quiz'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C83E2B] dark:text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TARGETED SKILL DRILLS & SCRIPT REFERENCE (修練道場) */}
      <section aria-label="Targeted skill drills and script reference">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-4">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Targeted Skill Drills & Script Reference
            </h2>
            <span lang="ja" className="font-jp-serif text-sm text-[#C83E2B] dark:text-rose-400 font-semibold">
              技能修練・文字手引
            </span>
          </div>
          <span className="text-xs text-stone-500 dark:text-slate-400">
            Focused exercises for particles, word order, listening comprehension, and Genkō Yōshi kanji mastery
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() =>
              onStartStudy({
                mode: 'free_practice',
                practiceFormat: 'particle_cloze',
                level: appState.settings.selectedLevel,
              })
            }
            className="relative overflow-hidden text-left bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 hover:border-[#C83E2B] dark:hover:border-rose-500 rounded-xl p-5 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <WagaraPattern pattern="shippou" opacity={0.03} className="text-[#C83E2B]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-[#C83E2B] dark:text-rose-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span lang="ja" className="font-jp-serif text-xs font-bold text-[#C83E2B] dark:text-rose-400">
                  助詞道場
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                Particle Fill-in-the-Blank
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Master Japanese particles (は, が, を, に, で, と, から) with 4-choice cloze sentences.
              </p>
            </div>
            <div className="relative z-10 mt-4 pt-3 border-t border-[#E6DEC8] dark:border-slate-800/80 text-xs font-semibold text-[#C83E2B] dark:text-rose-400 flex items-center justify-between">
              <span>Launch Particle Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onStartStudy({
                mode: 'free_practice',
                practiceFormat: 'sentence_scramble',
                level: appState.settings.selectedLevel,
              })
            }
            className="relative overflow-hidden text-left bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 hover:border-[#C83E2B] dark:hover:border-rose-500 rounded-xl p-5 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <WagaraPattern pattern="asanoha" opacity={0.03} className="text-stone-700" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-800 dark:text-slate-200 flex items-center justify-center">
                  <Puzzle className="w-4 h-4" />
                </div>
                <span lang="ja" className="font-jp-serif text-xs font-bold text-stone-600 dark:text-slate-400">
                  語順構築
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                Sentence Scramble Builder
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Reconstruct complete Japanese sentences from shuffled phrase tiles to lock in syntax.
              </p>
            </div>
            <div className="relative z-10 mt-4 pt-3 border-t border-[#E6DEC8] dark:border-slate-800/80 text-xs font-semibold text-stone-800 dark:text-slate-200 flex items-center justify-between">
              <span>Launch Scramble Builder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onStartStudy({
                mode: 'free_practice',
                practiceFormat: 'listening_first',
                level: appState.settings.selectedLevel,
              })
            }
            className="relative overflow-hidden text-left bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 hover:border-[#C83E2B] dark:hover:border-rose-500 rounded-xl p-5 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <WagaraPattern pattern="seigaiha" opacity={0.035} className="text-sky-900" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-800 dark:text-slate-200 flex items-center justify-center">
                  <Ear className="w-4 h-4" />
                </div>
                <span lang="ja" className="font-jp-serif text-xs font-bold text-stone-600 dark:text-slate-400">
                  聴解修練
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                Listening-First Mode
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Hear the spoken Japanese sentence before seeing the kanji/kana script to train your
                ear.
              </p>
            </div>
            <div className="relative z-10 mt-4 pt-3 border-t border-[#E6DEC8] dark:border-slate-800/80 text-xs font-semibold text-stone-800 dark:text-slate-200 flex items-center justify-between">
              <span>Launch Listening Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToCurriculum('kana_kanji')}
            className="relative overflow-hidden text-left bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 hover:border-[#C83E2B] dark:hover:border-rose-500 rounded-xl p-5 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <WagaraPattern pattern="asanoha" opacity={0.035} className="text-amber-900" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#EFE9DC] dark:bg-slate-800 text-stone-800 dark:text-slate-200 flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <span lang="ja" className="font-jp-serif text-xs font-bold text-stone-600 dark:text-slate-400">
                  原稿用紙・漢字
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                Kana & A1 Kanji Grid
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                Interactive Hiragana, Katakana, and A1 Kanji reference on squared Genkō Yōshi paper.
              </p>
            </div>
            <div className="relative z-10 mt-4 pt-3 border-t border-[#E6DEC8] dark:border-slate-800/80 text-xs font-semibold text-stone-800 dark:text-slate-200 flex items-center justify-between">
              <span>Open Script & Kanji Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
