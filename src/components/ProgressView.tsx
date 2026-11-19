import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Edit3,
  Play,
  Save,
  Sparkles,
} from 'lucide-react';
import { UNIT_GOSHUIN_STAMPS } from '../data/japaneseCulture';
import { ALL_SENTENCES, SENTENCES_BY_UNIT } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import { LearnerSettings, PersistedAppState } from '../types/curriculum';
import {
  addDaysToDateString,
  calculateStudyStreak,
  classifyCardState,
  getDueReviewQueue,
  getLeechAndDifficultSentences,
  getLocalDateString,
  getMilestoneBadges,
  getThirtyDayForecast,
  getWeeklyGoalStats,
} from '../utils/srs';
import { FuriganaText } from './FuriganaText';
import { HankoSeal, ShojiCornerFrames, WagaraPattern } from './JapaneseMotifs';
import { StudyLaunchConfig } from './StudyView';

interface ProgressViewProps {
  appState: PersistedAppState;
  onStartStudy?: (config: StudyLaunchConfig) => void;
  onUpdateSettings?: (partial: Partial<LearnerSettings>) => void;
}

type ProgressTabId = 'overview' | 'forecast' | 'seals';

const GOSHUINCHO_HERO_IMAGE = '/bunshou/src/assets/images/goshuincho_temple_scroll_1794960348857.jpg';

