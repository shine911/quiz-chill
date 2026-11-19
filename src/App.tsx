import React, { useCallback, useEffect, useState } from 'react';
import { AudioTtsDrawer } from './components/AudioTtsDrawer';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { SetupScreen } from './components/SetupScreen';
import { audioEngine } from './lib/audioEngine';
import { computeResult, createRetryWrongSession, createSession } from './lib/quizEngine';
import {
  appendHistory,
  clearActiveSession,
  clearAllLocalData,
  deleteRecentDeck,
  loadActiveSession,
  loadHistory,
  loadPrefs,
  loadRecentDecks,
  saveActiveSession,
  savePrefs,
  saveRecentDeck,
} from './lib/storage';
import { ttsEngine } from './lib/ttsEngine';
import type {
  ActiveSession,
  HistoryEntry,
  QuizSettings,
  RawQuiz,
  StoredDeck,
  UserPrefs,
} from './types/quiz';

type ViewState = 'home' | 'setup' | 'quiz' | 'result';

const DEFAULT_SETTINGS: QuizSettings = {
  mode: 'practice',
  timerMode: 'unlimited',
  perQuestionSeconds: 30,
  totalMinutes: 10,
  shuffleQuestions: true,
  shuffleOptions: true,
  questionLimit: 'all',
};

