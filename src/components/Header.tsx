import React from 'react';
import type { UserPrefs } from '../types/quiz';
import { IconMoon, IconMusic, IconQuizLogo, IconSliders, IconSun } from './Icons';

interface HeaderProps {
  prefs: UserPrefs;
  onGoHome: () => void;
  onToggleBgm: () => void;
  onOpenAudioDrawer: () => void;
  onToggleTheme: () => void;
}

const VIBE_LABELS: Record<UserPrefs['bgmVibe'], string> = {
  lofi: 'Lo-fi',
  ambient: 'Ambient',
  rain: 'Mưa nhẹ',
  custom: 'MP3',
};

export const Header: React.FC<HeaderProps> = ({
  prefs,
  onGoHome,
  onToggleBgm,
  onOpenAudioDrawer,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E4E4DF] bg-[#F7F7F5]/95 backdrop-blur-xs dark:border-[#2B3038] dark:bg-[#121417]/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={onGoHome}
          className="group flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-2 text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447E5]"
        >
          <IconQuizLogo className="h-7 w-7 shrink-0" />
          <span className="font-display truncate text-base font-bold tracking-tight text-[#141413] dark:text-[#F3F4F6] sm:text-lg">
            QuizChill
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleBgm}
            aria-pressed={prefs.bgmEnabled}
            title={prefs.bgmEnabled ? 'Tắt nhạc nền chill' : 'Bật nhạc nền chill'}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors sm:px-3 ${
              prefs.bgmEnabled
                ? 'border-[#2447E5] bg-[#2447E5] text-white dark:border-[#4F75FF] dark:bg-[#3B5BFF]'
                : 'border-[#E4E4DF] bg-white text-[#141413] hover:bg-[#EFEFEA] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6] dark:hover:bg-[#23272E]'
            }`}
          >
            {prefs.bgmEnabled ? (
              <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
                <span className="eq-bar-1 h-full w-[2.5px] rounded-full bg-white" />
                <span className="eq-bar-2 h-full w-[2.5px] rounded-full bg-white/80" />
                <span className="eq-bar-3 h-full w-[2.5px] rounded-full bg-white" />
              </span>
            ) : (
              <IconMusic className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {prefs.bgmEnabled ? VIBE_LABELS[prefs.bgmVibe] : 'Nhạc chill'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAudioDrawer}
            title="Cài đặt Âm thanh & Giọng đọc TTS"
            aria-label="Cài đặt Âm thanh và Giọng đọc TTS"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-white px-2.5 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#EFEFEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447E5] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6] dark:hover:bg-[#23272E] sm:px-3"
          >
            <IconSliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Âm thanh &amp; TTS</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title={prefs.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label={prefs.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E4DF] bg-white text-[#141413] transition-colors hover:bg-[#EFEFEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2447E5] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-amber-300 dark:hover:bg-[#23272E]"
          >
            {prefs.theme === 'dark' ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
