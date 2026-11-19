import React, { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { computeResult } from '../lib/quizEngine';
import { ttsEngine, type TtsStateSnapshot } from '../lib/ttsEngine';
import type { ActiveSession, UserPrefs } from '../types/quiz';
import { ConfettiCanvas } from './ConfettiCanvas';
import { IconCheck, IconRefresh, IconStop, IconVolume, IconX } from './Icons';
import { RichText } from './RichText';

interface ResultScreenProps {
  session: ActiveSession;
  prefs: UserPrefs;
  onRetryWrong: () => void;
  onRestartSameDeck: () => void;
  onBackHome: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

function getHeadline(accuracy: number): string {
  if (accuracy >= 90) return 'Hoàn thành xuất sắc bộ đề.';
  if (accuracy >= 70) return 'Kết quả tốt, nền tảng đã rất vững.';
  if (accuracy >= 50) return 'Khá ổn, ôn lại các câu sai để nắm chắc hơn.';
  return 'Hãy xem giải thích và làm lại các câu chưa đúng.';
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  session,
  prefs,
  onRetryWrong,
  onRestartSameDeck,
  onBackHome,
}) => {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [ttsSnap, setTtsSnap] = useState<TtsStateSnapshot>(() => ttsEngine.getSnapshot());
  const [activeTtsId, setActiveTtsId] = useState<string | null>(null);

  const result = useMemo(() => computeResult(session), [session]);
  const missedCount = result.wrongCount + result.unansweredCount;

  useEffect(() => {
    const unsub = ttsEngine.subscribe((snap) => {
      setTtsSnap(snap);
      if (!snap.speaking) setActiveTtsId(null);
    });
    return () => {
      unsub();
      ttsEngine.stop();
    };
  }, []);

  const filteredQuestions = useMemo(() => {
    return session.questions
      .map((q, idx) => {
        const rec = session.answers[q.id];
        const isCorrect = Boolean(rec && rec.selectedOptionId === q.correctOptionId);
        return { q, idx, rec, isCorrect };
      })
      .filter((item) => {
        if (filter === 'wrong') return !item.isCorrect;
        if (filter === 'correct') return item.isCorrect;
        return true;
      });
  }, [session.questions, session.answers, filter]);

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.accuracy / 100) * circumference;

  const handleReadExplanation = (qId: string, explanation: string) => {
    audioEngine.unlock();
    ttsEngine.unlock();
    if (ttsSnap.speaking && activeTtsId === qId) {
      ttsEngine.stop();
      setActiveTtsId(null);
      return;
    }
    setActiveTtsId(qId);
    ttsEngine.speakExplanation(
      explanation,
      {
        langSetting: prefs.ttsLang,
        voiceURI: prefs.ttsVoiceURI,
        rate: prefs.ttsRate,
      },
      session.quizLanguage,
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6 sm:py-8">
      <ConfettiCanvas active={result.accuracy >= 70} />

      {/* Summary Sheet */}
      <section className="rounded-2xl border border-[#E4E4DF] bg-white p-5 dark:border-[#2B3038] dark:bg-[#1A1D22] sm:p-7">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* Flat clean progress ring */}
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="8"
                className="stroke-[#EAEAE4] dark:stroke-[#2B3038]"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`transition-all duration-500 ${
                  result.accuracy >= 70
                    ? 'stroke-[#168A5B]'
                    : result.accuracy >= 50
                      ? 'stroke-[#D9820B]'
                      : 'stroke-[#D9385A]'
                }`}
              />
            </svg>
            <div className="absolute text-center">
              <div className="font-display text-2xl font-bold tabular-nums text-[#141413] dark:text-[#F3F4F6]">
                {result.accuracy}%
              </div>
              <div className="font-mono text-[11px] font-semibold text-[#5C5C56] dark:text-[#9CA3AF]">
                {result.correctCount}/{result.totalCount}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-xs font-semibold text-[#5C5C56] dark:text-[#9CA3AF]">
              {session.settings.mode === 'practice' ? 'Luyện tập (Kahoot)' : 'Thi thật'} —{' '}
              {session.quizTitle}
            </div>
            <h1 className="font-display text-xl font-bold text-[#141413] dark:text-[#F3F4F6] sm:text-2xl">
              {getHeadline(result.accuracy)}
            </h1>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg bg-[#168A5B]/12 px-2.5 py-1 text-xs font-bold text-[#168A5B] dark:text-emerald-300">
                Đúng: {result.correctCount}
              </span>
              <span className="rounded-lg bg-[#D9385A]/12 px-2.5 py-1 text-xs font-bold text-[#D9385A] dark:text-rose-300">
                Sai: {result.wrongCount}
              </span>
              {result.unansweredCount > 0 && (
                <span className="rounded-lg bg-[#F7F7F5] px-2.5 py-1 text-xs font-bold text-[#5C5C56] dark:bg-[#121417] dark:text-[#9CA3AF]">
                  Bỏ trống: {result.unansweredCount}
                </span>
              )}
              <span className="rounded-lg bg-[#F7F7F5] px-2.5 py-1 text-xs font-semibold text-[#5C5C56] dark:bg-[#121417] dark:text-[#9CA3AF]">
                Thời gian: {formatDuration(result.durationMs)}
              </span>
              {session.settings.mode === 'practice' && (
                <>
                  <span className="rounded-lg bg-[#D9820B]/12 px-2.5 py-1 text-xs font-bold text-[#B86B04] dark:text-amber-300">
                    Max Streak: {result.maxStreak}
                  </span>
                  <span className="rounded-lg bg-[#2447E5]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#2447E5] dark:bg-[#4F75FF]/15 dark:text-[#7896FF]">
                    {result.points} điểm
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5 border-t border-[#E4E4DF] pt-5 dark:border-[#2B3038]">
          {missedCount > 0 && (
            <button
              type="button"
              onClick={onRetryWrong}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-b-2 border-[#A82240] bg-[#D9385A] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#C22D4D] sm:flex-none sm:text-sm"
            >
              <IconRefresh className="h-4 w-4" />
              <span>Ôn lại {missedCount} câu chưa đúng</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRestartSameDeck}
            className="inline-flex flex-1 items-center justify-center rounded-xl border-b-2 border-[#1631B0] bg-[#2447E5] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#1D3AC2] dark:border-[#2641C7] dark:bg-[#3B5BFF] sm:flex-none sm:text-sm"
          >
            Làm lại bộ đề
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] px-4 py-3 text-xs font-bold text-[#141413] transition-colors hover:bg-[#EAEAE4] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6] dark:hover:bg-[#23272E] sm:flex-none sm:text-sm"
          >
            Chọn bộ đề khác
          </button>
        </div>
      </section>

      {/* Detailed Review */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-[#141413] dark:text-[#F3F4F6]">
            Chi tiết đáp án và giải thích
          </h2>
          <div className="inline-flex rounded-lg border border-[#E4E4DF] bg-white p-0.5 dark:border-[#2B3038] dark:bg-[#1A1D22]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-[#141413] text-white dark:bg-[#F3F4F6] dark:text-[#141413]'
                  : 'text-[#5C5C56] dark:text-[#9CA3AF]'
              }`}
            >
              Tất cả ({result.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('wrong')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                filter === 'wrong'
                  ? 'bg-[#D9385A] text-white'
                  : 'text-[#5C5C56] dark:text-[#9CA3AF]'
              }`}
            >
              Chưa đúng ({missedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                filter === 'correct'
                  ? 'bg-[#168A5B] text-white'
                  : 'text-[#5C5C56] dark:text-[#9CA3AF]'
              }`}
            >
              Đúng ({result.correctCount})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map(({ q, idx, rec, isCorrect }) => {
            const isSpeakingThis = ttsSnap.speaking && activeTtsId === q.id;
            return (
              <article
                key={q.id}
                className={`rounded-xl border border-l-4 bg-white p-4 dark:bg-[#1A1D22] sm:p-5 ${
                  isCorrect
                    ? 'border-[#E4E4DF] border-l-[#168A5B] dark:border-[#2B3038] dark:border-l-[#168A5B]'
                    : 'border-[#E4E4DF] border-l-[#D9385A] dark:border-[#2B3038] dark:border-l-[#D9385A]'
                }`}
              >
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                        isCorrect
                          ? 'bg-[#168A5B]/12 text-[#168A5B] dark:text-emerald-300'
                          : 'bg-[#D9385A]/12 text-[#D9385A] dark:text-rose-300'
                      }`}
                    >
                      {isCorrect ? (
                        <IconCheck className="h-3 w-3" />
                      ) : (
                        <IconX className="h-3 w-3" />
                      )}
                      <span>
                        Câu {idx + 1}: {isCorrect ? 'Đúng' : rec?.selectedOptionId ? 'Sai' : 'Bỏ trống'}
                      </span>
                    </span>
                    {q.topic && (
                      <span className="rounded-md bg-[#F7F7F5] px-2 py-0.5 text-[11px] font-semibold text-[#5C5C56] dark:bg-[#121417] dark:text-[#9CA3AF]">
                        {q.topic}
                      </span>
                    )}
                  </div>

                  {ttsSnap.supported && q.explanation && (
                    <button
                      type="button"
                      onClick={() => handleReadExplanation(q.id, q.explanation)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] px-2.5 py-1 text-[11px] font-bold text-[#141413] transition-colors hover:border-[#2447E5] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]"
                    >
                      {isSpeakingThis ? (
                        <>
                          <IconStop className="h-3 w-3 text-[#168A5B]" />
                          <span>Dừng đọc</span>
                        </>
                      ) : (
                        <>
                          <IconVolume className="h-3 w-3" />
                          <span>Đọc giải thích</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <RichText
                  text={q.question}
                  className="text-sm font-semibold text-[#141413] dark:text-[#F3F4F6] sm:text-base"
                />

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const picked = rec?.selectedOptionId === opt.id;
                    const right = opt.id === q.correctOptionId;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                          right
                            ? 'border-[#168A5B] bg-[#168A5B]/8 text-[#141413] dark:bg-[#168A5B]/15 dark:text-[#F3F4F6]'
                            : picked
                              ? 'border-[#D9385A] bg-[#D9385A]/8 text-[#141413] dark:bg-[#D9385A]/15 dark:text-[#F3F4F6]'
                              : 'border-[#E4E4DF] bg-[#FBFBF9] text-[#5C5C56] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#9CA3AF]'
                        }`}
                      >
                        <span className="mt-0.5 font-mono font-bold">{letter}.</span>
                        <div className="min-w-0 flex-1">
                          <RichText text={opt.text} />
                        </div>
                        {right && <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#168A5B]" />}
                        {!right && picked && <IconX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9385A]" />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-3 rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] p-3 text-xs text-[#3A3A36] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#D1D5DB]">
                    <span className="mb-1 block font-bold text-[#141413] dark:text-[#F3F4F6]">
                      Giải thích:
                    </span>
                    <RichText text={q.explanation} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
