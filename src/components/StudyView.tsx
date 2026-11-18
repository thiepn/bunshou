import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Ear,
  Eye,
  FileText,
  HelpCircle,
  Keyboard,
  MessageSquare,
  Pause,
  Play,
  Puzzle,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { GRAMMAR_HANDBOOK } from '../data/referenceData';
import { ALL_SENTENCES, ALL_TOPICS } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import {
  DifficultyTier,
  FreePracticeFilters,
  FuriganaMode,
  LevelId,
  PersistedAppState,
  PracticeFormat,
  ReviewGrade,
  RubySegment,
  SentenceItem,
} from '../types/curriculum';
import { playJapaneseChime, speakJapaneseSentence } from '../utils/audio';
import {
  CharacterInspectorResult,
  ScrambleTile,
  analyzeSentenceBreakdown,
  generateParticleCloze,
  generateScrambleTiles,
  inspectTokenOrCharacter,
} from '../utils/linguistics';
import {
  classifyCardState,
  getDueReviewQueue,
  getGradeIntervalPreview,
  getLocalDateString,
  getNewSentenceQueue,
  isLeechRecord,
} from '../utils/srs';
import { CharacterPopover } from './CharacterPopover';
import { FuriganaText } from './FuriganaText';
import { HankoSeal, ShojiCornerFrames, WagaraPattern } from './JapaneseMotifs';
import { ShortcutModal } from './ShortcutModal';

export interface StudyLaunchConfig {
  mode: 'learn_new' | 'daily_review' | 'free_practice';
  practiceFormat?: PracticeFormat;
  unitId?: string;
  level?: LevelId;
  favoritesOnly?: boolean;
  customSet?: SentenceItem[];
}

