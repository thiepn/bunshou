import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_SENTENCES } from './data/sentences';
import { AppScreen, TopNav } from './components/TopNav';
import { HomeView } from './components/HomeView';
import { StudyLaunchConfig, StudyView } from './components/StudyView';
import { CurriculumView } from './components/CurriculumView';
import { GrammarHandbookView } from './components/GrammarHandbookView';
import { LibraryView } from './components/LibraryView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import {
  CurriculumSubTab,
  FuriganaMode,
  LearnerSettings,
  LevelId,
  PersistedAppState,
  ReviewGrade,
} from './types/curriculum';
import {
  getDueReviewQueue,
  getLocalDateString,
  scheduleSentenceReview,
} from './utils/srs';
import { createInitialAppState } from './utils/storage';
import type { Dispatch, SetStateAction } from 'react';

export default function App({appState,setAppState}: {appState: PersistedAppState; setAppState: Dispatch<SetStateAction<PersistedAppState>>}) {
  const [undoStack, setUndoStack] = useState<PersistedAppState[]>([]);

  const [activeScreen, setActiveScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'study';
      }
    }
    return 'home';
  });

  const [studyLaunchConfig, setStudyLaunchConfig] = useState<StudyLaunchConfig>({
    mode: 'learn_new',
    level: appState.settings.selectedLevel,
  });

  const [curriculumInitialNav, setCurriculumInitialNav] = useState<{
    subTab: CurriculumSubTab;
    dialogueUnitId?: string;
  }>({ subTab: 'units' });

  const [grammarInitialUnitId, setGrammarInitialUnitId] = useState<string | undefined>(undefined);

  const [libraryInitialFilter, setLibraryInitialFilter] = useState<{
    unitId?: string;
    level?: LevelId;
    favoritesOnly?: boolean;
  }>({});


  // Sync light/dark theme class on <html> and update PWA theme-color meta tag
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const isDark = appState.settings.theme === 'dark';
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', isDark ? '#0D1118' : '#C83E2B');
      }
    }
  }, [appState.settings.theme, appState.settings.seasonalTheme]);

  // Cancel active speech synthesis when navigating across views
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore restricted speechSynthesis environments
      }
    }
  }, [activeScreen]);

  const todayStr = getLocalDateString();

  const dueCount = useMemo(
    () => getDueReviewQueue(ALL_SENTENCES, appState.records, todayStr).length,
    [appState.records, todayStr]
  );

  const handleUpdateSettings = useCallback((partial: Partial<LearnerSettings>) => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partial,
      },
    }));
  }, []);

  const handleToggleFavorite = useCallback((sentenceId: string) => {
    setAppState((prev) => {
      const exists = prev.favorites.includes(sentenceId);
      const nextFavs = exists
        ? prev.favorites.filter((id) => id !== sentenceId)
        : [...prev.favorites, sentenceId];
      return {
        ...prev,
        favorites: nextFavs,
      };
    });
  }, []);

  const handleCompleteDialogue = useCallback(
    (unitId: string) => {
      setAppState((prev) => {
        const current = prev.completedDialogues || [];
        if (current.includes(unitId)) return prev;

        const prevDayLog = prev.dailyLogs[todayStr] || {
          date: todayStr,
          newStudiedCount: 0,
          reviewsCompletedCount: 0,
          practiceCount: 0,
          grades: { again: 0, hard: 0, good: 0, easy: 0 },
        };

        return {
          ...prev,
          completedDialogues: [...current, unitId],
          dailyLogs: {
            ...prev.dailyLogs,
            [todayStr]: {
              ...prevDayLog,
              practiceCount: prevDayLog.practiceCount + 1,
            },
          },
        };
      });
    },
    [todayStr]
  );

  const handleGradeCard = useCallback(
    (sentenceId: string, grade: ReviewGrade, isNewCard: boolean) => {
      setAppState((prev) => {
        // Save snapshot for Undo
        setUndoStack((stack) => [...stack.slice(-15), prev]);

        const existingRecord = prev.records[sentenceId];
        const updatedRecord = scheduleSentenceReview(
          existingRecord,
          sentenceId,
          grade,
          todayStr
        );

        const prevDayLog = prev.dailyLogs[todayStr] || {
          date: todayStr,
          newStudiedCount: 0,
          reviewsCompletedCount: 0,
          practiceCount: 0,
          grades: { again: 0, hard: 0, good: 0, easy: 0 },
        };

        const updatedDayLog = {
          ...prevDayLog,
          newStudiedCount: isNewCard
            ? prevDayLog.newStudiedCount + 1
            : prevDayLog.newStudiedCount,
          reviewsCompletedCount: !isNewCard
            ? prevDayLog.reviewsCompletedCount + 1
            : prevDayLog.reviewsCompletedCount,
          grades: {
            ...prevDayLog.grades,
            [grade]: prevDayLog.grades[grade] + 1,
          },
        };

        return {
          ...prev,
          records: {
            ...prev.records,
            [sentenceId]: updatedRecord,
          },
          dailyLogs: {
            ...prev.dailyLogs,
            [todayStr]: updatedDayLog,
          },
        };
      });
    },
    [todayStr]
  );

  const handleLogPracticeCard = useCallback(() => {
    setAppState((prev) => {
      const prevDayLog = prev.dailyLogs[todayStr] || {
        date: todayStr,
        newStudiedCount: 0,
        reviewsCompletedCount: 0,
        practiceCount: 0,
        grades: { again: 0, hard: 0, good: 0, easy: 0 },
      };

      return {
        ...prev,
        dailyLogs: {
          ...prev.dailyLogs,
          [todayStr]: {
            ...prevDayLog,
            practiceCount: prevDayLog.practiceCount + 1,
          },
        },
      };
    });
  }, [todayStr]);

  const handleUndoLastGrade = useCallback(() => {
    if (undoStack.length === 0) return;
    setAppState(undoStack[undoStack.length - 1]);
    setUndoStack(undoStack.slice(0, -1));
  }, [undoStack, setAppState]);

  const handleStartStudy = useCallback((config: StudyLaunchConfig) => {
    setStudyLaunchConfig(config);
    setActiveScreen('study');
  }, []);

  const handleNavigate = useCallback(
    (screen: AppScreen) => {
      if (screen === 'study' && activeScreen !== 'study') {
        setStudyLaunchConfig({
          mode: dueCount > 0 ? 'daily_review' : 'learn_new',
          level: appState.settings.selectedLevel,
        });
      }
      if (screen === 'curriculum') {
        setCurriculumInitialNav({ subTab: 'units' });
      }
      if (screen === 'library') {
        setLibraryInitialFilter({});
      }
      setActiveScreen(screen);
    },
    [activeScreen, dueCount, appState.settings.selectedLevel]
  );

  const handleNavigateToCurriculum = useCallback(
    (subTab: CurriculumSubTab = 'units', dialogueUnitId?: string) => {
      if (subTab === 'grammar') {
        setGrammarInitialUnitId(dialogueUnitId);
        setActiveScreen('grammar');
        return;
      }
      setCurriculumInitialNav({ subTab, dialogueUnitId });
      setActiveScreen('curriculum');
    },
    []
  );

  const handleOpenUnitGrammar = useCallback((unitId: string) => {
    setGrammarInitialUnitId(unitId);
    setActiveScreen('grammar');
  }, []);

  const handleOpenUnitStory = useCallback((unitId: string) => {
    setCurriculumInitialNav({ subTab: 'dialogues', dialogueUnitId: unitId });
    setActiveScreen('curriculum');
  }, []);

  const handleInspectUnitInLibrary = useCallback((unitId: string, level: LevelId) => {
    setLibraryInitialFilter({ unitId, level, favoritesOnly: false });
    setActiveScreen('library');
  }, []);

  const handleNavigateToLibraryFavorites = useCallback((favoritesOnly?: boolean) => {
    setLibraryInitialFilter({ favoritesOnly: Boolean(favoritesOnly) });
    setActiveScreen('library');
  }, []);

  const handleResetAllProgress = useCallback(() => {
    const fresh = createInitialAppState();
    setUndoStack([]);
    setAppState(fresh);
  }, []);

  const handleSaveOmikujiDraw = useCallback((proverbId: string, dateStr: string) => {
    setAppState((prev) => ({
      ...prev,
      lastOmikujiDate: dateStr,
      lastOmikujiId: proverbId,
    }));
  }, []);

  return (
    <div
      data-season={appState.settings.seasonalTheme || 'classic'}
      className="min-h-screen bg-[#F7F3EB] dark:bg-[#0D1118] washi-canvas text-[#1C1917] dark:text-[#F4EFE6] flex flex-col"
    >
      <TopNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        dueCount={dueCount}
      />

      <main className="flex-1">
        {activeScreen === 'home' && (
          <HomeView
            appState={appState}
            onStartStudy={handleStartStudy}
            onSelectLevel={(level) => handleUpdateSettings({ selectedLevel: level })}
            onSelectSeasonalTheme={(seasonalTheme) =>
              handleUpdateSettings({ seasonalTheme })
            }
            onNavigateToCurriculum={handleNavigateToCurriculum}
            onOpenUnitGrammar={handleOpenUnitGrammar}
            onNavigateToLibrary={handleNavigateToLibraryFavorites}
            onSaveOmikujiDraw={handleSaveOmikujiDraw}
          />
        )}

        {activeScreen === 'study' && (
          <StudyView
            appState={appState}
            launchConfig={studyLaunchConfig}
            onGradeCard={handleGradeCard}
            onLogPracticeCard={handleLogPracticeCard}
            onUndoLastGrade={handleUndoLastGrade}
            canUndo={undoStack.length > 0}
            onToggleFavorite={handleToggleFavorite}
            onUpdateFuriganaMode={(mode: FuriganaMode) =>
              handleUpdateSettings({ furiganaMode: mode })
            }
            onUpdateDailyTarget={(target: number) =>
              handleUpdateSettings({ dailyNewTarget: target })
            }
            onToggleSoundEffects={(enabled: boolean) =>
              handleUpdateSettings({ soundEffectsEnabled: enabled })
            }
            onNavigateToCurriculum={() => handleNavigateToCurriculum('units')}
            onOpenUnitGrammar={handleOpenUnitGrammar}
            onOpenUnitStory={handleOpenUnitStory}
          />
        )}

        {activeScreen === 'curriculum' && (
          <CurriculumView
            appState={appState}
            initialSubTab={curriculumInitialNav.subTab}
            initialDialogueUnitId={curriculumInitialNav.dialogueUnitId}
            onStartStudy={handleStartStudy}
            onInspectUnitInLibrary={handleInspectUnitInLibrary}
            onCompleteDialogue={handleCompleteDialogue}
            onOpenUnitGrammar={handleOpenUnitGrammar}
          />
        )}

        {activeScreen === 'grammar' && (
          <GrammarHandbookView
            appState={appState}
            initialUnitId={grammarInitialUnitId}
            onStartStudy={handleStartStudy}
            onInspectUnitInLibrary={handleInspectUnitInLibrary}
            onOpenUnitStory={handleOpenUnitStory}
          />
        )}

        {activeScreen === 'library' && (
          <LibraryView
            appState={appState}
            initialUnitId={libraryInitialFilter.unitId}
            initialLevel={libraryInitialFilter.level}
            initialFavoritesOnly={libraryInitialFilter.favoritesOnly}
            onToggleFavorite={handleToggleFavorite}
            onStartStudy={handleStartStudy}
          />
        )}

        {activeScreen === 'progress' && (
          <ProgressView
            appState={appState}
            onStartStudy={handleStartStudy}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsView
            appState={appState}
            onUpdateSettings={handleUpdateSettings}
            onImportState={(newState) => {
              setUndoStack([]);
              setAppState(newState);
            }}
            onResetAllProgress={handleResetAllProgress}
          />
        )}
      </main>
      <OfflineIndicator />
    </div>
  );
}
