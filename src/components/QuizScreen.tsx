import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { recordAnswer, toggleFlag } from '../lib/quizEngine';
import { ttsEngine, type TtsStateSnapshot } from '../lib/ttsEngine';
import type { ActiveSession, UserPrefs } from '../types/quiz';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconFlag,
  IconFlame,
  IconGrid,
  IconStop,
  IconVolume,
  IconX,
  ShapeCircle,
  ShapeDiamond,
  ShapeSquare,
  ShapeTriangle,
} from './Icons';
import { RichText } from './RichText';

interface QuizScreenProps {
  session: ActiveSession;
  prefs: UserPrefs;
  onUpdateSession: (next: ActiveSession) => void;
  onFinishSession: (finalSession: ActiveSession) => void;
  onToggleBgm: () => void;
}

const OPTION_THEMES = [
  {
    letter: 'A',
    Shape: ShapeTriangle,
    badgeBg: 'bg-[#D9385A] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#D9385A] dark:border-[#2B3038] dark:hover:border-[#D9385A]',
  },
  {
    letter: 'B',
    Shape: ShapeDiamond,
    badgeBg: 'bg-[#0E7AE6] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#0E7AE6] dark:border-[#2B3038] dark:hover:border-[#0E7AE6]',
  },
  {
    letter: 'C',
    Shape: ShapeCircle,
    badgeBg: 'bg-[#D9820B] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#D9820B] dark:border-[#2B3038] dark:hover:border-[#D9820B]',
  },
  {
    letter: 'D',
    Shape: ShapeSquare,
    badgeBg: 'bg-[#168A5B] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#168A5B] dark:border-[#2B3038] dark:hover:border-[#168A5B]',
  },
  {
    letter: 'E',
    Shape: ShapeDiamond,
    badgeBg: 'bg-[#2447E5] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#2447E5] dark:border-[#2B3038] dark:hover:border-[#4F75FF]',
  },
  {
    letter: 'F',
    Shape: ShapeCircle,
    badgeBg: 'bg-[#6E56CF] text-white',
    idleBorder:
      'border-[#E4E4DF] border-b-[#D5D5CE] hover:border-[#6E56CF] dark:border-[#2B3038] dark:hover:border-[#6E56CF]',
  },
];

function formatSecondsMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  session,
  prefs,
  onUpdateSession,
  onFinishSession,
  onToggleBgm,
}) => {
  const [ttsSnap, setTtsSnap] = useState<TtsStateSnapshot>(() => ttsEngine.getSnapshot());
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState<number>(0);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const questionStartRef = useRef<number>(Date.now());

  const currentQuestion = session.questions[session.currentIndex];
  const currentQuestionId = currentQuestion?.id ?? null;
  const answerRecord = currentQuestion ? session.answers[currentQuestion.id] : undefined;
  const isPractice = session.settings.mode === 'practice';
  const isRevealed = isPractice && Boolean(answerRecord);
  const answeredCount = useMemo(() => Object.keys(session.answers).length, [session.answers]);

  useEffect(() => {
    const unsub = ttsEngine.subscribe(setTtsSnap);
    return () => {
      unsub();
    };
  }, []);

  // Reset per-question entry timestamp and handle TTS auto-read on question switch (StrictMode-safe)
  useEffect(() => {
    const q = sessionRef.current.questions.find((item) => item.id === currentQuestionId);
    if (!q || !currentQuestionId) return;

    questionStartRef.current = Date.now();
    setLastPointsEarned(0);

    const p = prefsRef.current;
    if (p.ttsAutoRead && !sessionRef.current.answers[currentQuestionId]) {
      ttsEngine.speakQuestionAndOptions(
        q,
        {
          langSetting: p.ttsLang,
          voiceURI: p.ttsVoiceURI,
          rate: p.ttsRate,
        },
        sessionRef.current.quizLanguage,
      );
    }

    return () => {
      ttsEngine.stop();
    };
  }, [session.sessionId, currentQuestionId]);

  // 1-second timer tick for elapsed time and total / per-question countdowns
  useEffect(() => {
    const interval = window.setInterval(() => {
      const s = sessionRef.current;
      if (s.status !== 'in-progress') return;

      const q = s.questions[s.currentIndex];
      const qAnswered = q ? Boolean(s.answers[q.id]) : false;

      let nextTotal = s.remainingTotalSeconds;
      if (s.settings.timerMode === 'total' && nextTotal !== null) {
        nextTotal = Math.max(0, nextTotal - 1);
      }

      let nextPerQ = s.remainingQuestionSeconds;
      if (
        s.settings.mode === 'practice' &&
        s.settings.timerMode === 'per-question' &&
        nextPerQ !== null &&
        !qAnswered
      ) {
        nextPerQ = Math.max(0, nextPerQ - 1);
      }

      const nextElapsed = s.elapsedMs + 1000;

      if (
        (nextTotal !== null && nextTotal > 0 && nextTotal <= 5) ||
        (nextPerQ !== null && nextPerQ > 0 && nextPerQ <= 5 && !qAnswered)
      ) {
        audioEngine.playSfx('tick');
      }

      if (s.settings.timerMode === 'total' && nextTotal === 0) {
        audioEngine.playSfx('timeout');
        ttsEngine.stop();
        onFinishSession({
          ...s,
          elapsedMs: nextElapsed,
          remainingTotalSeconds: 0,
          remainingQuestionSeconds: nextPerQ,
          finishedAt: Date.now(),
          status: 'finished',
        });
        return;
      }

      if (
        s.settings.mode === 'practice' &&
        s.settings.timerMode === 'per-question' &&
        nextPerQ === 0 &&
        q &&
        !qAnswered
      ) {
        audioEngine.playSfx('timeout');
        const { session: timedOutSession } = recordAnswer(s, q.id, null, {
          timedOut: true,
          timeSpentMs: s.settings.perQuestionSeconds * 1000,
          remainingQuestionSeconds: 0,
        });
        onUpdateSession({
          ...timedOutSession,
          elapsedMs: nextElapsed,
          remainingTotalSeconds: nextTotal,
          remainingQuestionSeconds: 0,
        });
        return;
      }

      onUpdateSession({
        ...s,
        elapsedMs: nextElapsed,
        remainingTotalSeconds: nextTotal,
        remainingQuestionSeconds: nextPerQ,
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [onFinishSession, onUpdateSession]);

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    if (isPractice && answerRecord) return;

    audioEngine.unlock();
    const spentMs = Math.max(200, Date.now() - questionStartRef.current);
    const { session: nextSession, isCorrect, pointsEarned } = recordAnswer(
      session,
      currentQuestion.id,
      optionId,
      {
        timeSpentMs: spentMs,
        remainingQuestionSeconds: session.remainingQuestionSeconds ?? undefined,
      },
    );

    if (isPractice) {
      setLastPointsEarned(pointsEarned);
      if (isCorrect) {
        audioEngine.playSfx(nextSession.streak >= 2 ? 'streak' : 'correct');
      } else {
        audioEngine.playSfx('wrong');
      }
    } else {
      audioEngine.playSfx('click');
    }

    onUpdateSession(nextSession);
  };

  const navigateToIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= session.questions.length) return;
    const targetQ = session.questions[nextIndex];
    const targetAnswered = Boolean(session.answers[targetQ.id]);
    const resetQuestionTimer =
      session.settings.mode === 'practice' &&
      session.settings.timerMode === 'per-question' &&
      !targetAnswered
        ? session.settings.perQuestionSeconds
        : session.settings.mode === 'practice' && session.settings.timerMode === 'per-question'
          ? 0
          : null;

    onUpdateSession({
      ...session,
      currentIndex: nextIndex,
      remainingQuestionSeconds: resetQuestionTimer,
    });
  };

  const handleNextOrFinish = () => {
    if (session.currentIndex + 1 < session.questions.length) {
      navigateToIndex(session.currentIndex + 1);
      return;
    }

    if (isPractice) {
      audioEngine.playSfx('finish');
      ttsEngine.stop();
      onFinishSession({
        ...session,
        finishedAt: Date.now(),
        status: 'finished',
      });
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const handleSpeakQuestionAndOptions = () => {
    if (!currentQuestion) return;
    audioEngine.unlock();
    ttsEngine.unlock();
    if (ttsSnap.speaking) {
      ttsEngine.stop();
      return;
    }
    ttsEngine.speakQuestionAndOptions(
      currentQuestion,
      {
        langSetting: prefs.ttsLang,
        voiceURI: prefs.ttsVoiceURI,
        rate: prefs.ttsRate,
      },
      session.quizLanguage,
    );
  };

  const handleSpeakQuestionOnly = () => {
    if (!currentQuestion) return;
    audioEngine.unlock();
    ttsEngine.unlock();
    ttsEngine.speakQuestionOnly(
      currentQuestion,
      {
        langSetting: prefs.ttsLang,
        voiceURI: prefs.ttsVoiceURI,
        rate: prefs.ttsRate,
      },
      session.quizLanguage,
    );
  };

  const handleSpeakExplanation = () => {
    if (!currentQuestion?.explanation) return;
    audioEngine.unlock();
    ttsEngine.unlock();
    if (ttsSnap.speaking && ttsSnap.activeSegment === 'explanation') {
      ttsEngine.stop();
      return;
    }
    ttsEngine.speakExplanation(
      currentQuestion.explanation,
      {
        langSetting: prefs.ttsLang,
        voiceURI: prefs.ttsVoiceURI,
        rate: prefs.ttsRate,
      },
      session.quizLanguage,
    );
  };

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showNavigator || showSubmitConfirm) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(key)) {
        const map: Record<string, number> = {
          '1': 0,
          a: 0,
          '2': 1,
          b: 1,
          '3': 2,
          c: 2,
          '4': 3,
          d: 3,
        };
        const idx = map[key];
        const opt = currentQuestion?.options[idx];
        if (opt) {
          e.preventDefault();
          handleSelectOption(opt.id);
        }
        return;
      }

      if (key === 'arrowright' || key === 'enter') {
        if (!isPractice || isRevealed) {
          e.preventDefault();
          handleNextOrFinish();
        }
      } else if (key === 'arrowleft') {
        if (session.currentIndex > 0) {
          e.preventDefault();
          navigateToIndex(session.currentIndex - 1);
        }
      } else if (key === 'r') {
        e.preventDefault();
        handleSpeakQuestionAndOptions();
      } else if (key === 'f' && !isPractice && currentQuestion) {
        e.preventDefault();
        onUpdateSession(toggleFlag(session, currentQuestion.id));
      } else if (key === 'm') {
        e.preventDefault();
        onToggleBgm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!currentQuestion) return null;

  const progressPct = Math.round(((session.currentIndex + 1) / session.questions.length) * 100);
  const isFlagged = session.flaggedIds.includes(currentQuestion.id);

  let timerLabel = 'Không giới hạn';
  let timerUrgency: 'normal' | 'warn' | 'critical' = 'normal';

  if (session.settings.timerMode === 'per-question' && session.remainingQuestionSeconds !== null) {
    const rem = session.remainingQuestionSeconds;
    const total = session.settings.perQuestionSeconds;
    timerLabel = `${rem}s`;
    if (rem <= 5 && !isRevealed) timerUrgency = 'critical';
    else if (rem <= total * 0.25 && !isRevealed) timerUrgency = 'warn';
  } else if (session.settings.timerMode === 'total' && session.remainingTotalSeconds !== null) {
    const rem = session.remainingTotalSeconds;
    const total = session.settings.totalMinutes * 60;
    timerLabel = formatSecondsMMSS(rem);
    if (rem <= 10) timerUrgency = 'critical';
    else if (rem <= total * 0.25) timerUrgency = 'warn';
  }

  const isCorrectAnswer =
    isRevealed && answerRecord?.selectedOptionId === currentQuestion.correctOptionId;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-4xl flex-col px-3 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-10">
      {/* Top Status Strip */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[#E4E4DF] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#141413] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6]">
              Câu {session.currentIndex + 1} / {session.questions.length}
            </span>
            {currentQuestion.topic && (
              <span className="rounded-lg bg-[#2447E5]/10 px-2.5 py-1 text-xs font-semibold text-[#2447E5] dark:bg-[#4F75FF]/15 dark:text-[#7896FF]">
                {currentQuestion.topic}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isPractice ? (
              <>
                {session.streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#D9820B]/12 px-2.5 py-1 text-xs font-bold text-[#B86B04] dark:text-amber-300">
                    <IconFlame className="h-3.5 w-3.5 text-[#D9820B]" />
                    <span>{session.streak}</span>
                  </span>
                )}
                <span className="rounded-lg border border-[#E4E4DF] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#141413] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6]">
                  {session.points} đ
                </span>
              </>
            ) : (
              <>
                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#5C5C56] ring-1 ring-[#E4E4DF] dark:bg-[#1A1D22] dark:text-[#9CA3AF] dark:ring-[#2B3038]">
                  Đã chọn {answeredCount}/{session.questions.length}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateSession(toggleFlag(session, currentQuestion.id))}
                  aria-pressed={isFlagged}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                    isFlagged
                      ? 'border-[#D9820B] bg-[#D9820B]/12 text-[#B86B04] dark:text-amber-300'
                      : 'border-[#E4E4DF] bg-white text-[#5C5C56] hover:text-[#141413] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#9CA3AF]'
                  }`}
                >
                  <IconFlag filled={isFlagged} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                </button>
              </>
            )}

            {session.settings.timerMode !== 'unlimited' && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                  timerUrgency === 'critical'
                    ? 'animate-pulse-soft bg-[#D9385A] text-white'
                    : timerUrgency === 'warn'
                      ? 'bg-[#D9820B] text-white'
                      : 'bg-[#141413] text-white dark:bg-[#2B3038]'
                }`}
              >
                <IconClock className="h-3.5 w-3.5" />
                <span>{timerLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* Crisp flat progress rule */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4E4DF] dark:bg-[#2B3038]">
          <div
            className="h-full rounded-full bg-[#2447E5] transition-all duration-300 dark:bg-[#4F75FF]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <article
        className={`mt-4 rounded-2xl border bg-white p-4 transition-colors sm:p-6 dark:bg-[#1A1D22] ${
          ttsSnap.speaking && ttsSnap.activeSegment === 'question'
            ? 'border-[#168A5B] ring-2 ring-[#168A5B]/25'
            : 'border-[#E4E4DF] dark:border-[#2B3038]'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#5C5C56] dark:text-[#9CA3AF]">
            {session.quizTitle}
          </span>
          {ttsSnap.supported && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSpeakQuestionAndOptions}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                  ttsSnap.speaking
                    ? 'border-[#168A5B] bg-[#168A5B] text-white'
                    : 'border-[#E4E4DF] bg-[#FBFBF9] text-[#141413] hover:border-[#2447E5] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]'
                }`}
              >
                {ttsSnap.speaking ? (
                  <>
                    <IconStop className="h-3.5 w-3.5" />
                    <span>Dừng đọc</span>
                  </>
                ) : (
                  <>
                    <IconVolume className="h-3.5 w-3.5" />
                    <span>Đọc câu &amp; đáp án</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSpeakQuestionOnly}
                title="Chỉ đọc câu hỏi"
                className="rounded-lg border border-[#E4E4DF] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5C5C56] transition-colors hover:text-[#141413] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#9CA3AF]"
              >
                Chỉ câu hỏi
              </button>
            </div>
          )}
        </div>

        <RichText
          text={currentQuestion.question}
          className="text-base font-semibold leading-relaxed text-[#141413] dark:text-[#F3F4F6] sm:text-lg"
        />
      </article>

      {/* Answer Options Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
        {currentQuestion.options.map((opt, idx) => {
          const theme = OPTION_THEMES[idx] ?? OPTION_THEMES[0];
          const Shape = theme.Shape;
          const isSelected = answerRecord?.selectedOptionId === opt.id;
          const isCorrectOpt = opt.id === currentQuestion.correctOptionId;
          const isTtsFocused = ttsSnap.speaking && ttsSnap.activeSegment === `option-${idx}`;

          let cardClass = `border border-b-2 bg-white dark:bg-[#1A1D22] ${theme.idleBorder}`;
          let statusIcon: React.ReactNode = null;

          if (isRevealed) {
            if (isCorrectOpt) {
              cardClass =
                'border-2 border-[#168A5B] bg-[#168A5B]/8 dark:bg-[#168A5B]/15';
              statusIcon = (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#168A5B] text-white">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
              );
            } else if (isSelected) {
              cardClass =
                'animate-shake border-2 border-[#D9385A] bg-[#D9385A]/8 dark:bg-[#D9385A]/15';
              statusIcon = (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D9385A] text-white">
                  <IconX className="h-3.5 w-3.5" />
                </span>
              );
            } else {
              cardClass =
                'border border-[#E4E4DF] bg-white/60 opacity-50 dark:border-[#2B3038] dark:bg-[#1A1D22]/60';
            }
          } else if (isSelected) {
            cardClass =
              'border-2 border-[#2447E5] bg-[#2447E5]/6 dark:border-[#4F75FF] dark:bg-[#4F75FF]/12';
            statusIcon = (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2447E5] text-white dark:bg-[#3B5BFF]">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
            );
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isRevealed}
              onClick={() => handleSelectOption(opt.id)}
              className={`group flex min-h-[64px] w-full items-center gap-3 rounded-xl p-3.5 text-left transition-colors active:translate-y-[1px] sm:p-4 ${cardClass} ${
                isTtsFocused ? 'ring-2 ring-[#168A5B]' : ''
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-bold ${theme.badgeBg}`}
              >
                <Shape className="h-3 w-3" />
                <span className="mt-0.5 leading-none">{theme.letter}</span>
              </span>

              <div className="min-w-0 flex-1 text-sm font-medium text-[#141413] dark:text-[#F3F4F6]">
                <RichText text={opt.text} />
              </div>

              {statusIcon}
            </button>
          );
        })}
      </div>

      {/* Practice Mode Instant Explanation */}
      {isRevealed && (
        <section
          className={`animate-panel-reveal mt-4 rounded-2xl border border-l-4 p-4 sm:p-5 ${
            isCorrectAnswer
              ? 'border-[#E4E4DF] border-l-[#168A5B] bg-white dark:border-[#2B3038] dark:border-l-[#168A5B] dark:bg-[#1A1D22]'
              : 'border-[#E4E4DF] border-l-[#D9385A] bg-white dark:border-[#2B3038] dark:border-l-[#D9385A] dark:bg-[#1A1D22]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white ${
                  isCorrectAnswer ? 'bg-[#168A5B]' : 'bg-[#D9385A]'
                }`}
              >
                {isCorrectAnswer ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
              </span>
              <div className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                {answerRecord?.timedOut
                  ? 'Hết giờ cho câu hỏi này'
                  : isCorrectAnswer
                    ? `Chính xác${lastPointsEarned > 0 ? ` (+${lastPointsEarned} điểm)` : ''}`
                    : 'Chưa chính xác'}
              </div>
            </div>

            {ttsSnap.supported && currentQuestion.explanation && (
              <button
                type="button"
                onClick={handleSpeakExplanation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] px-2.5 py-1 text-xs font-bold text-[#141413] transition-colors hover:border-[#2447E5] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]"
              >
                <IconVolume className="h-3.5 w-3.5" />
                <span>
                  {ttsSnap.speaking && ttsSnap.activeSegment === 'explanation'
                    ? 'Dừng đọc'
                    : 'Đọc giải thích'}
                </span>
              </button>
            )}
          </div>

          <div className="mt-3 text-sm text-[#3A3A36] dark:text-[#D1D5DB]">
            {currentQuestion.explanation ? (
              <RichText text={currentQuestion.explanation} />
            ) : (
              <p className="italic text-[#5C5C56] dark:text-[#9CA3AF]">
                Bộ đề không cung cấp giải thích chi tiết cho câu hỏi này.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Desktop keyboard legend */}
      <p className="mt-4 hidden text-center text-[11px] text-[#5C5C56] dark:text-[#9CA3AF] sm:block">
        Phím tắt: <kbd className="rounded border border-[#D5D5CE] px-1 dark:border-[#2B3038]">A–D</kbd> hoặc{' '}
        <kbd className="rounded border border-[#D5D5CE] px-1 dark:border-[#2B3038]">1–4</kbd> chọn đáp án,{' '}
        <kbd className="rounded border border-[#D5D5CE] px-1 dark:border-[#2B3038]">Enter</kbd> câu tiếp,{' '}
        <kbd className="rounded border border-[#D5D5CE] px-1 dark:border-[#2B3038]">R</kbd> đọc TTS,{' '}
        <kbd className="rounded border border-[#D5D5CE] px-1 dark:border-[#2B3038]">M</kbd> bật/tắt nhạc
      </p>

      {/* Bottom Sticky Action Bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-[#E4E4DF] bg-[#F7F7F5]/95 px-3 pt-2.5 backdrop-blur-xs dark:border-[#2B3038] dark:bg-[#121417]/95 sm:static sm:mt-6 sm:border-t-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <button
            type="button"
            disabled={session.currentIndex === 0}
            onClick={() => navigateToIndex(session.currentIndex - 1)}
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-[#E4E4DF] bg-white px-3.5 text-xs font-bold text-[#141413] transition-colors hover:bg-[#EFEFEA] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6]"
          >
            <IconChevronLeft className="h-4 w-4" />
            <span>Câu trước</span>
          </button>

          {!isPractice && (
            <button
              type="button"
              onClick={() => setShowNavigator(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#E4E4DF] bg-white px-3.5 text-xs font-bold text-[#141413] transition-colors hover:bg-[#EFEFEA] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6]"
            >
              <IconGrid className="h-4 w-4 text-[#2447E5] dark:text-[#7896FF]" />
              <span>
                Danh sách ({answeredCount}/{session.questions.length})
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {!isPractice && session.currentIndex + 1 < session.questions.length && (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="hidden h-11 items-center rounded-xl border border-[#2447E5]/30 bg-[#2447E5]/8 px-3.5 text-xs font-bold text-[#2447E5] transition-colors hover:bg-[#2447E5]/15 dark:border-[#4F75FF]/40 dark:text-[#7896FF] sm:inline-flex"
              >
                Nộp bài
              </button>
            )}

            <button
              type="button"
              disabled={isPractice && !isRevealed}
              onClick={handleNextOrFinish}
              className="font-display inline-flex h-11 items-center gap-1.5 rounded-xl border-b-2 border-[#1631B0] bg-[#2447E5] px-5 text-xs font-bold text-white transition-colors hover:bg-[#1D3AC2] disabled:cursor-not-allowed disabled:border-transparent disabled:opacity-45 dark:border-[#2641C7] dark:bg-[#3B5BFF] sm:text-sm"
            >
              <span>
                {session.currentIndex + 1 < session.questions.length
                  ? 'Câu tiếp theo'
                  : isPractice
                    ? 'Xem kết quả'
                    : 'Nộp bài thi'}
              </span>
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Exam Question Navigator Modal */}
      {showNavigator && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setShowNavigator(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Danh sách câu hỏi"
        >
          <div
            className="animate-panel-reveal w-full max-w-lg rounded-t-2xl border border-[#E4E4DF] bg-white p-5 shadow-xl dark:border-[#2B3038] dark:bg-[#1A1D22] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E4E4DF] pb-3 dark:border-[#2B3038]">
              <div>
                <h3 className="font-display text-base font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Danh sách câu hỏi
                </h3>
                <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
                  Đã làm {answeredCount}/{session.questions.length}, đánh dấu {session.flaggedIds.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-[#5C5C56] hover:bg-black/5 dark:text-[#9CA3AF]"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 grid max-h-64 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-6">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === session.currentIndex;
                const isAns = Boolean(session.answers[q.id]?.selectedOptionId);
                const flagged = session.flaggedIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      navigateToIndex(idx);
                      setShowNavigator(false);
                    }}
                    className={`relative flex h-11 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'border-[#2447E5] bg-[#2447E5] text-white'
                        : isAns
                          ? 'border-[#168A5B]/50 bg-[#168A5B]/10 text-[#168A5B] dark:text-emerald-300'
                          : 'border-[#E4E4DF] bg-[#F7F7F5] text-[#141413] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]'
                    }`}
                  >
                    {idx + 1}
                    {flagged && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-[#D9820B] dark:border-[#1A1D22]" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowNavigator(false);
                setShowSubmitConfirm(true);
              }}
              className="w-full rounded-xl bg-[#2447E5] py-3 text-sm font-bold text-white transition-colors hover:bg-[#1D3AC2] dark:bg-[#3B5BFF]"
            >
              Nộp bài ngay
            </button>
          </div>
        </div>
      )}

      {/* Exam Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowSubmitConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận nộp bài"
        >
          <div
            className="animate-panel-reveal w-full max-w-sm rounded-2xl border border-[#E4E4DF] bg-white p-5 shadow-xl dark:border-[#2B3038] dark:bg-[#1A1D22]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-[#141413] dark:text-[#F3F4F6]">
              Xác nhận nộp bài?
            </h3>
            <div className="mt-3 space-y-1.5 rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] p-3.5 text-xs dark:border-[#2B3038] dark:bg-[#121417]">
              <div className="flex justify-between">
                <span className="text-[#5C5C56] dark:text-[#9CA3AF]">Số câu đã chọn:</span>
                <span className="font-mono font-bold text-[#168A5B] dark:text-emerald-400">
                  {answeredCount} / {session.questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C56] dark:text-[#9CA3AF]">Chưa trả lời:</span>
                <span className="font-mono font-bold text-[#D9385A] dark:text-rose-400">
                  {session.questions.length - answeredCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5C56] dark:text-[#9CA3AF]">Đang gắn cờ xem lại:</span>
                <span className="font-mono font-bold text-[#D9820B] dark:text-amber-300">
                  {session.flaggedIds.length}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-[#E4E4DF] py-2.5 text-xs font-bold text-[#141413] hover:bg-[#F7F7F5] dark:border-[#2B3038] dark:text-[#F3F4F6] dark:hover:bg-[#23272E]"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  audioEngine.playSfx('finish');
                  ttsEngine.stop();
                  onFinishSession({
                    ...session,
                    finishedAt: Date.now(),
                    status: 'finished',
                  });
                }}
                className="flex-1 rounded-xl bg-[#2447E5] py-2.5 text-xs font-bold text-white hover:bg-[#1D3AC2] dark:bg-[#3B5BFF]"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