interface StudyViewProps {
  appState: PersistedAppState;
  launchConfig: StudyLaunchConfig;
  onGradeCard: (sentenceId: string, grade: ReviewGrade, isNewCard: boolean) => void;
  onLogPracticeCard: () => void;
  onUndoLastGrade: () => void;
  canUndo: boolean;
  onToggleFavorite: (sentenceId: string) => void;
  onUpdateFuriganaMode: (mode: FuriganaMode) => void;
  onUpdateDailyTarget: (target: number) => void;
  onToggleSoundEffects?: (enabled: boolean) => void;
  onNavigateToCurriculum: () => void;
  onOpenUnitGrammar?: (unitId: string) => void;
  onOpenUnitStory?: (unitId: string) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({
  appState,
  launchConfig,
  onGradeCard,
  onLogPracticeCard,
  onUndoLastGrade,
  canUndo,
  onToggleFavorite,
  onUpdateFuriganaMode,
  onUpdateDailyTarget,
  onToggleSoundEffects,
  onNavigateToCurriculum,
  onOpenUnitGrammar,
  onOpenUnitStory,
}) => {
  const [studyMode, setStudyMode] = useState<'learn_new' | 'daily_review' | 'free_practice'>(
    launchConfig.mode
  );
  const [practiceFormat, setPracticeFormat] = useState<PracticeFormat>(
    launchConfig.practiceFormat || 'flashcard'
  );
  const [selectedLevel, setSelectedLevel] = useState<LevelId>(
    launchConfig.level || appState.settings.selectedLevel
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | 'ALL'>(
    launchConfig.unitId || 'ALL'
  );
  const [sessionLimit, setSessionLimit] = useState<number>(appState.settings.dailyNewTarget);
  const [customLimitInput, setCustomLimitInput] = useState<string>(
    String(appState.settings.dailyNewTarget)
  );
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Free practice filter state
  const [practiceFilters, setPracticeFilters] = useState<FreePracticeFilters>({
    level: launchConfig.level || 'ALL',
    unitId: launchConfig.unitId || 'ALL',
    difficulty: 'ALL',
    topic: 'ALL',
    favoritesOnly: Boolean(launchConfig.favoritesOnly),
    studyStatus: 'ALL',
  });

  // Single unified Study Options & Deck Filter Popover
  const [showOptionsPopover, setShowOptionsPopover] = useState<boolean>(false);

  // Active session queue of sentence IDs & undo history stack
  const [sessionQueueIds, setSessionQueueIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const sessionHistoryRef = useRef<
    Array<{ queueIds: string[]; index: number; completed: number }>
  >([]);

  // Card flip & furigana reveal state
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');
  const [hasRevealedOnce, setHasRevealedOnce] = useState<boolean>(false);
  const [demandFuriganaRevealed, setDemandFuriganaRevealed] = useState<boolean>(false);
  const [showBreakdownDrawer, setShowBreakdownDrawer] = useState<boolean>(
    appState.settings.autoExpandBreakdown
  );
  const [listeningScriptRevealed, setListeningScriptRevealed] = useState<boolean>(false);

  // Drill states (Particle Cloze & Sentence Scramble)
  const [selectedClozeOption, setSelectedClozeOption] = useState<string | null>(null);
  const [selectedScrambleTiles, setSelectedScrambleTiles] = useState<ScrambleTile[]>([]);

  // Inspector & Shortcut Modals
  const [inspectorData, setInspectorData] = useState<CharacterInspectorResult | null>(null);
  const [showShortcutModal, setShowShortcutModal] = useState<boolean>(false);

  // Pomodoro Focus Timer State
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break'>('focus');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState<number>(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState<boolean>(false);

  // Touch swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const todayStr = getLocalDateString();

  // Pomodoro countdown effect
  useEffect(() => {
    if (!pomodoroRunning) return;
    const interval = window.setInterval(() => {
      setPomodoroSecondsLeft((prev) => {
        if (prev <= 1) {
          const nextPhase = pomodoroPhase === 'focus' ? 'break' : 'focus';
          setPomodoroPhase(nextPhase);
          return nextPhase === 'focus' ? 25 * 60 : 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pomodoroRunning, pomodoroPhase]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const resetCardInteractiveStates = useCallback(() => {
    setCardFace('front');
    setHasRevealedOnce(false);
    setDemandFuriganaRevealed(false);
    setShowBreakdownDrawer(appState.settings.autoExpandBreakdown);
    setListeningScriptRevealed(false);
    setSelectedClozeOption(null);
    setSelectedScrambleTiles([]);
  }, [appState.settings.autoExpandBreakdown]);

  // Build initial queue when mode or launchConfig changes
  const buildQueue = useCallback(
    (
      mode: 'learn_new' | 'daily_review' | 'free_practice',
      level: LevelId,
      unitId: string | 'ALL',
      limit: number,
      filters: FreePracticeFilters,
      customSet?: SentenceItem[]
    ) => {
      if (customSet && customSet.length > 0 && mode === 'free_practice') {
        setSessionQueueIds(customSet.map((s) => s.id));
        setCurrentIndex(0);
        setCompletedCount(0);
        sessionHistoryRef.current = [];
        resetCardInteractiveStates();
        return;
      }

      if (mode === 'learn_new') {
        const queue = getNewSentenceQueue(
          ALL_SENTENCES,
          appState.records,
          limit,
          level,
          unitId !== 'ALL' ? unitId : undefined
        );
        setSessionQueueIds(queue.map((s) => s.id));
      } else if (mode === 'daily_review') {
        const due = getDueReviewQueue(
          ALL_SENTENCES,
          appState.records,
          todayStr,
          appState.settings.dailyReviewCap
        );
        setSessionQueueIds(due.map((s) => s.id));
      } else {
        // Free practice
        const filtered = ALL_SENTENCES.filter((s) => {
          if (filters.level !== 'ALL' && s.level !== filters.level) return false;
          if (filters.unitId !== 'ALL' && s.unitId !== filters.unitId) return false;
          if (filters.difficulty !== 'ALL' && s.difficulty !== filters.difficulty) return false;
          if (filters.topic !== 'ALL' && s.topic !== filters.topic) return false;
          if (filters.favoritesOnly && !appState.favorites.includes(s.id)) return false;
          if (filters.studyStatus !== 'ALL') {
            const rec = appState.records[s.id];
            const state = classifyCardState(rec, todayStr);
            if (filters.studyStatus === 'UNSEEN' && state !== 'unseen') return false;
            if (filters.studyStatus === 'STUDIED' && state === 'unseen') return false;
            if (filters.studyStatus === 'DIFFICULT' && state !== 'difficult') return false;
            if (filters.studyStatus === 'LEECH' && !isLeechRecord(rec)) return false;
          }
          return true;
        });
        setSessionQueueIds(filtered.map((s) => s.id));
      }

      setCurrentIndex(0);
      setCompletedCount(0);
      sessionHistoryRef.current = [];
      resetCardInteractiveStates();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayStr, appState.settings.dailyReviewCap]
  );

  // Sync with incoming launchConfig
  useEffect(() => {
    const nextMode = launchConfig.mode;
    const nextFormat = launchConfig.practiceFormat || 'flashcard';
    const nextLevel = launchConfig.level || appState.settings.selectedLevel;
    const nextUnit = launchConfig.unitId || 'ALL';
    const nextFilters: FreePracticeFilters = {
      level: launchConfig.level || 'ALL',
      unitId: launchConfig.unitId || 'ALL',
      difficulty: 'ALL',
      topic: 'ALL',
      favoritesOnly: Boolean(launchConfig.favoritesOnly),
      studyStatus: 'ALL',
    };

    setStudyMode(nextMode);
    setPracticeFormat(nextFormat);
    setSelectedLevel(nextLevel);
    setSelectedUnitId(nextUnit);
    setPracticeFilters(nextFilters);

    buildQueue(
      nextMode,
      nextLevel,
      nextUnit,
      sessionLimit,
      nextFilters,
      launchConfig.customSet
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchConfig]);

  const currentSentence: SentenceItem | undefined = useMemo(() => {
    const id = sessionQueueIds[currentIndex];
    if (!id) return undefined;
    return ALL_SENTENCES.find((s) => s.id === id);
  }, [sessionQueueIds, currentIndex]);

  const currentUnit = useMemo(() => {
    if (!currentSentence) return undefined;
    return CURRICULUM_UNITS.find((u) => u.id === currentSentence.unitId);
  }, [currentSentence]);

  const currentGrammarNote = useMemo(() => {
    if (!currentSentence) return undefined;
    return GRAMMAR_HANDBOOK.find((g) => g.unitId === currentSentence.unitId);
  }, [currentSentence]);

  const currentRecord = currentSentence ? appState.records[currentSentence.id] : undefined;
  const intervalPreviews = useMemo(
    () => getGradeIntervalPreview(currentRecord, todayStr),
    [currentRecord, todayStr]
  );

  const sentenceBreakdown = useMemo(
    () => (currentSentence ? analyzeSentenceBreakdown(currentSentence) : null),
    [currentSentence]
  );

  const clozeChallenge = useMemo(
    () => (currentSentence ? generateParticleCloze(currentSentence) : null),
    [currentSentence]
  );

  const scrambleChallenge = useMemo(
    () => (currentSentence ? generateScrambleTiles(currentSentence) : null),
    [currentSentence]
  );

  const isFavorite = currentSentence
    ? appState.favorites.includes(currentSentence.id)
    : false;

  const shouldShowFurigana =
    appState.settings.furiganaMode === 'always_on' ||
    (appState.settings.furiganaMode === 'reveal_on_demand' && demandFuriganaRevealed);

  const handlePlayAudio = useCallback(() => {
    if (!currentSentence) return;
    setAudioNotice(null);
    speakJapaneseSentence(
      currentSentence.japanese,
      appState.settings.audioSpeed,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      (err) => {
        setIsSpeaking(false);
        setAudioNotice(err);
      },
      appState.settings.preferredVoiceURI
    );
  }, [
    currentSentence,
    appState.settings.audioSpeed,
    appState.settings.preferredVoiceURI,
  ]);

  // Auto-play audio when a card front appears if setting is enabled OR in Listening-First mode
  useEffect(() => {
    if (
      currentSentence &&
      cardFace === 'front' &&
      !hasRevealedOnce &&
      (appState.settings.autoPlayAudio || practiceFormat === 'listening_first')
    ) {
      handlePlayAudio();
    }
  }, [
    currentSentence,
    cardFace,
    hasRevealedOnce,
    appState.settings.autoPlayAudio,
    practiceFormat,
    handlePlayAudio,
  ]);

  const handleRevealAnswer = useCallback(() => {
    playJapaneseChime('flip', appState.settings.soundEffectsEnabled);
    setCardFace('back');
    setHasRevealedOnce(true);
    setShowBreakdownDrawer(appState.settings.autoExpandBreakdown);
  }, [appState.settings.autoExpandBreakdown, appState.settings.soundEffectsEnabled]);

  const handleGrade = useCallback(
    (grade: ReviewGrade) => {
      if (!currentSentence) return;
      const isNew = !appState.records[currentSentence.id];
      const isLastCard =
        grade !== 'again' && currentIndex + 1 >= sessionQueueIds.length;

      if (isLastCard) {
        playJapaneseChime('complete', appState.settings.soundEffectsEnabled);
      } else if (grade === 'again') {
        playJapaneseChime('again', appState.settings.soundEffectsEnabled);
      } else {
        playJapaneseChime('good', appState.settings.soundEffectsEnabled);
      }

      onGradeCard(currentSentence.id, grade, isNew);

      sessionHistoryRef.current.push({
        queueIds: sessionQueueIds,
        index: currentIndex,
        completed: completedCount,
      });

      if (grade === 'again') {
        setSessionQueueIds((prev) => [...prev, currentSentence.id]);
      } else {
        setCompletedCount((c) => c + 1);
      }

      setCurrentIndex((idx) => idx + 1);
      resetCardInteractiveStates();
    },
    [
      currentSentence,
      appState.records,
      appState.settings.soundEffectsEnabled,
      currentIndex,
      completedCount,
      sessionQueueIds,
      onGradeCard,
      resetCardInteractiveStates,
    ]
  );

  const handlePracticeAdvance = useCallback(
    (requeue: boolean) => {
      if (!currentSentence) return;
      playJapaneseChime(
        requeue ? 'again' : 'good',
        appState.settings.soundEffectsEnabled
      );
      onLogPracticeCard();
      sessionHistoryRef.current.push({
        queueIds: sessionQueueIds,
        index: currentIndex,
        completed: completedCount,
      });
      if (requeue) {
        setSessionQueueIds((prev) => [...prev, currentSentence.id]);
      } else {
        setCompletedCount((c) => c + 1);
      }
      setCurrentIndex((idx) => idx + 1);
      resetCardInteractiveStates();
    },
    [
      currentSentence,
      appState.settings.soundEffectsEnabled,
      currentIndex,
      completedCount,
      sessionQueueIds,
      onLogPracticeCard,
      resetCardInteractiveStates,
    ]
  );

  const handleUndo = useCallback(() => {
    if (!canUndo || currentIndex === 0) return;
    onUndoLastGrade();
    const lastSnap = sessionHistoryRef.current.pop();
    if (lastSnap) {
      setSessionQueueIds(lastSnap.queueIds);
      setCurrentIndex(lastSnap.index);
      setCompletedCount(lastSnap.completed);
    } else {
      setCurrentIndex((idx) => Math.max(0, idx - 1));
      setCompletedCount((c) => Math.max(0, c - 1));
    }
    resetCardInteractiveStates();
  }, [canUndo, currentIndex, onUndoLastGrade, resetCardInteractiveStates]);

  const handleInspectSegment = useCallback(
    (seg: RubySegment) => {
      if (!currentSentence) return;
      const result = inspectTokenOrCharacter(seg.text, seg.reading, currentSentence.id);
      setInspectorData(result);
    },
    [currentSentence]
  );

  // Touch swipe handlers for mobile ergonomics
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 65) return;

    if (!hasRevealedOnce) {
      handleRevealAnswer();
      setSwipeHint('Revealed translation');
      window.setTimeout(() => setSwipeHint(null), 1200);
      return;
    }

    if (deltaX > 65) {
      if (studyMode === 'free_practice') {
        handlePracticeAdvance(false);
      } else {
        handleGrade('good');
      }
      setSwipeHint('Graded Good →');
      window.setTimeout(() => setSwipeHint(null), 1200);
    } else if (deltaX < -65) {
      if (studyMode === 'free_practice') {
        handlePracticeAdvance(true);
      } else {
        handleGrade('again');
      }
      setSwipeHint('← Graded Again');
      window.setTimeout(() => setSwipeHint(null), 1200);
    }
  };

  // Keyboard shortcuts for fast study workflow
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        setInspectorData(null);
        setShowShortcutModal(false);
        setShowOptionsPopover(false);
        return;
      }

      if (inspectorData !== null || showShortcutModal) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutModal((v) => !v);
        return;
      }

      if (!currentSentence) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!hasRevealedOnce) {
          handleRevealAnswer();
        } else if (studyMode === 'free_practice') {
          handlePracticeAdvance(false);
        } else {
          handleGrade('good');
        }
      } else if (e.key === '1' && hasRevealedOnce) {
        e.preventDefault();
        if (studyMode === 'free_practice') handlePracticeAdvance(true);
        else handleGrade('again');
      } else if (e.key === '2' && hasRevealedOnce) {
        e.preventDefault();
        if (studyMode === 'free_practice') handlePracticeAdvance(false);
        else handleGrade('hard');
      } else if (e.key === '3' && hasRevealedOnce && studyMode !== 'free_practice') {
        e.preventDefault();
        handleGrade('good');
      } else if (e.key === '4' && hasRevealedOnce && studyMode !== 'free_practice') {
        e.preventDefault();
        handleGrade('easy');
      } else if (e.key.toLowerCase() === 'g' && hasRevealedOnce) {
        e.preventDefault();
        setShowBreakdownDrawer((v) => !v);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handlePlayAudio();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (appState.settings.furiganaMode === 'reveal_on_demand') {
          setDemandFuriganaRevealed((v) => !v);
        }
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleFavorite(currentSentence.id);
      } else if (e.key.toLowerCase() === 'z' && canUndo && currentIndex > 0) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentSentence,
    hasRevealedOnce,
    studyMode,
    appState.settings.furiganaMode,
    canUndo,
    currentIndex,
    inspectorData,
    showShortcutModal,
    handleRevealAnswer,
    handleGrade,
    handlePracticeAdvance,
    handlePlayAudio,
    onToggleFavorite,
    handleUndo,
  ]);

  const switchStudyMode = (newMode: 'learn_new' | 'daily_review' | 'free_practice') => {
    setStudyMode(newMode);
    buildQueue(newMode, selectedLevel, selectedUnitId, sessionLimit, practiceFilters);
  };

  const applyPresetLimit = (preset: number) => {
    setSessionLimit(preset);
    setCustomLimitInput(String(preset));
    setShowCustomInput(false);
    onUpdateDailyTarget(preset);
    buildQueue(studyMode, selectedLevel, selectedUnitId, preset, practiceFilters);
  };

  const applyCustomLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Math.max(1, Math.min(100, parseInt(customLimitInput, 10) || 10));
    setSessionLimit(num);
    setShowCustomInput(false);
    onUpdateDailyTarget(num);
    buildQueue(studyMode, selectedLevel, selectedUnitId, num, practiceFilters);
  };

  const totalCardsInQueue = sessionQueueIds.length;
  const remainingCards = Math.max(0, totalCardsInQueue - currentIndex);
  const dueReviewsGlobalCount = useMemo(
    () => getDueReviewQueue(ALL_SENTENCES, appState.records, todayStr).length,
    [appState.records, todayStr]
  );

  // Scramble validation helpers
  const scrambleConstructedText = selectedScrambleTiles.map((t) => t.text).join('');
  const scrambleTargetText = scrambleChallenge
    ? scrambleChallenge.correctTiles.map((t) => t.text).join('')
    : '';
  const isScrambleComplete =
    scrambleChallenge &&
    selectedScrambleTiles.length === scrambleChallenge.correctTiles.length;
  const isScrambleCorrect = isScrambleComplete && scrambleConstructedText === scrambleTargetText;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 md:py-8 pb-24 md:pb-12">
      {/* SINGLE-ROW UNIFIED STUDY CONTROL BAR */}
      <div className="relative bg-white dark:bg-[#151A26] border border-stone-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Mode Selector */}
        <div
          role="tablist"
          aria-label="Study mode selector"
          className="inline-flex items-center p-1 bg-stone-100 dark:bg-slate-800/90 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={studyMode === 'learn_new'}
            onClick={() => switchStudyMode('learn_new')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studyMode === 'learn_new'
                ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Learn New
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studyMode === 'daily_review'}
            onClick={() => switchStudyMode('daily_review')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studyMode === 'daily_review'
                ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Review ({dueReviewsGlobalCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studyMode === 'free_practice'}
            onClick={() => switchStudyMode('free_practice')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studyMode === 'free_practice'
                ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Free Practice
          </button>
        </div>

        {/* Center: Practice Format Selector */}
        <div
          role="tablist"
          aria-label="Practice format selector"
          className="inline-flex items-center p-1 bg-stone-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto max-w-full"
        >
          {(
            [
              { id: 'flashcard', label: 'Flashcard', icon: BookOpen },
              { id: 'listening_first', label: 'Listening', icon: Ear },
              { id: 'particle_cloze', label: 'Particles', icon: HelpCircle },
              { id: 'sentence_scramble', label: 'Scramble', icon: Puzzle },
            ] as Array<{
              id: PracticeFormat;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }>
          ).map((fmt) => {
            const Icon = fmt.icon;
            const active = practiceFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPracticeFormat(fmt.id);
                  resetCardInteractiveStates();
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-stone-900 dark:bg-rose-600 text-white'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{fmt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Active Timer Indicator & Study Options Popover Trigger */}
        <div className="flex items-center gap-2">
          {pomodoroRunning && (
            <button
              type="button"
              onClick={() => setPomodoroRunning(false)}
              title="Click to pause Pomodoro timer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{formatTimer(pomodoroSecondsLeft)}</span>
            </button>
          )}

          <button
            type="button"
            aria-label="Study Options and Deck Filters"
            aria-expanded={showOptionsPopover}
            onClick={() => setShowOptionsPopover((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showOptionsPopover
                ? 'bg-stone-900 dark:bg-rose-600 text-white border-stone-900 dark:border-rose-600'
                : 'bg-stone-50 dark:bg-slate-900 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-800 hover:border-stone-400'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Study Options</span>
          </button>
        </div>

        {/* COLLAPSIBLE STUDY OPTIONS & DECK FILTER POPOVER */}
        {showOptionsPopover && (
          <div
            data-testid="study-options-popover"
            className="w-full mt-2 pt-3 border-t border-stone-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs"
          >
            {/* Column 1: Furigana & Pomodoro Ergonomics */}
            <div className="md:col-span-5 space-y-3">
              <div>
                <div className="font-semibold text-stone-800 dark:text-slate-200 mb-1.5">
                  Furigana Reading Aid
                </div>
                <div className="inline-flex items-center p-0.5 bg-stone-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'always_on', label: 'Always On' },
                      { id: 'reveal_on_demand', label: 'On Demand' },
                      { id: 'always_off', label: 'Always Off' },
                    ] as Array<{ id: FuriganaMode; label: string }>
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onUpdateFuriganaMode(m.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        appState.settings.furiganaMode === m.id
                          ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-lg font-mono-tabular">
                  <Timer className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-semibold text-stone-800 dark:text-slate-200">
                    {formatTimer(pomodoroSecondsLeft)}
                  </span>
                  <button
                    type="button"
                    aria-label={pomodoroRunning ? 'Pause study timer' : 'Start study timer'}
                    onClick={() => setPomodoroRunning((r) => !r)}
                    className="p-1 text-stone-700 dark:text-slate-200 hover:text-rose-600 cursor-pointer"
                  >
                    {pomodoroRunning ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Reset study timer"
                    onClick={() => {
                      setPomodoroRunning(false);
                      setPomodoroPhase('focus');
                      setPomodoroSecondsLeft(25 * 60);
                    }}
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowShortcutModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-lg font-medium cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Shortcuts (?)</span>
                </button>

                {onToggleSoundEffects && (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleSoundEffects(!appState.settings.soundEffectsEnabled)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      appState.settings.soundEffectsEnabled
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-[#C83E2B] dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    {appState.settings.soundEffectsEnabled ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    <span>
                      風鈴 Chimes: {appState.settings.soundEffectsEnabled ? 'On' : 'Off'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: Mode-Specific Deck Scope & Session Size */}
            <div className="md:col-span-7 space-y-3 border-t md:border-t-0 md:border-l border-stone-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
              {studyMode === 'learn_new' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                      <span>Level</span>
                      <select
                        value={selectedLevel}
                        onChange={(e) => {
                          const lvl = e.target.value as LevelId;
                          setSelectedLevel(lvl);
                          setSelectedUnitId('ALL');
                          buildQueue('learn_new', lvl, 'ALL', sessionLimit, practiceFilters);
                        }}
                        className="bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 font-semibold rounded-lg px-2.5 py-1.5 border border-stone-200 dark:border-slate-700"
                      >
                        <option value="A1.1">A1.1 — Absolute Beginner</option>
                        <option value="A1.2">A1.2 — Developing Beginner</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                      <span>Curriculum Unit</span>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => {
                          const uId = e.target.value;
                          setSelectedUnitId(uId);
                          buildQueue('learn_new', selectedLevel, uId, sessionLimit, practiceFilters);
                        }}
                        className="bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 font-semibold rounded-lg px-2.5 py-1.5 border border-stone-200 dark:border-slate-700"
                      >
                        <option value="ALL">Next Unseen in {selectedLevel}</option>
                        {CURRICULUM_UNITS.filter((u) => u.level === selectedLevel).map((u) => (
                          <option key={u.id} value={u.id}>
                            Unit {u.unitNumber}: {u.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-stone-500 dark:text-slate-400 mr-1">Session size:</span>
                    {[5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => applyPresetLimit(num)}
                        className={`px-2.5 py-1 font-mono-tabular font-semibold rounded-md transition-colors cursor-pointer ${
                          sessionLimit === num && !showCustomInput
                            ? 'bg-[#C83E2B] text-white'
                            : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCustomInput((v) => !v)}
                      className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                        showCustomInput || ![5, 10, 20].includes(sessionLimit)
                          ? 'bg-[#C83E2B] text-white'
                          : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                      }`}
                    >
                      Custom
                    </button>
                    {showCustomInput && (
                      <form onSubmit={applyCustomLimit} className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          aria-label="Custom session sentence count"
                          value={customLimitInput}
                          onChange={(e) => setCustomLimitInput(e.target.value)}
                          className="w-14 px-2 py-1 font-mono-tabular bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-md text-stone-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 font-semibold bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {studyMode === 'free_practice' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                    <span>Level</span>
                    <select
                      value={practiceFilters.level}
                      onChange={(e) => {
                        const updated: FreePracticeFilters = {
                          ...practiceFilters,
                          level: e.target.value as LevelId | 'ALL',
                          unitId: 'ALL',
                        };
                        setPracticeFilters(updated);
                        buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                      }}
                      className="bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-stone-900 dark:text-white"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="A1.1">A1.1 Only</option>
                      <option value="A1.2">A1.2 Only</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                    <span>Unit</span>
                    <select
                      value={practiceFilters.unitId}
                      onChange={(e) => {
                        const updated: FreePracticeFilters = {
                          ...practiceFilters,
                          unitId: e.target.value,
                        };
                        setPracticeFilters(updated);
                        buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                      }}
                      className="bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-stone-900 dark:text-white"
                    >
                      <option value="ALL">All Units</option>
                      {CURRICULUM_UNITS.filter(
                        (u) => practiceFilters.level === 'ALL' || u.level === practiceFilters.level
                      ).map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unitNumber}: {u.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                    <span>Status</span>
                    <select
                      value={practiceFilters.studyStatus}
                      onChange={(e) => {
                        const updated: FreePracticeFilters = {
                          ...practiceFilters,
                          studyStatus: e.target.value as FreePracticeFilters['studyStatus'],
                        };
                        setPracticeFilters(updated);
                        buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                      }}
                      className="bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-stone-900 dark:text-white"
                    >
                      <option value="ALL">All Cards</option>
                      <option value="STUDIED">Studied Only</option>
                      <option value="UNSEEN">Unseen Only</option>
                      <option value="DIFFICULT">Difficult Only</option>
                      <option value="LEECH">Leech Cards</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                    <span>Topic</span>
                    <select
                      value={practiceFilters.topic}
                      onChange={(e) => {
                        const updated: FreePracticeFilters = {
                          ...practiceFilters,
                          topic: e.target.value,
                        };
                        setPracticeFilters(updated);
                        buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                      }}
                      className="bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-stone-900 dark:text-white"
                    >
                      <option value="ALL">All Topics</option>
                      {ALL_TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 font-medium text-stone-600 dark:text-slate-400">
                    <span>Difficulty</span>
                    <select
                      value={practiceFilters.difficulty}
                      onChange={(e) => {
                        const updated: FreePracticeFilters = {
                          ...practiceFilters,
                          difficulty: e.target.value as DifficultyTier | 'ALL',
                        };
                        setPracticeFilters(updated);
                        buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                      }}
                      className="bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-stone-900 dark:text-white"
                    >
                      <option value="ALL">All Tiers</option>
                      <option value="foundational">Foundational</option>
                      <option value="developing">Developing</option>
                      <option value="confident">Confident</option>
                    </select>
                  </label>

                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-slate-200 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={practiceFilters.favoritesOnly}
                        onChange={(e) => {
                          const updated: FreePracticeFilters = {
                            ...practiceFilters,
                            favoritesOnly: e.target.checked,
                          };
                          setPracticeFilters(updated);
                          buildQueue('free_practice', selectedLevel, 'ALL', sessionLimit, updated);
                        }}
                        className="rounded border-stone-300 text-[#C83E2B] focus:ring-rose-500"
                      />
                      <span>Favorites ({appState.favorites.length})</span>
                    </label>
                  </div>
                </div>
              )}

              {studyMode === 'daily_review' && (
                <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 py-2">
                  <span>
                    Reviewing scheduled SRS queue ({dueReviewsGlobalCount} due today · Daily cap:{' '}
                    {appState.settings.dailyReviewCap})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOptionsPopover(false)}
                    className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3-STEP UNIT CONTEXT STEPPER & SESSION PROGRESS STRIP */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-2 font-mono-tabular">
          {currentSentence ? (
            <>
              <span className="font-semibold text-stone-900 dark:text-slate-100">
                Card {currentIndex + 1} / {totalCardsInQueue}
              </span>
              <span aria-hidden="true">·</span>
              <span>{remainingCards} left</span>
              {currentUnit && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans font-medium text-stone-700 dark:text-slate-300">
                    Unit {currentUnit.unitNumber}: {currentUnit.title} ({currentUnit.japaneseSubtitle})
                  </span>
                </>
              )}
            </>
          ) : (
            <span>Session Complete</span>
          )}
        </div>

        {/* 3-Step Unit Flow Quick Jump Links + Undo */}
        <div className="flex flex-wrap items-center gap-3">
          {swipeHint && (
            <span className="text-xs font-medium text-[#C83E2B] dark:text-rose-400">
              {swipeHint}
            </span>
          )}

          {currentUnit && onOpenUnitGrammar && (
            <button
              type="button"
              onClick={() => onOpenUnitGrammar(currentUnit.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-[#C83E2B] dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Step 1: Grammar Note</span>
            </button>
          )}

          {currentUnit && onOpenUnitStory && (
            <button
              type="button"
              onClick={() => onOpenUnitStory(currentUnit.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-[#C83E2B] dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Step 3: Unit Story</span>
            </button>
          )}

          {canUndo && currentIndex > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-slate-300 bg-[#EFE9DC] dark:bg-slate-800 rounded-md hover:bg-[#E5DEC9] dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalCardsInQueue > 0 && (
        <div className="mt-2 w-full h-1.5 bg-[#DFD6C7] dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C83E2B] transition-transform duration-200 origin-left"
            style={{
              transform: `scaleX(${Math.min(1, currentIndex / Math.max(1, totalCardsInQueue))})`,
            }}
          />
        </div>
      )}

      {/* Main Flashcard Stage or Completed / Empty State */}
      {currentSentence ? (
        <div className="mt-4">
          {/* THE KYOTO WASHI FLASHCARD */}
          <div
            data-testid="flashcard-surface"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative overflow-hidden min-h-[340px] sm:min-h-[380px] bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col justify-between transition-opacity duration-150"
          >
            <WagaraPattern
              pattern="asanoha"
              opacity={0.032}
              className="text-stone-900 dark:text-slate-200"
            />
            <ShojiCornerFrames />

            {/* Card Top Utility Row */}
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="text-xs text-stone-500 dark:text-slate-400 font-mono-tabular flex items-center gap-2">
                <HankoSeal
                  text={cardFace === 'front' ? '表' : '解'}
                  size="xs"
                  shape="square"
                  variant="vermilion"
                  animated={cardFace === 'back'}
                />
                <span className="font-jp-serif font-semibold text-stone-700 dark:text-slate-300">
                  {cardFace === 'front' ? '日本語・表面' : '英語訳・文構造'}
                </span>
                {isLeechRecord(currentRecord) && (
                  <>
                    <span>·</span>
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      Leech Focus ({currentRecord?.lapses} lapses)
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {cardFace === 'front' &&
                  appState.settings.furiganaMode === 'reveal_on_demand' && (
                    <button
                      type="button"
                      onClick={() => setDemandFuriganaRevealed((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-slate-200 bg-[#EFE9DC] dark:bg-stone-800 rounded-lg hover:bg-[#E5DEC9] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{demandFuriganaRevealed ? 'Hide Furigana' : 'Reveal Furigana'}</span>
                    </button>
                  )}

                {hasRevealedOnce && (
                  <button
                    type="button"
                    onClick={() => {
                      playJapaneseChime('flip', appState.settings.soundEffectsEnabled);
                      setCardFace((f) => (f === 'front' ? 'back' : 'front'));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-slate-200 bg-[#EFE9DC] dark:bg-stone-800 rounded-lg hover:bg-[#E5DEC9] dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{cardFace === 'back' ? 'Show Japanese' : 'Show English'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePlayAudio}
                  aria-label="Play Japanese sentence audio"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isSpeaking
                      ? 'bg-[#C83E2B] text-white'
                      : 'bg-[#EFE9DC] dark:bg-slate-800 text-stone-700 dark:text-slate-200 hover:bg-[#E5DEC9] dark:hover:bg-slate-700'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(currentSentence.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={isFavorite}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isFavorite
                      ? 'text-[#C83E2B] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50'
                      : 'text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-300 bg-[#EFE9DC] dark:bg-slate-800'
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Card Center Content — Adapts cleanly to Practice Format */}
            <div className="relative z-10 my-auto py-6 sm:py-8 flex flex-col items-center justify-center text-center">
              {cardFace === 'back' ? (
                /* BACK SIDE: English translation + Direct Color-Coded Word & Particle Chips */
                <div className="w-full max-w-2xl flex flex-col items-center">
                  <div
                    lang="en"
                    data-testid="card-back-english"
                    className="text-2xl sm:text-3xl font-display font-semibold text-stone-900 dark:text-slate-50 leading-snug balance"
                  >
                    {currentSentence.english}
                  </div>

                  {/* Reference Japanese with Particle Highlights & Click-to-Inspect */}
                  <div
                    lang="ja"
                    className="mt-3 font-jp-serif text-lg sm:text-xl font-bold text-stone-800 dark:text-slate-200"
                  >
                    <FuriganaText
                      segments={currentSentence.segments}
                      showFurigana={true}
                      highlightParticles={true}
                      onSelectSegment={handleInspectSegment}
                    />
                  </div>

                  {/* Direct Card-Back Color-Coded Word & Particle Breakdown Chips */}
                  {showBreakdownDrawer && sentenceBreakdown && (
                    <div
                      data-testid="card-breakdown-drawer"
                      className="mt-6 pt-5 border-t border-[#E6DEC8] dark:border-slate-800/90 w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                          言霊分解 · Word & Particle Structure (Click any chip to inspect)
                        </span>
                        <span className="text-[11px] text-[#C83E2B] dark:text-rose-400 font-semibold">
                          朱色 Vermilion = Particle
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {sentenceBreakdown.tokens.map((tok, i) => (
                          <button
                            key={`${tok.surface}-${i}`}
                            type="button"
                            onClick={() =>
                              setInspectorData(
                                inspectTokenOrCharacter(
                                  tok.surface,
                                  tok.reading,
                                  currentSentence.id
                                )
                              )
                            }
                            className={`text-left px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                              tok.kind === 'particle'
                                ? 'bg-rose-50/90 dark:bg-rose-950/50 border-[#C83E2B]/50 dark:border-rose-800/80 hover:border-[#C83E2B]'
                                : 'bg-[#F6F1E6] dark:bg-slate-900 border-[#DFD6C7] dark:border-slate-800 hover:border-stone-400'
                            }`}
                          >
                            <div className="flex items-baseline gap-1.5">
                              <span
                                lang="ja"
                                className={`font-jp-serif text-sm font-bold ${
                                  tok.kind === 'particle'
                                    ? 'text-[#C83E2B] dark:text-rose-300'
                                    : 'text-stone-900 dark:text-white'
                                }`}
                              >
                                {tok.surface}
                              </span>
                              {tok.reading && (
                                <span className="font-jp text-xs text-stone-500 dark:text-slate-400">
                                  ({tok.reading})
                                </span>
                              )}
                            </div>
                            {tok.note && (
                              <div className="mt-0.5 text-[11px] text-stone-600 dark:text-slate-400">
                                {tok.note}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* 1-Line Grammar Pattern Formula & Note */}
                      <div className="mt-3 pt-2.5 border-t border-[#E6DEC8] dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-slate-400">
                        <div>
                          <span className="font-semibold text-stone-800 dark:text-slate-200">
                            Pattern:{' '}
                          </span>
                          <span className="font-jp">
                            {currentGrammarNote
                              ? currentGrammarNote.patternFormula
                              : currentSentence.grammarTags.join(' · ')}
                          </span>
                        </div>
                        {currentUnit && onOpenUnitGrammar && (
                          <button
                            type="button"
                            onClick={() => onOpenUnitGrammar(currentUnit.id)}
                            className="font-semibold text-[#C83E2B] dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            Open Unit {currentUnit.unitNumber} Grammar Guide →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : practiceFormat === 'listening_first' ? (
                /* FRONT SIDE — LISTENING FIRST DICTATION MODE */
                <div className="max-w-xl w-full flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950 text-[#C83E2B] dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer mb-5"
                  >
                    <Volume2 className="w-9 h-9" />
                  </button>
                  <div className="text-sm font-semibold text-stone-800 dark:text-slate-200">
                    Listen carefully to the Japanese sentence (聴解修練)
                  </div>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                    Try to visualize the words and meaning before revealing the Japanese script.
                  </p>

                  {listeningScriptRevealed ? (
                    <div
                      lang="ja"
                      data-testid="card-front-japanese"
                      className="mt-6 font-jp-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-slate-50"
                    >
                      <FuriganaText
                        segments={currentSentence.segments}
                        showFurigana={shouldShowFurigana}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setListeningScriptRevealed(true)}
                      className="mt-5 px-4 py-2 text-xs font-semibold bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Reveal Japanese Script
                    </button>
                  )}
                </div>
              ) : practiceFormat === 'particle_cloze' && clozeChallenge ? (
                /* FRONT SIDE — PARTICLE FILL-IN-THE-BLANK DRILL */
                <div className="max-w-2xl w-full flex flex-col items-center">
                  <div
                    lang="ja"
                    data-testid="card-front-japanese"
                    className="font-jp-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-slate-50 leading-[2.2]"
                  >
                    <FuriganaText
                      segments={clozeChallenge.beforeSegments}
                      showFurigana={shouldShowFurigana}
                    />
                    <span
                      className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-0.5 mx-1.5 rounded-lg border-2 font-jp-serif text-2xl align-middle ${
                        selectedClozeOption === null
                          ? 'border-dashed border-[#C83E2B] text-[#C83E2B] dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                          : selectedClozeOption === clozeChallenge.targetParticle
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'border-[#C83E2B] bg-rose-50 dark:bg-rose-950 text-[#C83E2B] dark:text-rose-300'
                      }`}
                    >
                      {selectedClozeOption || '？'}
                    </span>
                    <FuriganaText
                      segments={clozeChallenge.afterSegments}
                      showFurigana={shouldShowFurigana}
                    />
                  </div>

                  {/* 4 Particle Options */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {clozeChallenge.options.map((opt) => {
                      const isPicked = selectedClozeOption === opt;
                      const isCorrect = opt === clozeChallenge.targetParticle;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSelectedClozeOption(opt);
                            playJapaneseChime(
                              opt === clozeChallenge.targetParticle ? 'good' : 'again',
                              appState.settings.soundEffectsEnabled
                            );
                          }}
                          className={`min-w-[3.5rem] px-4 py-2.5 rounded-xl font-jp-serif text-lg font-bold border transition-colors cursor-pointer ${
                            !selectedClozeOption
                              ? 'bg-[#F6F1E6] dark:bg-stone-900 border-[#DFD6C7] dark:border-stone-700 text-stone-900 dark:text-white hover:border-[#C83E2B]'
                              : isCorrect
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isPicked
                              ? 'bg-[#C83E2B] border-[#C83E2B] text-white'
                              : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedClozeOption && (
                    <div
                      className={`mt-4 px-4 py-2.5 rounded-xl text-xs max-w-lg ${
                        selectedClozeOption === clozeChallenge.targetParticle
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {clozeChallenge.explanation}
                    </div>
                  )}
                </div>
              ) : practiceFormat === 'sentence_scramble' && scrambleChallenge ? (
                /* FRONT SIDE — SENTENCE SCRAMBLE BUILDER */
                <div className="max-w-2xl w-full flex flex-col items-center">
                  <div className="text-xs font-medium text-stone-500 dark:text-slate-400 mb-1">
                    Construct the Japanese sentence for:
                  </div>
                  <div className="text-lg sm:text-xl font-display font-bold text-stone-900 dark:text-white mb-5">
                    “{currentSentence.english}”
                  </div>

                  {/* Constructed Answer Slot */}
                  <div
                    lang="ja"
                    data-testid="card-front-japanese"
                    className="w-full min-h-[60px] p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 flex flex-wrap items-center justify-center gap-2"
                  >
                    {selectedScrambleTiles.length === 0 ? (
                      <span className="text-xs text-stone-400 dark:text-slate-500">
                        Click the Japanese phrase tiles below in the right order...
                      </span>
                    ) : (
                      selectedScrambleTiles.map((tile) => (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() =>
                            setSelectedScrambleTiles((prev) =>
                              prev.filter((t) => t.id !== tile.id)
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-[#C83E2B] text-white font-jp-serif text-base font-semibold cursor-pointer"
                        >
                          {tile.text}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Available Tiles */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {scrambleChallenge.shuffledTiles.map((tile) => {
                      const used = selectedScrambleTiles.some((t) => t.id === tile.id);
                      return (
                        <button
                          key={tile.id}
                          type="button"
                          disabled={used}
                          onClick={() => {
                            playJapaneseChime('flip', appState.settings.soundEffectsEnabled);
                            setSelectedScrambleTiles((prev) => [...prev, tile]);
                          }}
                          className={`px-3.5 py-2 rounded-xl font-jp-serif text-base font-semibold border transition-colors ${
                            used
                              ? 'opacity-30 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-800 text-stone-400 cursor-not-allowed'
                              : 'bg-[#FCFBF7] dark:bg-stone-900 border-[#DFD6C7] dark:border-stone-700 text-stone-900 dark:text-white hover:border-[#C83E2B] cursor-pointer'
                          }`}
                        >
                          {tile.text}
                        </button>
                      );
                    })}
                  </div>

                  {isScrambleComplete && (
                    <div
                      className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold ${
                        isScrambleCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950 text-[#C83E2B] dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isScrambleCorrect
                        ? `Correct! ${currentSentence.japanese}`
                        : `Not quite — tap a tile to reorder or Reveal Answer below.`}
                    </div>
                  )}
                </div>
              ) : (
                /* FRONT SIDE — CLASSIC FLASHCARD (STRICT JAPANESE ONLY IN SHIPPORI MINCHO) */
                <div
                  lang="ja"
                  data-testid="card-front-japanese"
                  className="font-jp-serif text-3xl sm:text-4xl md:text-[2.65rem] font-bold text-stone-900 dark:text-slate-50 max-w-2xl select-text tracking-wide"
                >
                  <FuriganaText
                    segments={currentSentence.segments}
                    showFurigana={shouldShowFurigana}
                  />
                </div>
              )}
            </div>

            {/* Card Bottom Hint / Breakdown Toggle */}
            <div className="relative z-10 min-h-[28px] flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
              <div>
                {audioNotice ? (
                  <span className="text-amber-700 dark:text-amber-400">{audioNotice}</span>
                ) : cardFace === 'front' && !hasRevealedOnce ? (
                  <span>Read the Japanese sentence and interpret its meaning before revealing</span>
                ) : (
                  <span>Stamp your Hanko evaluation below (1–4)</span>
                )}
              </div>

              {hasRevealedOnce && (
                <button
                  type="button"
                  onClick={() => setShowBreakdownDrawer((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C83E2B] dark:text-rose-400" />
                  <span>
                    {showBreakdownDrawer
                      ? 'Hide Word & Particle Chips (G)'
                      : 'Show Word & Particle Chips (G)'}
                  </span>
                  {showBreakdownDrawer ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action / Hanko Grading Deck Below Card */}
          <div className="mt-5">
            {!hasRevealedOnce ? (
              <button
                type="button"
                onClick={handleRevealAnswer}
                className="w-full py-4 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-[#C83E2B] dark:hover:bg-[#B03221] text-white font-semibold text-base rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Reveal English Translation
              </button>
            ) : studyMode === 'free_practice' ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handlePracticeAdvance(true)}
                  className="py-3.5 px-4 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 hover:border-[#C83E2B] text-stone-900 dark:text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>再 · Practice Again</span>
                  <span className="text-xs font-normal text-stone-500 dark:text-slate-400">
                    Keep in current practice deck
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePracticeAdvance(false)}
                  className="py-3.5 px-4 bg-[#C83E2B] hover:bg-[#B03221] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer flex flex-col items-center gap-0.5"
                >
                  <span>良 · Understood — Next Card</span>
                  <span className="text-xs font-normal text-rose-100">Advance without SRS change</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleGrade('again')}
                  className="py-3 px-4 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 hover:border-[#C83E2B] dark:hover:border-rose-500 rounded-xl transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      lang="ja"
                      className="w-5 h-5 rounded-full border border-[#C83E2B] text-[#C83E2B] dark:border-rose-400 dark:text-rose-400 font-jp-serif text-[11px] font-bold flex items-center justify-center"
                    >
                      再
                    </span>
                    <span className="text-sm font-bold text-[#C83E2B] dark:text-rose-400">
                      Again
                    </span>
                  </div>
                  <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                    {intervalPreviews.again}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('hard')}
                  className="py-3 px-4 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 hover:border-amber-600 dark:hover:border-amber-500 rounded-xl transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      lang="ja"
                      className="w-5 h-5 rounded-full border border-amber-700 text-amber-700 dark:border-amber-400 dark:text-amber-400 font-jp-serif text-[11px] font-bold flex items-center justify-center"
                    >
                      難
                    </span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      Hard
                    </span>
                  </div>
                  <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                    {intervalPreviews.hard}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('good')}
                  className="py-3 px-4 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 rounded-xl transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      lang="ja"
                      className="w-5 h-5 rounded-full border border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 font-jp-serif text-[11px] font-bold flex items-center justify-center"
                    >
                      良
                    </span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      Good
                    </span>
                  </div>
                  <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                    {intervalPreviews.good}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('easy')}
                  className="py-3 px-4 bg-[#FCFBF7] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-800 hover:border-sky-600 dark:hover:border-sky-500 rounded-xl transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      lang="ja"
                      className="w-5 h-5 rounded-full border border-sky-700 text-sky-700 dark:border-sky-400 dark:text-sky-400 font-jp-serif text-[11px] font-bold flex items-center justify-center"
                    >
                      優
                    </span>
                    <span className="text-sm font-bold text-sky-700 dark:text-sky-400">Easy</span>
                  </div>
                  <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                    {intervalPreviews.easy}
                  </span>
                </button>
              </div>
            )}

            {/* Keyboard Shortcut Reference */}
            <div className="mt-3.5 hidden sm:flex items-center justify-center gap-3 text-xs text-stone-500 dark:text-slate-400">
              <span>Space / Enter: Reveal or Good</span>
              <span>·</span>
              <span>1–4: Stamp Hanko (再/難/良/優)</span>
              <span>·</span>
              <span>G: Toggle Word Chips</span>
              <span>·</span>
              <span>R: Audio</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setShowShortcutModal(true)}
                className="underline hover:text-stone-700 dark:hover:text-slate-300 cursor-pointer"
              >
                All Shortcuts (?)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Session Completed or Empty Queue State */
        <div className="relative overflow-hidden mt-8 bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
          <WagaraPattern pattern="seigaiha" opacity={0.04} className="text-[#C83E2B]" />
          <ShojiCornerFrames />

          <div className="relative z-10 flex justify-center mb-4">
            <HankoSeal
              text={
                studyMode === 'daily_review' && completedCount === 0
                  ? '完'
                  : studyMode === 'free_practice' && totalCardsInQueue === 0
                  ? '空'
                  : '満了'
              }
              subText="達成"
              size="lg"
              shape="circle"
              variant="vermilion"
              animated={true}
            />
          </div>

          <h2 className="relative z-10 font-display text-2xl font-bold text-stone-900 dark:text-white">
            {studyMode === 'daily_review' && completedCount === 0
              ? 'No Reviews Due Right Now'
              : studyMode === 'free_practice' && totalCardsInQueue === 0
              ? 'No Sentences Match Your Practice Filters'
              : 'Session Complete (修練完了)'}
          </h2>

          <p className="relative z-10 mt-2 text-sm text-stone-600 dark:text-slate-400 max-w-md mx-auto">
            {studyMode === 'daily_review' && completedCount === 0
              ? 'You have completed all scheduled spaced-repetition reviews for today. You can learn new sentences or practice freely.'
              : studyMode === 'free_practice' && totalCardsInQueue === 0
              ? 'Try broadening your level, unit, status, or favorites filter in Study Options to practice sentences.'
              : `Great work! You completed ${completedCount} ${
                  completedCount === 1 ? 'sentence' : 'sentences'
                } in this session.`}
          </p>

          <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3">
            {studyMode !== 'learn_new' && (
              <button
                type="button"
                onClick={() => switchStudyMode('learn_new')}
                className="px-5 py-2.5 bg-[#C83E2B] hover:bg-[#B03221] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Learn New Sentences
              </button>
            )}

            {studyMode === 'learn_new' && (
              <button
                type="button"
                onClick={() =>
                  buildQueue(
                    'learn_new',
                    selectedLevel,
                    selectedUnitId,
                    sessionLimit,
                    practiceFilters
                  )
                }
                className="px-5 py-2.5 bg-[#C83E2B] hover:bg-[#B03221] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Study Next {sessionLimit} Sentences
              </button>
            )}

            <button
              type="button"
              onClick={() => switchStudyMode('free_practice')}
              className="px-5 py-2.5 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Free Practice
            </button>

            <button
              type="button"
              onClick={onNavigateToCurriculum}
              className="px-5 py-2.5 bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Browse Curriculum Units
            </button>
          </div>
        </div>
      )}

      {/* Character & Vocabulary Inspector Modal */}
      <CharacterPopover
        data={inspectorData}
        onClose={() => setInspectorData(null)}
        audioSpeed={appState.settings.audioSpeed}
        preferredVoiceURI={appState.settings.preferredVoiceURI}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutModal isOpen={showShortcutModal} onClose={() => setShowShortcutModal(false)} />
    </div>
  );
};