export const ProgressView: React.FC<ProgressViewProps> = ({
  appState,
  onStartStudy,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<ProgressTabId>('overview');
  const [goshuinImgError, setGoshuinImgError] = useState(false);

  // Ema (絵馬) Wooden Wish Plaque Editor State
  const [isEditingEma, setIsEditingEma] = useState(false);
  const [emaDraft, setEmaDraft] = useState(
    appState.settings.emaWishText ||
      '毎日少しずつ、日本語の文章を楽しく学びます！ (Step by step every day, I will master Japanese sentences!)'
  );
  const [emaSavedToast, setEmaSavedToast] = useState(false);

  React.useEffect(() => {
    if (appState.settings.emaWishText) {
      setEmaDraft(appState.settings.emaWishText);
    }
  }, [appState.settings.emaWishText]);

  const todayStr = getLocalDateString();

  const handleSaveEmaWish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emaDraft.trim() || '日本語の達人になります！ (I will master Japanese!)';
    setEmaDraft(trimmed);
    setIsEditingEma(false);
    if (onUpdateSettings) {
      onUpdateSettings({ emaWishText: trimmed });
    }
    setEmaSavedToast(true);
    window.setTimeout(() => setEmaSavedToast(false), 1800);
  };

  const stats = useMemo(() => {
    let unseen = 0;
    let newToday = 0;
    let learning = 0;
    let due = 0;
    let progressing = 0;
    let difficult = 0;
    let mastered = 0;

    for (const s of ALL_SENTENCES) {
      const rec = appState.records[s.id];
      const st = classifyCardState(rec, todayStr);
      if (st === 'unseen') unseen++;
      else if (st === 'new_today') newToday++;
      else if (st === 'learning') learning++;
      else if (st === 'due') due++;
      else if (st === 'progressing') progressing++;
      else if (st === 'difficult') difficult++;
      else if (st === 'mastered') mastered++;
    }

    const studied = ALL_SENTENCES.length - unseen;
    const dueQueueCount = getDueReviewQueue(ALL_SENTENCES, appState.records, todayStr).length;

    let againTotal = 0;
    let hardTotal = 0;
    let goodTotal = 0;
    let easyTotal = 0;

    for (const log of Object.values(appState.dailyLogs)) {
      againTotal += log.grades.again;
      hardTotal += log.grades.hard;
      goodTotal += log.grades.good;
      easyTotal += log.grades.easy;
    }

    const totalGradedReviews = againTotal + hardTotal + goodTotal + easyTotal;
    const retentionRatePct =
      totalGradedReviews > 0
        ? Math.round(((goodTotal + easyTotal) / totalGradedReviews) * 100)
        : 100;

    return {
      studied,
      unseen,
      newToday,
      learning,
      due: dueQueueCount,
      progressing,
      difficult,
      mastered,
      againTotal,
      hardTotal,
      goodTotal,
      easyTotal,
      totalGradedReviews,
      retentionRatePct,
    };
  }, [appState.records, appState.dailyLogs, todayStr]);

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

  const milestoneBadges = useMemo(
    () => getMilestoneBadges(appState, ALL_SENTENCES, todayStr),
    [appState, todayStr]
  );

  const unlockedBadgesCount = milestoneBadges.filter((b) => b.unlocked).length;

  // 30-Day SRS Forecast Calendar
  const forecastDays = useMemo(
    () => getThirtyDayForecast(appState.records, todayStr),
    [appState.records, todayStr]
  );

  const maxForecastCount = Math.max(5, ...forecastDays.map((d) => d.dueCount));
  const totalUpcoming30Days = forecastDays.reduce((acc, d) => acc + d.dueCount, 0);

  // Leech & Difficult Sentences Clinic
  const leechSentences = useMemo(
    () => getLeechAndDifficultSentences(ALL_SENTENCES, appState.records, todayStr),
    [appState.records, todayStr]
  );

  // Build 14-day history in chronological order
  const recentDays = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const dateKey = addDaysToDateString(todayStr, -i);
      const log = appState.dailyLogs[dateKey];
      days.push({
        date: dateKey,
        shortDate: dateKey.slice(5), // MM-DD
        newStudied: log ? log.newStudiedCount : 0,
        reviews: log ? log.reviewsCompletedCount : 0,
        practice: log ? log.practiceCount : 0,
        total: log ? log.newStudiedCount + log.reviewsCompletedCount + log.practiceCount : 0,
      });
    }
    return days;
  }, [appState.dailyLogs, todayStr]);

  const maxDailyTotal = Math.max(10, ...recentDays.map((d) => d.total));

  const a11Sentences = useMemo(() => ALL_SENTENCES.filter((s) => s.level === 'A1.1'), []);
  const a12Sentences = useMemo(() => ALL_SENTENCES.filter((s) => s.level === 'A1.2'), []);

  const a11Studied = a11Sentences.filter((s) => Boolean(appState.records[s.id])).length;
  const a12Studied = a12Sentences.filter((s) => Boolean(appState.records[s.id])).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 md:py-10 pb-24 md:pb-16">
      {/* Page Title & 3-Tab Analytics Switcher */}
      <div className="flex flex-col gap-4 pb-6 border-b border-[#DFD6C7] dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs text-stone-500 dark:text-slate-400">
              <span>御朱印帳・修練記録</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>Spaced-Repetition Analytics, Ema Votive Plaque & Goshuinchō Stamp Book</span>
            </div>
            <h1 className="mt-1.5 font-display text-3xl font-bold text-stone-900 dark:text-white">
              Learning Progress & Goshuinchō (御朱印帳)
            </h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-slate-400 max-w-2xl">
              Inscribe your personal study vow on a wooden <em>Ema</em> plaque, inspect your 30-day
              review forecast, and collect vermilion temple stamps across all 20 units.
            </p>
          </div>

          {/* 3-Tab Switcher */}
          <div
            role="tablist"
            aria-label="Progress analytics sections"
            className="inline-flex flex-wrap sm:flex-nowrap items-center p-1 bg-[#EFE9DC] dark:bg-slate-800 rounded-xl self-start shrink-0 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Overview & Ema (絵馬)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'forecast'}
              onClick={() => setActiveTab('forecast')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'forecast'
                  ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>30-Day Forecast ({leechSentences.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'seals'}
              onClick={() => setActiveTab('seals')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'seals'
                  ? 'bg-[#FCFBF7] dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                Goshuinchō Book ({unlockedBadgesCount}/{milestoneBadges.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Primary 4-KPI Strip */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Unique Sentences Studied</span>
            <span lang="ja" className="font-jp-serif text-[#C83E2B] dark:text-rose-400">
              習得文
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
            {stats.studied} / {ALL_SENTENCES.length}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
            A1.1: {a11Studied}/{a11Sentences.length} · A1.2: {a12Studied}/{a12Sentences.length}
          </div>
        </div>

        <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>True Retention Accuracy</span>
            <span lang="ja" className="font-jp-serif text-emerald-700 dark:text-emerald-400">
              定着率
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
            {stats.totalGradedReviews > 0 ? `${stats.retentionRatePct}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
            {stats.goodTotal + stats.easyTotal} Good/Easy of {stats.totalGradedReviews} reviews
          </div>
        </div>

        <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Reviews Currently Due</span>
            <span lang="ja" className="font-jp-serif text-[#C83E2B] dark:text-rose-400">
              本日復習
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
            {stats.due}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
            Daily cap:{' '}
            {appState.settings.dailyReviewCap >= 999
              ? 'Unlimited'
              : appState.settings.dailyReviewCap}
          </div>
        </div>

        <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span>Consecutive Study Streak</span>
            <span lang="ja" className="font-jp-serif text-amber-700 dark:text-amber-400">
              連続日数
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-bold font-mono-tabular text-stone-900 dark:text-white">
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-slate-400 font-mono-tabular">
            {unlockedBadgesCount} / {milestoneBadges.length} seals unlocked
          </div>
        </div>
      </div>

      {/* TAB 1: WEEKLY GOAL, EMA WOODEN VOTIVE PLAQUE & RETENTION OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="mt-6 space-y-6">
          {/* Top Split: Weekly Goal Tracker + Traditional Pentagonal Ema (絵馬) Wooden Wish Plaque */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Weekly Goal Tracker Card */}
            <div className="lg:col-span-7 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#C83E2B] dark:text-rose-400" />
                      <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                        Weekly Study Goal Tracker (週間修練目標)
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                      Target: {weeklyGoal.weeklyDaysTarget} active study days per week ·{' '}
                      {weeklyGoal.weeklyNewCount} new sentences learned ·{' '}
                      {weeklyGoal.weeklyReviewsCount} SRS reviews completed this week.
                    </p>
                  </div>

                  <div className="font-mono-tabular text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900 text-stone-800 dark:text-slate-200 self-start">
                    {weeklyGoal.activeDaysCount} / {weeklyGoal.weeklyDaysTarget} Active Days{' '}
                    {weeklyGoal.goalMet ? '· Goal Met ✓' : ''}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2.5">
                  {weeklyGoal.days.map((slot) => (
                    <div
                      key={slot.date}
                      className={`p-3 rounded-xl border text-center font-mono-tabular ${
                        slot.active
                          ? 'border-[#C83E2B] bg-rose-50/50 dark:bg-rose-950/30 text-stone-900 dark:text-white'
                          : 'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6]/70 dark:bg-slate-900 text-stone-400 dark:text-slate-500'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">{slot.shortLabel}</div>
                      <div className="mt-1 text-sm font-bold">
                        {slot.active ? `${slot.totalActions}` : '—'}
                      </div>
                      <div className="text-[10px] mt-0.5">{slot.date.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E6DEC8] dark:border-slate-800 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>継続は力なり — Consistency compounds into fluency</span>
                <span className="font-mono-tabular font-semibold text-stone-800 dark:text-slate-200">
                  {streakDays}d active streak
                </span>
              </div>
            </div>

            {/* Traditional Wooden Ema (絵馬) Votive Wish Plaque */}
            <div
              data-testid="ema-wish-plaque"
              className="lg:col-span-5 relative overflow-hidden bg-gradient-to-b from-[#EFE3C8] to-[#E5D3AC] dark:from-[#261E17] dark:to-[#1C1611] border-2 border-[#C5A875] dark:border-amber-900/70 rounded-2xl p-6 flex flex-col justify-between shadow-xs"
            >
              {/* Red Kumihimo Hanging Cord & Knot at Top Center */}
              <div
                aria-hidden="true"
                className="flex flex-col items-center -mt-6 mb-2 select-none"
              >
                <div className="w-1.5 h-4 bg-[#C83E2B]" />
                <div className="w-4 h-4 rounded-full border-2 border-[#C83E2B] bg-[#FAF0DC] dark:bg-stone-900 shadow-xs" />
              </div>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      奉納絵馬 · Personal Study Vow Plaque
                    </div>
                    <h2 className="mt-0.5 font-display text-lg font-bold text-stone-900 dark:text-amber-50">
                      My Japanese Learning Wish (祈願)
                    </h2>
                  </div>

                  <HankoSeal text="祈願" subText="成就" size="sm" shape="square" variant="vermilion" />
                </div>

                {!isEditingEma ? (
                  <div className="mt-4 p-4 rounded-xl bg-[#FCF8EE]/90 dark:bg-stone-950/70 border border-[#D4BC8E] dark:border-amber-900/60">
                    <p
                      lang="ja"
                      className="font-jp-serif text-sm sm:text-base font-semibold text-stone-900 dark:text-amber-50 leading-relaxed"
                    >
                      “{appState.settings.emaWishText || emaDraft}”
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveEmaWish} className="mt-3 space-y-2.5">
                    <textarea
                      rows={3}
                      aria-label="Inscribe your personal study wish on the Ema plaque"
                      value={emaDraft}
                      onChange={(e) => setEmaDraft(e.target.value)}
                      maxLength={200}
                      className="w-full p-3 rounded-xl bg-[#FCF8EE] dark:bg-stone-950 border border-[#C5A875] dark:border-amber-800 text-xs sm:text-sm font-jp-serif text-stone-900 dark:text-amber-50"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmaDraft(appState.settings.emaWishText || emaDraft);
                          setIsEditingEma(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Inscribe on Ema</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#D4BC8E]/70 dark:border-amber-900/50 flex items-center justify-between text-xs">
                <span className="text-amber-950/80 dark:text-amber-200/80 font-jp-serif">
                  {emaSavedToast ? '奉納完了 · Wish inscribed!' : '京都・文章神社 奉納'}
                </span>
                {!isEditingEma && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEma(true)}
                    className="inline-flex items-center gap-1 font-semibold text-[#C83E2B] dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Wish</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Retention State Classification & Grade Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card Retention Stages */}
            <div className="lg:col-span-7 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Spaced-Repetition Retention Breakdown
              </h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                Sentences are classified by actual review intervals. A sentence is marked Mastered
                after at least 3 successful reviews and an interval of 14+ days.
              </p>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono-tabular">
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">Unseen</div>
                  <div className="mt-1 text-xl font-bold text-stone-900 dark:text-white">
                    {stats.unseen}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">New Today</div>
                  <div className="mt-1 text-xl font-bold text-sky-700 dark:text-sky-400">
                    {stats.newToday}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">Early Learning</div>
                  <div className="mt-1 text-xl font-bold text-stone-900 dark:text-white">
                    {stats.learning}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    Progressing (3d+)
                  </div>
                  <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {stats.progressing}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">Needs Practice</div>
                  <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
                    {stats.difficult}
                  </div>
                </div>
                <div className="p-3.5 bg-[#F6F1E6] dark:bg-slate-900 rounded-xl border border-[#E2D9C5] dark:border-slate-800">
                  <div className="text-xs text-stone-500 dark:text-slate-400">Mastered (14d+)</div>
                  <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {stats.mastered}
                  </div>
                </div>
              </div>
            </div>

            {/* Review Grade Distribution */}
            <div className="lg:col-span-5 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                  Hanko Grade Distribution (評価内訳)
                </h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  Self-evaluation responses recorded across all study sessions.
                </p>

                {stats.totalGradedReviews === 0 ? (
                  <div className="mt-8 py-8 text-center text-xs text-stone-400 dark:text-slate-500">
                    No graded reviews recorded yet. Grade flashcards in Study mode to see your
                    accuracy distribution.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3 font-mono-tabular">
                    {(
                      [
                        { label: '優 Easy', count: stats.easyTotal, color: 'bg-sky-600' },
                        { label: '良 Good', count: stats.goodTotal, color: 'bg-emerald-600' },
                        { label: '難 Hard', count: stats.hardTotal, color: 'bg-amber-600' },
                        { label: '再 Again', count: stats.againTotal, color: 'bg-[#C83E2B]' },
                      ] as const
                    ).map((row) => {
                      const pct =
                        stats.totalGradedReviews > 0
                          ? Math.round((row.count / stats.totalGradedReviews) * 100)
                          : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-stone-800 dark:text-slate-200">
                              {row.label}
                            </span>
                            <span className="text-stone-500 dark:text-slate-400">
                              {row.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#EFE9DC] dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${row.color} transition-transform duration-200 origin-left`}
                              style={{
                                transform: `scaleX(${
                                  stats.totalGradedReviews > 0
                                    ? row.count / stats.totalGradedReviews
                                    : 0
                                })`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6DEC8] dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400 flex items-center justify-between font-mono-tabular">
                <span>Total Reviews Logged</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {stats.totalGradedReviews}
                </span>
              </div>
            </div>
          </div>

          {/* 14-Day Activity Chart */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                  14-Day Study Activity
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Daily total of new sentences learned, SRS reviews completed, and free practice
                  cards.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-36 pt-4">
              {recentDays.map((day) => {
                const heightPct = Math.max(6, Math.round((day.total / maxDailyTotal) * 100));
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <div className="text-[11px] font-mono-tabular text-stone-500 dark:text-slate-400">
                      {day.total > 0 ? day.total : ''}
                    </div>
                    <div className="w-full bg-[#EFE9DC] dark:bg-slate-800 rounded-md h-24 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-md transition-all ${
                          day.total > 0
                            ? 'bg-[#C83E2B] dark:bg-rose-500'
                            : 'bg-[#DFD6C7]/60 dark:bg-slate-800'
                        }`}
                        style={{ height: `${day.total > 0 ? heightPct : 4}%` }}
                        title={`${day.date}: ${day.newStudied} new, ${day.reviews} reviews, ${day.practice} practice`}
                      />
                    </div>
                    <div className="text-[10px] font-mono-tabular text-stone-500 dark:text-slate-400">
                      {day.shortDate}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 30-DAY FORECAST & LEECH CLINIC */}
      {activeTab === 'forecast' && (
        <div className="mt-6 space-y-6">
          {/* 30-Day SRS Review Workload Forecast Calendar */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C83E2B] dark:text-rose-400" />
                  <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                    30-Day Spaced-Repetition Forecast
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  Projected daily review workload across the next 30 calendar days based on your
                  SM-2 intervals ({totalUpcoming30Days} total scheduled reviews).
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
              {forecastDays.map((day) => {
                const intensityPct =
                  day.dueCount > 0
                    ? Math.max(15, Math.round((day.dueCount / maxForecastCount) * 100))
                    : 0;
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.dueCount} reviews scheduled`}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between font-mono-tabular ${
                      day.dayOffset === 0
                        ? 'border-[#C83E2B] bg-rose-50/40 dark:bg-rose-950/30'
                        : 'border-[#E2D9C5] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900'
                    }`}
                  >
                    <div className="text-[10px] text-stone-500 dark:text-slate-400">
                      {day.dayOffset === 0 ? 'Today' : day.shortDate}
                    </div>
                    <div
                      className={`mt-1.5 text-sm font-bold ${
                        day.dueCount > 0
                          ? 'text-stone-900 dark:text-white'
                          : 'text-stone-400 dark:text-slate-600'
                      }`}
                    >
                      {day.dueCount}
                    </div>
                    <div className="mt-1.5 w-full h-1 bg-[#DFD6C7] dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C83E2B] dark:bg-rose-500"
                        style={{ width: `${intensityPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leech Detection & Remedial Clinic */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                    Leech & Difficult Sentence Clinic ({leechSentences.length})
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  Sentences with repeated lapses or low ease factors are automatically flagged here
                  for targeted particle and scramble remediation.
                </p>
              </div>

              {leechSentences.length > 0 && onStartStudy && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        mode: 'free_practice',
                        practiceFormat: 'particle_cloze',
                        customSet: leechSentences,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Remedial Particle Drill ({leechSentences.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        mode: 'free_practice',
                        practiceFormat: 'flashcard',
                        customSet: leechSentences,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Review as Flashcards</span>
                  </button>
                </div>
              )}
            </div>

            {leechSentences.length === 0 ? (
              <div className="mt-4 p-4 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#E2D9C5] dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400">
                No leech or high-lapse sentences detected right now. Keep grading honestly during
                your daily reviews—any sentence you miss repeatedly will appear here for targeted
                practice.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {leechSentences.slice(0, 8).map((item) => {
                  const rec = appState.records[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#E2D9C5] dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div
                          lang="ja"
                          className="text-base font-jp-serif font-semibold text-stone-900 dark:text-white"
                        >
                          <FuriganaText
                            segments={item.segments}
                            showFurigana={true}
                            highlightParticles={true}
                          />
                        </div>
                        <div className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                          {item.english}
                        </div>
                      </div>
                      <div className="text-right font-mono-tabular text-xs shrink-0">
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          {rec?.lapses || 0} lapses
                        </div>
                        <div className="text-stone-400 dark:text-slate-500">
                          Ease {rec?.easeFactor.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KYOTO GOSHUINCHŌ (御朱印帳) TEMPLE STAMP BOOK & HANKO SEALS */}
      {activeTab === 'seals' && (
        <div className="mt-6 space-y-6">
          {/* Goshuinchō Woodblock Banner Header */}
          <div className="relative overflow-hidden rounded-2xl border border-[#DFD6C7] dark:border-slate-800 bg-stone-900">
            <div className="h-40 sm:h-48 w-full relative overflow-hidden">
              {!goshuinImgError ? (
                <img
                  src={GOSHUINCHO_HERO_IMAGE}
                  alt="Traditional Kyoto Goshuincho accordion temple stamp book with calligraphy brush and vermilion seal"
                  referrerPolicy="no-referrer"
                  onError={() => setGoshuinImgError(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#2B1B17] via-[#3E241B] to-[#1C1815]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 tracking-wider">
                      京都・御朱印帳コレクション · KYOTO TEMPLE STAMP BOOK
                    </div>
                    <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
                      Bunshō Goshuinchō (文章御朱印帳)
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-stone-200 max-w-2xl">
                      In Japan, pilgrims collect hand-brushed calligraphy and vermilion ink stamps
                      in an accordion-fold <em>Goshuinchō</em>. Complete units and milestones to
                      fill all 20 pages of your stamp book.
                    </p>
                  </div>

                  <HankoSeal text="奉拝" subText="御朱印" size="lg" shape="square" variant="vermilion" />
                </div>
              </div>
            </div>
          </div>

          {/* 8 Milestone Hanko Seals */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C83E2B] dark:text-rose-400" />
                  <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                    Special Milestone Hanko Seals (特別印鑑 · {unlockedBadgesCount}/{milestoneBadges.length})
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  Commemorative seals awarded for streaks, dialogue completion, and level mastery.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {milestoneBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                    badge.unlocked
                      ? 'border-[#C83E2B]/80 bg-rose-50/35 dark:bg-rose-950/25'
                      : 'border-[#E2D9C5] dark:border-slate-800 bg-[#F6F1E6]/70 dark:bg-slate-900/60 opacity-75'
                  }`}
                >
                  <HankoSeal
                    text={badge.japaneseStamp}
                    size="md"
                    shape="circle"
                    variant={badge.unlocked ? 'vermilion' : 'muted'}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        {badge.title}
                      </div>
                      {badge.unlocked && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                          押印済
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-600 dark:text-slate-400 leading-relaxed">
                      {badge.description}
                    </p>
                    <div className="mt-2 text-[11px] font-mono-tabular font-semibold text-stone-500 dark:text-slate-400">
                      {badge.progressText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 20-Unit Accordion Goshuinchō (御朱印帳) Stamp Pages */}
          <div className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6DEC8] dark:border-slate-800">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                  20-Unit Goshuinchō Accordion Pages (二十課・御朱印帳)
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Each page represents one curriculum unit. Studying sentences ink-brushes the
                  calligraphy; completing the unit stamps the vermilion shrine seal.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CURRICULUM_UNITS.map((u) => {
                const unitItems = SENTENCES_BY_UNIT[u.id] || [];
                const studiedCount = unitItems.filter((s) =>
                  Boolean(appState.records[s.id])
                ).length;
                const masteredCount = unitItems.filter(
                  (s) => classifyCardState(appState.records[s.id], todayStr) === 'mastered'
                ).length;
                const pct =
                  unitItems.length > 0
                    ? Math.round((studiedCount / unitItems.length) * 100)
                    : 0;
                const isStarted = studiedCount > 0;
                const isCompleted = studiedCount === unitItems.length && unitItems.length > 0;

                const goshuin = UNIT_GOSHUIN_STAMPS[u.id] || {
                  unitId: u.id,
                  ordinalKanji: `第${u.unitNumber}番`,
                  calligraphyKanji: u.japaneseSubtitle.slice(0, 2),
                  shrineTitle: u.japaneseSubtitle,
                  sealStamp: '修練之印',
                };

                return (
                  <div
                    key={u.id}
                    className={`relative overflow-hidden rounded-xl border-2 p-4 flex flex-col justify-between min-h-[210px] transition-colors ${
                      isCompleted
                        ? 'border-[#B48327] bg-[#FDF9EE] dark:bg-[#1B1814] shadow-xs'
                        : isStarted
                        ? 'border-[#C83E2B]/60 bg-[#FAF6EC] dark:bg-[#161B26]'
                        : 'border-[#E2D9C5] dark:border-slate-800 bg-[#F6F1E6]/55 dark:bg-slate-900/50 opacity-80'
                    }`}
                  >
                    <WagaraPattern
                      pattern="seigaiha"
                      opacity={isCompleted ? 0.055 : 0.025}
                      className="text-amber-800 dark:text-amber-300"
                    />
                    <ShojiCornerFrames />

                    {/* Top Row: Ordinal & Vermilion Stamp */}
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div>
                        <span
                          lang="ja"
                          className="font-jp-serif text-xs font-bold text-stone-600 dark:text-slate-400"
                        >
                          {goshuin.ordinalKanji} · {u.level}
                        </span>
                        <div className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[140px]">
                          {u.title}
                        </div>
                      </div>

                      <HankoSeal
                        text={goshuin.sealStamp.slice(0, 2)}
                        subText={goshuin.sealStamp.slice(2, 4)}
                        size="sm"
                        shape="square"
                        variant={isCompleted ? 'vermilion' : isStarted ? 'gold' : 'muted'}
                      />
                    </div>

                    {/* Center: Grand Sumi Brush Calligraphy + Vermilion Shrine Seal */}
                    <div className="relative z-10 my-3 py-2 flex items-center justify-center">
                      {isStarted && (
                        <div
                          aria-hidden="true"
                          className="absolute w-14 h-14 rounded-full border-2 border-[#C83E2B]/35 dark:border-rose-500/35 rotate-[-8deg] flex items-center justify-center"
                        >
                          <span
                            lang="ja"
                            className="font-jp-serif text-[9px] font-bold text-[#C83E2B]/45 dark:text-rose-400/45"
                          >
                            {goshuin.shrineTitle}
                          </span>
                        </div>
                      )}
                      <div
                        lang="ja"
                        className={`relative font-jp-serif text-3xl font-extrabold tracking-widest select-none ${
                          isStarted
                            ? 'text-stone-900 dark:text-amber-50'
                            : 'text-stone-300 dark:text-slate-700'
                        }`}
                      >
                        {goshuin.calligraphyKanji}
                      </div>
                    </div>

                    {/* Bottom Row: Coverage & Quick Study */}
                    <div className="relative z-10 pt-2.5 border-t border-[#E6DEC8] dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-stone-600 dark:text-slate-400 mb-1.5">
                        <span>
                          {studiedCount}/{unitItems.length} studied
                        </span>
                        <span>{masteredCount} mastered</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E2D9C5] dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C83E2B] origin-left"
                          style={{ transform: `scaleX(${pct / 100})` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