export const App: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadPrefs());
  const [recentDecks, setRecentDecks] = useState<StoredDeck[]>(() => loadRecentDecks());
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [savedSession, setSavedSession] = useState<ActiveSession | null>(() =>
    loadActiveSession(),
  );

  const [view, setView] = useState<ViewState>('home');
  const [selectedQuiz, setSelectedQuiz] = useState<RawQuiz | null>(null);
  const [quizWarnings, setQuizWarnings] = useState<string[]>([]);
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [finishedSession, setFinishedSession] = useState<ActiveSession | null>(null);

  const [audioDrawerOpen, setAudioDrawerOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Sync theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [prefs.theme]);

  // Sync preferences to localStorage and audioEngine
  useEffect(() => {
    savePrefs(prefs);
    audioEngine.syncPreferences({
      bgmEnabled: prefs.bgmEnabled,
      vibe: prefs.bgmVibe,
      volume: prefs.bgmVolume,
      sfxEnabled: prefs.sfxEnabled,
    });
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleBgm = useCallback(() => {
    audioEngine.unlock();
    setPrefs((prev) => ({ ...prev, bgmEnabled: !prev.bgmEnabled }));
  }, []);

  const handleToggleTheme = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const handleSelectQuiz = useCallback((quiz: RawQuiz, warnings: string[] = []) => {
    setSelectedQuiz(quiz);
    setQuizWarnings(warnings);
    setQuizSettings({ ...DEFAULT_SETTINGS });
    if (quiz.source === 'file' || quiz.source === 'paste') {
      setRecentDecks(saveRecentDeck(quiz));
    }
    setView('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStartQuiz = useCallback(() => {
    if (!selectedQuiz) return;
    const newSession = createSession(selectedQuiz, quizSettings);
    saveActiveSession(newSession);
    setSavedSession(newSession);
    setActiveSession(newSession);
    setFinishedSession(null);
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedQuiz, quizSettings]);

  const handleUpdateSession = useCallback((next: ActiveSession) => {
    setActiveSession(next);
    setSavedSession(next);
    saveActiveSession(next);
  }, []);

  const handleFinishSession = useCallback((finalSession: ActiveSession) => {
    clearActiveSession();
    setSavedSession(null);
    setActiveSession(null);
    setFinishedSession(finalSession);

    const summary = computeResult(finalSession);
    const entry: HistoryEntry = {
      id: `hist-${Date.now().toString(36)}`,
      quizId: finalSession.quizId,
      quizTitle: finalSession.quizTitle,
      mode: finalSession.settings.mode,
      correctCount: summary.correctCount,
      totalCount: summary.totalCount,
      accuracy: summary.accuracy,
      points: summary.points,
      maxStreak: summary.maxStreak,
      durationMs: summary.durationMs,
      finishedAt: finalSession.finishedAt ?? Date.now(),
    };
    setHistory(appendHistory(entry));
    setView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResumeSavedSession = useCallback(() => {
    if (!savedSession) return;
    audioEngine.unlock();
    ttsEngine.unlock();
    setActiveSession(savedSession);
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [savedSession]);

  const handleDiscardSavedSession = useCallback(() => {
    clearActiveSession();
    setSavedSession(null);
  }, []);

  const handleRetryWrong = useCallback(() => {
    if (!finishedSession) return;
    audioEngine.unlock();
    ttsEngine.unlock();
    const retry = createRetryWrongSession(finishedSession);
    if (!retry) return;
    saveActiveSession(retry);
    setSavedSession(retry);
    setActiveSession(retry);
    setFinishedSession(null);
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [finishedSession]);

  const handleRestartSameDeck = useCallback(() => {
    ttsEngine.stop();
    if (selectedQuiz) {
      setView('setup');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (finishedSession) {
      // Reconstruct deck from finished session if started via resumed session
      const reconstructed: RawQuiz = {
        id: finishedSession.quizId,
        title: finishedSession.quizTitle,
        language: finishedSession.quizLanguage,
        questions: finishedSession.questions.map((pq) => {
          const sortedOpts = [...pq.options].sort((a, b) => a.originalIndex - b.originalIndex);
          const correct = pq.options.find((o) => o.id === pq.correctOptionId);
          return {
            id: pq.id,
            question: pq.question,
            options: sortedOpts.map((o) => o.text),
            answerIndex: correct ? correct.originalIndex : 0,
            explanation: pq.explanation,
            topic: pq.topic,
          };
        }),
      };
      setSelectedQuiz(reconstructed);
      setQuizWarnings([]);
      setView('setup');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setView('home');
    }
  }, [selectedQuiz, finishedSession]);

  const handleGoHomeRequest = useCallback(() => {
    if (view === 'quiz') {
      setShowLeaveConfirm(true);
      return;
    }
    ttsEngine.stop();
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const handleDeleteDeck = useCallback((id: string) => {
    setRecentDecks(deleteRecentDeck(id));
  }, []);

  const handleClearAllData = useCallback(() => {
    clearAllLocalData();
    setRecentDecks([]);
    setHistory([]);
    setSavedSession(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#141413] transition-colors dark:bg-[#121417] dark:text-[#F3F4F6]">
      <Header
        prefs={prefs}
        onGoHome={handleGoHomeRequest}
        onToggleBgm={handleToggleBgm}
        onOpenAudioDrawer={() => setAudioDrawerOpen(true)}
        onToggleTheme={handleToggleTheme}
      />

      <main>
        {view === 'home' && (
          <HomeScreen
            savedSession={savedSession}
            recentDecks={recentDecks}
            history={history}
            onResumeSession={handleResumeSavedSession}
            onDiscardSavedSession={handleDiscardSavedSession}
            onSelectQuiz={handleSelectQuiz}
            onDeleteDeck={handleDeleteDeck}
            onClearAllData={handleClearAllData}
          />
        )}

        {view === 'setup' && selectedQuiz && (
          <SetupScreen
            quiz={selectedQuiz}
            warnings={quizWarnings}
            settings={quizSettings}
            prefs={prefs}
            onChangeSettings={setQuizSettings}
            onUpdatePrefs={updatePrefs}
            onOpenAudioDrawer={() => setAudioDrawerOpen(true)}
            onBack={() => setView('home')}
            onStartQuiz={handleStartQuiz}
          />
        )}

        {view === 'quiz' && activeSession && (
          <QuizScreen
            session={activeSession}
            prefs={prefs}
            onUpdateSession={handleUpdateSession}
            onFinishSession={handleFinishSession}
            onToggleBgm={handleToggleBgm}
          />
        )}

        {view === 'result' && finishedSession && (
          <ResultScreen
            session={finishedSession}
            prefs={prefs}
            onRetryWrong={handleRetryWrong}
            onRestartSameDeck={handleRestartSameDeck}
            onBackHome={() => setView('home')}
          />
        )}
      </main>

      <AudioTtsDrawer
        open={audioDrawerOpen}
        prefs={prefs}
        onUpdatePrefs={updatePrefs}
        onClose={() => setAudioDrawerOpen(false)}
      />

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => setShowLeaveConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Thoát bài thi hiện tại"
        >
          <div
            className="animate-panel-reveal w-full max-w-sm rounded-2xl border border-[#E4E4DF] bg-white p-5 shadow-xl dark:border-[#2B3038] dark:bg-[#1A1D22]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-bold text-[#141413] dark:text-[#F3F4F6]">
              Quay về trang chủ?
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5C5C56] dark:text-[#9CA3AF]">
              Tiến độ bài thi hiện tại đã được lưu tạm tự động, bạn có thể bấm &ldquo;Tiếp tục làm bài&rdquo; ở trang chủ bất cứ lúc nào.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-[#E4E4DF] py-2.5 text-xs font-bold text-[#141413] hover:bg-[#F7F7F5] dark:border-[#2B3038] dark:text-[#F3F4F6] dark:hover:bg-[#23272E]"
              >
                Ở lại làm tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  ttsEngine.stop();
                  setView('home');
                }}
                className="flex-1 rounded-xl bg-[#2447E5] py-2.5 text-xs font-bold text-white hover:bg-[#1D3AC2] dark:bg-[#3B5BFF]"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
