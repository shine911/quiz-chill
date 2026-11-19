import React, { useState } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { ttsEngine } from '../lib/ttsEngine';
import type { QuizSettings, RawQuiz, TimerMode, UserPrefs } from '../types/quiz';
import {
  IconChevronLeft,
  IconClock,
  IconMusic,
  IconShuffle,
  IconSliders,
  IconVolume,
} from './Icons';
import { RichText } from './RichText';

interface SetupScreenProps {
  quiz: RawQuiz;
  warnings: string[];
  settings: QuizSettings;
  prefs: UserPrefs;
  onChangeSettings: (next: QuizSettings) => void;
  onUpdatePrefs: (patch: Partial<UserPrefs>) => void;
  onOpenAudioDrawer: () => void;
  onBack: () => void;
  onStartQuiz: () => void;
}

const PER_Q_PRESETS = [15, 30, 45, 60];
const TOTAL_MIN_PRESETS = [5, 10, 15, 30];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  quiz,
  warnings,
  settings,
  prefs,
  onChangeSettings,
  onUpdatePrefs,
  onOpenAudioDrawer,
  onBack,
  onStartQuiz,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const totalQuestions = quiz.questions.length;

  const setMode = (mode: QuizSettings['mode']) => {
    const nextTimer: TimerMode =
      mode === 'exam' && settings.timerMode === 'per-question' ? 'total' : settings.timerMode;
    onChangeSettings({ ...settings, mode, timerMode: nextTimer });
  };

  const handleStartClick = () => {
    audioEngine.unlock();
    ttsEngine.unlock();
    onStartQuiz();
  };

  const countChoices = [5, 10, 20, 30].filter((n) => n < totalQuestions);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#5C5C56] transition-colors hover:bg-black/5 hover:text-[#141413] dark:text-[#9CA3AF] dark:hover:bg-white/5 dark:hover:text-white"
      >
        <IconChevronLeft className="h-4 w-4" />
        <span>Chọn bộ đề khác</span>
      </button>

      {/* Deck Summary Header */}
      <section className="rounded-2xl border border-[#E4E4DF] bg-white p-5 dark:border-[#2B3038] dark:bg-[#1A1D22] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-[#2447E5]/10 px-2 py-0.5 font-mono font-bold text-[#2447E5] dark:bg-[#4F75FF]/15 dark:text-[#7896FF]">
                {totalQuestions} câu hỏi
              </span>
              <span className="rounded-md bg-[#F7F7F5] px-2 py-0.5 font-semibold text-[#5C5C56] dark:bg-[#121417] dark:text-[#9CA3AF]">
                {quiz.language === 'en'
                  ? 'English'
                  : quiz.language === 'vi'
                    ? 'Tiếng Việt'
                    : 'Tự động ngôn ngữ'}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold text-[#141413] dark:text-[#F3F4F6] sm:text-2xl">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-sm text-[#5C5C56] dark:text-[#9CA3AF]">{quiz.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="shrink-0 rounded-lg border border-[#E4E4DF] px-3 py-1.5 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#F7F7F5] dark:border-[#2B3038] dark:text-[#F3F4F6] dark:hover:bg-[#23272E]"
          >
            {showPreview ? 'Ẩn xem trước' : 'Xem trước 2 câu đầu'}
          </button>
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 space-y-1 rounded-xl border border-[#D9820B]/40 bg-[#D9820B]/8 px-3.5 py-2.5 text-xs text-[#9A5804] dark:text-amber-200">
            {warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>
        )}

        {showPreview && (
          <div className="animate-panel-reveal mt-4 space-y-3 border-t border-[#E4E4DF] pt-4 dark:border-[#2B3038]">
            {quiz.questions.slice(0, 2).map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl border border-[#E4E4DF] bg-[#FBFBF9] p-3.5 text-xs dark:border-[#2B3038] dark:bg-[#121417]"
              >
                <div className="mb-1 font-mono font-bold text-[#2447E5] dark:text-[#7896FF]">
                  Câu {idx + 1}
                </div>
                <RichText text={q.question} className="text-[#141413] dark:text-[#F3F4F6]" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unified Configuration Sheet */}
      <div className="divide-y divide-[#E4E4DF] rounded-2xl border border-[#E4E4DF] bg-white dark:divide-[#2B3038] dark:border-[#2B3038] dark:bg-[#1A1D22]">
        {/* Mode */}
        <section className="space-y-3 p-5 sm:p-6">
          <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
            Chế độ làm bài
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={`rounded-xl border p-4 text-left transition-colors ${
                settings.mode === 'practice'
                  ? 'border-[#2447E5] bg-[#2447E5]/5 ring-1 ring-[#2447E5] dark:border-[#4F75FF] dark:bg-[#4F75FF]/10 dark:ring-[#4F75FF]'
                  : 'border-[#E4E4DF] hover:border-[#C5C5BD] dark:border-[#2B3038] dark:hover:border-[#3E4550]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Luyện tập (Kiểu Kahoot)
                </span>
                <span className="rounded bg-[#D9385A]/12 px-2 py-0.5 text-[11px] font-bold text-[#D9385A] dark:text-rose-300">
                  Streak
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C5C56] dark:text-[#9CA3AF]">
                Chọn xong biết đúng/sai ngay lập tức, hiện giải thích chi tiết và tính chuỗi combo trả lời đúng.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('exam')}
              className={`rounded-xl border p-4 text-left transition-colors ${
                settings.mode === 'exam'
                  ? 'border-[#2447E5] bg-[#2447E5]/5 ring-1 ring-[#2447E5] dark:border-[#4F75FF] dark:bg-[#4F75FF]/10 dark:ring-[#4F75FF]'
                  : 'border-[#E4E4DF] hover:border-[#C5C5BD] dark:border-[#2B3038] dark:hover:border-[#3E4550]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Thi thật (Online Exam)
                </span>
                <span className="rounded bg-[#0E7AE6]/12 px-2 py-0.5 text-[11px] font-bold text-[#0E7AE6] dark:text-sky-300">
                  Gắn cờ
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C5C56] dark:text-[#9CA3AF]">
                Tự do chuyển qua lại các câu, đánh dấu câu phân vân và nộp bài một lần để chấm điểm.
              </p>
            </button>
          </div>
        </section>

        {/* Timer */}
        <section className="space-y-3.5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-[#2447E5] dark:text-[#7896FF]" />
            <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
              Giới hạn thời gian
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] p-1 dark:border-[#2B3038] dark:bg-[#121417]">
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, timerMode: 'unlimited' })}
              className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                settings.timerMode === 'unlimited'
                  ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                  : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF]'
              }`}
            >
              Không giới hạn
            </button>
            <button
              type="button"
              disabled={settings.mode === 'exam'}
              onClick={() => onChangeSettings({ ...settings, timerMode: 'per-question' })}
              className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                settings.mode === 'exam'
                  ? 'cursor-not-allowed text-[#A0A098] opacity-55 dark:text-[#555B66]'
                  : settings.timerMode === 'per-question'
                    ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                    : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF]'
              }`}
            >
              Mỗi câu (Kahoot)
            </button>
            <button
              type="button"
              onClick={() => onChangeSettings({ ...settings, timerMode: 'total' })}
              className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                settings.timerMode === 'total'
                  ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                  : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF]'
              }`}
            >
              Tổng thời gian
            </button>
          </div>

          {settings.mode === 'exam' && (
            <p className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
              Chế độ Thi thật hỗ trợ Không giới hạn hoặc Tổng thời gian cả bài để bạn thoải mái quay lại sửa đáp án.
            </p>
          )}

          {settings.timerMode === 'per-question' && settings.mode === 'practice' && (
            <div className="flex flex-wrap items-center gap-2">
              {PER_Q_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, perQuestionSeconds: sec })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    settings.perQuestionSeconds === sec
                      ? 'bg-[#2447E5] text-white dark:bg-[#3B5BFF]'
                      : 'bg-[#F7F7F5] text-[#141413] hover:bg-[#EAEAE4] dark:bg-[#121417] dark:text-[#F3F4F6]'
                  }`}
                >
                  {sec} giây
                </button>
              ))}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] px-2.5 py-1 dark:border-[#2B3038] dark:bg-[#121417]">
                <span className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">Tùy chỉnh:</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.perQuestionSeconds}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      perQuestionSeconds: Math.max(5, Math.min(300, Number(e.target.value) || 30)),
                    })
                  }
                  aria-label="Số giây mỗi câu"
                  className="w-14 bg-transparent text-center font-mono text-xs font-bold text-[#141413] focus:outline-none dark:text-white"
                />
                <span className="text-xs text-[#5C5C56]">s</span>
              </div>
            </div>
          )}

          {settings.timerMode === 'total' && (
            <div className="flex flex-wrap items-center gap-2">
              {TOTAL_MIN_PRESETS.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, totalMinutes: min })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    settings.totalMinutes === min
                      ? 'bg-[#2447E5] text-white dark:bg-[#3B5BFF]'
                      : 'bg-[#F7F7F5] text-[#141413] hover:bg-[#EAEAE4] dark:bg-[#121417] dark:text-[#F3F4F6]'
                  }`}
                >
                  {min} phút
                </button>
              ))}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] px-2.5 py-1 dark:border-[#2B3038] dark:bg-[#121417]">
                <span className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">Tùy chỉnh:</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={settings.totalMinutes}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      totalMinutes: Math.max(1, Math.min(180, Number(e.target.value) || 10)),
                    })
                  }
                  aria-label="Tổng số phút"
                  className="w-14 bg-transparent text-center font-mono text-xs font-bold text-[#141413] focus:outline-none dark:text-white"
                />
                <span className="text-xs text-[#5C5C56]">phút</span>
              </div>
            </div>
          )}
        </section>

        {/* Shuffle & Question Count */}
        <section className="space-y-3.5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <IconShuffle className="h-4 w-4 text-[#2447E5] dark:text-[#7896FF]" />
            <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
              Trộn đề và số lượng câu
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E4E4DF] bg-[#FBFBF9] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
              <div>
                <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Trộn thứ tự đáp án (A/B/C/D)
                </div>
                <div className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                  Xáo trộn 4 lựa chọn mỗi câu
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shuffleOptions}
                onChange={(e) =>
                  onChangeSettings({ ...settings, shuffleOptions: e.target.checked })
                }
                className="h-4 w-4 accent-[#2447E5]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E4E4DF] bg-[#FBFBF9] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
              <div>
                <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Trộn thứ tự câu hỏi
                </div>
                <div className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                  Ngẫu nhiên mỗi lượt làm bài
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) =>
                  onChangeSettings({ ...settings, shuffleQuestions: e.target.checked })
                }
                className="h-4 w-4 accent-[#2447E5]"
              />
            </label>
          </div>

          {totalQuestions > 3 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-xs font-semibold text-[#5C5C56] dark:text-[#9CA3AF]">
                Số câu muốn làm:
              </span>
              <button
                type="button"
                onClick={() => onChangeSettings({ ...settings, questionLimit: 'all' })}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  settings.questionLimit === 'all'
                    ? 'bg-[#2447E5] text-white dark:bg-[#3B5BFF]'
                    : 'bg-[#F7F7F5] text-[#141413] hover:bg-[#EAEAE4] dark:bg-[#121417] dark:text-[#F3F4F6]'
                }`}
              >
                Tất cả ({totalQuestions} câu)
              </button>
              {countChoices.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, questionLimit: n })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    settings.questionLimit === n
                      ? 'bg-[#2447E5] text-white dark:bg-[#3B5BFF]'
                      : 'bg-[#F7F7F5] text-[#141413] hover:bg-[#EAEAE4] dark:bg-[#121417] dark:text-[#F3F4F6]'
                  }`}
                >
                  {n} câu ngẫu nhiên
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Chill & TTS Quick Toggles */}
        <section className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
              Nhạc nền và giọng đọc
            </h2>
            <button
              type="button"
              onClick={onOpenAudioDrawer}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2447E5] hover:underline dark:text-[#7896FF]"
            >
              <IconSliders className="h-3.5 w-3.5" />
              <span>Tùy chỉnh chi tiết</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-[#E4E4DF] bg-[#FBFBF9] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
              <div className="flex items-center gap-2.5">
                <IconMusic className="h-4 w-4 text-[#2447E5] dark:text-[#7896FF]" />
                <div>
                  <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                    Nhạc nền chill
                  </div>
                  <div className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                    Vibe: {prefs.bgmVibe === 'lofi' ? 'Lo-fi Piano' : prefs.bgmVibe === 'ambient' ? 'Warm Ambient' : prefs.bgmVibe === 'rain' ? 'Mưa nhẹ' : 'MP3 cá nhân'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.bgmEnabled}
                onClick={() => {
                  audioEngine.unlock();
                  onUpdatePrefs({ bgmEnabled: !prefs.bgmEnabled });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs.bgmEnabled ? 'bg-[#2447E5]' : 'bg-[#D0D0C8] dark:bg-[#2B3038]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    prefs.bgmEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E4E4DF] bg-[#FBFBF9] px-4 py-3 dark:border-[#2B3038] dark:bg-[#121417]">
              <div className="flex items-center gap-2.5">
                <IconVolume className="h-4 w-4 text-[#168A5B] dark:text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-[#141413] dark:text-[#F3F4F6]">
                    Tự động đọc câu hỏi
                  </div>
                  <div className="text-[11px] text-[#5C5C56] dark:text-[#9CA3AF]">
                    TTS đọc câu hỏi và A/B/C/D
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.ttsAutoRead}
                onClick={() => {
                  ttsEngine.unlock();
                  onUpdatePrefs({ ttsAutoRead: !prefs.ttsAutoRead });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  prefs.ttsAutoRead ? 'bg-[#168A5B]' : 'bg-[#D0D0C8] dark:bg-[#2B3038]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    prefs.ttsAutoRead ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-3 z-20 sm:static">
        <button
          type="button"
          onClick={handleStartClick}
          className="font-display inline-flex w-full items-center justify-center rounded-xl border-b-2 border-[#1631B0] bg-[#2447E5] px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[#1D3AC2] active:translate-y-[1px] dark:border-[#2641C7] dark:bg-[#3B5BFF] dark:hover:bg-[#2E4EEB]"
        >
          Bắt đầu làm bài (
          {typeof settings.questionLimit === 'number'
            ? `${Math.min(settings.questionLimit, totalQuestions)} câu`
            : `${totalQuestions} câu`}
          )
        </button>
      </div>
    </div>
  );
};
