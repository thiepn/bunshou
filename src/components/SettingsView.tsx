import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Moon,
  Sun,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { FuriganaMode, LearnerSettings, PersistedAppState } from '../types/curriculum';
import {
  AudioStatus,
  getAudioStatus,
  playJapaneseChime,
  speakJapaneseSentence,
} from '../utils/audio';
import { validateAndParseBackupJson } from '../utils/storage';
import { SEASONAL_THEMES } from './JapaneseMotifs';
import { PWAInstallButton } from './PWAInstallPrompt';

interface SettingsViewProps {
  appState: PersistedAppState;
  onUpdateSettings: (partial: Partial<LearnerSettings>) => void;
  onImportState: (newState: PersistedAppState) => void;
  onResetAllProgress: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appState,
  onUpdateSettings,
  onImportState,
  onResetAllProgress,
}) => {
  const [importText, setImportText] = useState<string>('');
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [audioTestStatus, setAudioTestStatus] = useState<string | null>(null);
  const [audioInfo, setAudioInfo] = useState<AudioStatus>(() =>
    getAudioStatus(appState.settings.preferredVoiceURI)
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAudioInfo(getAudioStatus(appState.settings.preferredVoiceURI));
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handleVoices = () => {
        setAudioInfo(getAudioStatus(appState.settings.preferredVoiceURI));
      };
      window.speechSynthesis.addEventListener?.('voiceschanged', handleVoices);
      return () => window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoices);
    }
  }, [appState.settings.preferredVoiceURI]);

  const handleExportBackup = () => {
    const jsonString = JSON.stringify(appState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bunsho-progress-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setImportText(content);
      processImportJson(content);
    };
    reader.readAsText(file);
  };

  const processImportJson = (rawJson: string) => {
    setImportFeedback(null);
    if (!rawJson.trim()) {
      setImportFeedback({
        type: 'error',
        message: 'Please provide or select a non-empty JSON backup.',
      });
      return;
    }

    const result = validateAndParseBackupJson(rawJson);
    if (!result.valid || !result.state) {
      setImportFeedback({
        type: 'error',
        message: result.error || 'Invalid backup file.',
      });
      return;
    }

    onImportState(result.state);
    setImportFeedback({
      type: 'success',
      message: `Successfully restored ${result.importedRecordCount} studied sentence records and ${result.importedFavoriteCount} favorites.`,
    });
  };

  const handleTestAudio = () => {
    setAudioTestStatus('Playing sample Japanese sentence...');
    speakJapaneseSentence(
      '日本語を勉強します。',
      appState.settings.audioSpeed,
      () => setAudioTestStatus('Playing: 日本語を勉強します。'),
      () => setAudioTestStatus('Playback finished.'),
      (err) => setAudioTestStatus(err),
      appState.settings.preferredVoiceURI
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-24 md:pb-16">
      <div className="pb-6 border-b border-[#DFD6C7] dark:border-slate-800">
        <div className="text-xs text-stone-500 dark:text-slate-400">
          <span>環境設定・資料保全 · Study Environment & Data Backup</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold text-stone-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-slate-400">
          Customize furigana reading support, Japanese speech synthesis voice, visual theme, daily
          review caps, and local progress backups.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* 1. Furigana & Card Back Breakdown Preferences */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
            Furigana Reading Support (ふりがな)
          </h2>
          <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
            Choose how phonetic readings appear above kanji on flashcards and in the library.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: 'always_on',
                  title: 'Always On (Default)',
                  desc: 'Show contextual furigana above all kanji words.',
                },
                {
                  id: 'reveal_on_demand',
                  title: 'Reveal on Demand',
                  desc: 'Hide furigana initially and reveal with one click or F key.',
                },
                {
                  id: 'always_off',
                  title: 'Always Off',
                  desc: 'Display kanji without furigana annotations.',
                },
              ] as Array<{ id: FuriganaMode; title: string; desc: string }>
            ).map((option) => {
              const isSelected = appState.settings.furiganaMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdateSettings({ furiganaMode: option.id })}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#C83E2B] bg-rose-50 dark:bg-rose-950 text-stone-900 dark:text-white'
                      : 'border-[#DFD6C7] dark:border-stone-800 bg-[#F6F1E6] dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-600'
                  }`}
                >
                  <div className="text-xs font-bold text-stone-900 dark:text-white">
                    {option.title}
                  </div>
                  <div className="mt-1 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {option.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6DEC8] dark:border-slate-800">
            <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={appState.settings.autoExpandBreakdown}
                onChange={(e) =>
                  onUpdateSettings({ autoExpandBreakdown: e.target.checked })
                }
                className="rounded border-stone-300 text-[#C83E2B] focus:ring-rose-500"
              />
              <span>
                Automatically expand Word Breakdown & Grammar Notes when revealing card back
              </span>
            </label>
          </div>
        </section>

        {/* 2. Audio, Voice Selector & Pronunciation */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Japanese Audio Pronunciation & Voice Selector
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Uses browser-native Web Speech synthesis (lang: ja-JP).{' '}
                {audioInfo.supported
                  ? audioInfo.voiceName
                    ? `Active voice: ${audioInfo.voiceName}`
                    : 'Standard system speech synthesis ready.'
                  : 'Speech synthesis is unavailable in this browser.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestAudio}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold rounded-lg transition-colors self-start cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Japanese Audio</span>
            </button>
          </div>

          {audioTestStatus && (
            <div className="mt-2 text-xs text-stone-500 dark:text-slate-400">{audioTestStatus}</div>
          )}

          <div className="mt-5 pt-5 border-t border-[#E6DEC8] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appState.settings.autoPlayAudio}
                  onChange={(e) => onUpdateSettings({ autoPlayAudio: e.target.checked })}
                  className="rounded border-stone-300 text-[#C83E2B] focus:ring-rose-500"
                />
                <span>Automatically play Japanese audio when a flashcard appears</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
                  Preferred Browser Japanese Voice (ja-JP)
                </label>
                <select
                  aria-label="Preferred Japanese speech voice"
                  value={appState.settings.preferredVoiceURI}
                  onChange={(e) =>
                    onUpdateSettings({ preferredVoiceURI: e.target.value })
                  }
                  className="w-full bg-[#F6F1E6] dark:bg-stone-900 border border-[#DFD6C7] dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-medium text-stone-900 dark:text-white"
                >
                  <option value="">
                    Automatic Best Japanese Voice (Kyoko / Otoya / Google ja-JP)
                  </option>
                  {audioInfo.availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){v.localService ? ' · Local' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div>
                <div className="text-xs font-semibold text-stone-700 dark:text-slate-300 mb-2">
                  Speech Playback Speed: {appState.settings.audioSpeed}x
                </div>
                <div className="inline-flex items-center gap-1.5">
                  {[0.75, 0.9, 1.0, 1.15].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onUpdateSettings({ audioSpeed: spd })}
                      className={`px-3 py-1.5 text-xs font-mono-tabular font-semibold rounded-lg transition-colors cursor-pointer ${
                        appState.settings.audioSpeed === spd
                          ? 'bg-[#C83E2B] text-white'
                          : 'bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-[#E5DEC9] dark:hover:bg-stone-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E6DEC8] dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-stone-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appState.settings.soundEffectsEnabled !== false}
                      onChange={(e) =>
                        onUpdateSettings({ soundEffectsEnabled: e.target.checked })
                      }
                      className="rounded border-stone-300 text-[#C83E2B] focus:ring-rose-500"
                    />
                    <span>
                      Traditional Acoustic Chimes (風鈴 Fūrin · 拍子木 Hyōshigi · 太鼓 Taiko)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => playJapaneseChime('good', true)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#EFE9DC] dark:bg-slate-800 hover:bg-[#E5DEC9] dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-lg cursor-pointer shrink-0"
                  >
                    Ring Fūrin 🎐
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Theme, Daily New Target & Daily Review Cap */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Japanese Atmosphere Theme (和紙 / 夜藍)
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Switch between Kyoto Kōzo Washi paper light mode and deep Yoru-Ai indigo-sumi dark mode.
              </p>
              <div className="mt-4 inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    appState.settings.theme === 'light'
                      ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                      : 'border-[#DFD6C7] dark:border-stone-700 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Kyoto Washi (和紙)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    appState.settings.theme === 'dark'
                      ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                      : 'border-[#DFD6C7] dark:border-stone-700 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Yoru-Ai Sumi (夜藍)</span>
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E6DEC8] dark:border-slate-800">
                <div className="text-xs font-semibold text-stone-700 dark:text-slate-300 mb-2">
                  Japanese Four-Seasons Atmosphere (四季の風情)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SEASONAL_THEMES.map((season) => {
                    const isSelected =
                      (appState.settings.seasonalTheme || 'classic') === season.id;
                    return (
                      <button
                        key={season.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ seasonalTheme: season.id })
                        }
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#C83E2B] bg-rose-50/70 dark:bg-rose-950/50 text-stone-900 dark:text-white'
                            : 'border-[#DFD6C7] dark:border-slate-800 bg-[#F6F1E6] dark:bg-slate-900 hover:border-stone-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-white">
                            {season.label}
                          </span>
                          <span
                            lang="ja"
                            className="font-jp-serif text-[11px] font-bold text-[#C83E2B] dark:text-rose-400"
                          >
                            {season.kanji}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                          {season.subLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Daily New-Sentence Target
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Default number of new unseen sentences per study session.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {[5, 10, 20, 30].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => onUpdateSettings({ dailyNewTarget: target })}
                    className={`px-3.5 py-2 text-xs font-mono-tabular font-semibold rounded-xl border transition-colors cursor-pointer ${
                      appState.settings.dailyNewTarget === target
                        ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                        : 'border-[#DFD6C7] dark:border-stone-700 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    {target} / day
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#E6DEC8] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Daily SRS Review Cap
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Maximum number of due reviews queued in a single daily review session.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { cap: 20, label: '20 / session' },
                  { cap: 50, label: '50 / session' },
                  { cap: 100, label: '100 / session' },
                  { cap: 999, label: 'Unlimited' },
                ].map((item) => (
                  <button
                    key={item.cap}
                    type="button"
                    onClick={() => onUpdateSettings({ dailyReviewCap: item.cap })}
                    className={`px-3.5 py-2 text-xs font-mono-tabular font-semibold rounded-xl border transition-colors cursor-pointer ${
                      appState.settings.dailyReviewCap === item.cap
                        ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                        : 'border-[#DFD6C7] dark:border-stone-700 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Weekly Study Goal Target
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Target number of active study days per rolling 7-day week.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[3, 5, 7].map((daysTarget) => (
                  <button
                    key={daysTarget}
                    type="button"
                    onClick={() => onUpdateSettings({ weeklyDaysTarget: daysTarget })}
                    className={`px-3.5 py-2 text-xs font-mono-tabular font-semibold rounded-xl border transition-colors cursor-pointer ${
                      (appState.settings.weeklyDaysTarget || 5) === daysTarget
                        ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                        : 'border-[#DFD6C7] dark:border-stone-700 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    {daysTarget} days / week
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3B. Installable Offline Progressive Web App (PWA) */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
              Install Offline Mobile & Desktop App (PWA · 携帯アプリ)
            </h2>
            <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
              Install Bunshō (文章) on your home screen or desktop for full offline study of all 600
              sentences, grammar lessons, and Shodō calligraphy without an internet connection.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </section>

        {/* 4. Progress Export & Import (JSON) */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Backup & Restore Progress (JSON)
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Export your spaced-repetition records, favorites, and settings to a JSON file, or
                restore from a validated backup.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-[#E5DEC9] dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload JSON File</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-stone-600 dark:text-slate-400 mb-1.5">
              Or paste backup JSON directly to validate and import:
            </label>
            <textarea
              rows={4}
              aria-label="Backup JSON input"
              placeholder='{"version": 1, "settings": {...}, "records": {...}, "favorites": [...]}'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full p-3 text-xs font-mono-tabular bg-[#F6F1E6] dark:bg-slate-900 border border-[#DFD6C7] dark:border-slate-700 rounded-xl text-stone-900 dark:text-white"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => processImportJson(importText)}
                className="px-4 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Validate & Restore Backup
              </button>

              <button
                type="button"
                onClick={() => setImportText(JSON.stringify(appState, null, 2))}
                className="text-xs font-medium text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              >
                Load Current State into Editor
              </button>
            </div>

            {importFeedback && (
              <div
                role="status"
                className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  importFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {importFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{importFeedback.message}</span>
              </div>
            )}
          </div>
        </section>

        {/* 5. Reset Progress with Confirmation */}
        <section className="bg-[#FCFBF7] dark:bg-[#141923] border border-[#DFD6C7] dark:border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                Reset Learning Progress
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Permanently clear all spaced-repetition review history, daily logs, and favorites
                from this browser.
              </p>
            </div>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EFE9DC] dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[#C83E2B] dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors self-start cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetAllProgress();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 bg-[#C83E2B] hover:bg-[#B03221] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Confirm Full Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-2 bg-[#EFE9DC] dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
