import React from 'react';
import { PWAInstallButton } from './PWAInstallPrompt';

export type AppScreen =
  | 'home'
  | 'study'
  | 'curriculum'
  | 'grammar'
  | 'library'
  | 'progress'
  | 'settings'
  | 'ecosystem'
  | 'guided';

interface TopNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  dueCount: number;
}

const NAV_ITEMS: Array<{ id: AppScreen; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'guided', label: 'Guided' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'library', label: 'Library' },
  { id: 'ecosystem', label: 'Context' },
  { id: 'progress', label: 'Progress' },
  { id: 'settings', label: 'Settings' },
];

export const TopNav: React.FC<TopNavProps> = ({ activeScreen, onNavigate, dueCount }) => {
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3.5 bg-[#F7F3EB]/95 dark:bg-[#0D1118]/95 backdrop-blur-sm border-b border-[#DFD6C7] dark:border-slate-800 shadow-[0_1px_0_rgba(200,62,43,0.08)]">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-xl font-bold tracking-tight text-stone-900 dark:text-slate-100 whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C83E2B] cursor-pointer"
        >
          Bunshō 文章
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex min-w-0 overflow-x-auto items-center gap-3 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#C83E2B] text-stone-900 dark:text-white font-semibold'
                    : 'border-transparent text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Study action + compact PWA install */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={() => onNavigate('study')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeScreen === 'study'
                ? 'bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-[#C83E2B] hover:bg-[#B03221] text-white shadow-xs'
            }`}
          >
            {dueCount > 0 ? `Study Now (${dueCount} Due)` : 'Study Now'}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (stays well below 15% viewport height cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#F7F3EB]/95 dark:bg-[#0D1118]/95 backdrop-blur-sm border-t border-[#DFD6C7] dark:border-slate-800 px-2 py-1.5 flex items-center overflow-x-auto"
      >
        {(
          ['home', 'study', 'guided', 'curriculum', 'grammar', 'library', 'ecosystem', 'progress', 'settings'] as AppScreen[]
        ).map((screenId) => {
          const isActive = activeScreen === screenId;
          const label =
            screenId === 'home'
              ? 'Home'
              : screenId === 'study'
              ? 'Study'
              : screenId === 'guided'
              ? 'Guided'
              : screenId === 'ecosystem'
              ? 'Context'
              : screenId === 'curriculum'
              ? 'Units'
              : screenId === 'grammar'
              ? 'Grammar'
              : screenId === 'library'
              ? 'Library'
              : screenId === 'progress'
              ? 'Stats'
              : 'Settings';
          return (
            <button
              key={screenId}
              type="button"
              onClick={() => onNavigate(screenId)}
              aria-current={isActive ? 'page' : undefined}
              className={`px-2 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#C83E2B] dark:text-rose-400 font-semibold bg-rose-50/80 dark:bg-rose-950/40'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </>
  );
};
