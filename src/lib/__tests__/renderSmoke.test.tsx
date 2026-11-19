import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudioTtsDrawer } from '../../components/AudioTtsDrawer';
import { HomeScreen } from '../../components/HomeScreen';
import { QuizScreen } from '../../components/QuizScreen';
import { ResultScreen } from '../../components/ResultScreen';
import { SetupScreen } from '../../components/SetupScreen';
import { SAMPLE_QUIZ_EN, SAMPLE_QUIZ_VI } from '../../data/sampleQuizzes';
import { createSession, recordAnswer } from '../quizEngine';
import { getDefaultPrefs } from '../storage';
import type { QuizSettings } from '../../types/quiz';

const noop = () => {};

describe('UI render smoke tests', () => {
  const prefs = getDefaultPrefs();

  test('renders HomeScreen cleanly with empty and active saved session', () => {
    const htmlEmpty = renderToStaticMarkup(
      <HomeScreen
        savedSession={null}
        recentDecks={[]}
        history={[]}
        onResumeSession={noop}
        onDiscardSavedSession={noop}
        onSelectQuiz={noop}
        onDeleteDeck={noop}
        onClearAllData={noop}
      />,
    );
    expect(htmlEmpty).toContain('Nạp file JSON');
    expect(htmlEmpty).toContain(SAMPLE_QUIZ_VI.title.replace('&', '&amp;'));
    expect(htmlEmpty).toContain(SAMPLE_QUIZ_EN.title.replace('&', '&amp;'));

    const practiceSettings: QuizSettings = {
      mode: 'practice',
      timerMode: 'per-question',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: true,
      questionLimit: 'all',
    };
    const active = createSession(SAMPLE_QUIZ_VI, practiceSettings);

    const htmlResume = renderToStaticMarkup(
      <HomeScreen
        savedSession={active}
        recentDecks={[]}
        history={[]}
        onResumeSession={noop}
        onDiscardSavedSession={noop}
        onSelectQuiz={noop}
        onDeleteDeck={noop}
        onClearAllData={noop}
      />,
    );
    expect(htmlResume).toContain('Bài thi đang làm dở');
    expect(htmlResume).toContain('Tiếp tục làm bài');
  });

  test('renders SetupScreen cleanly for sample quiz', () => {
    const settings: QuizSettings = {
      mode: 'practice',
      timerMode: 'unlimited',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: true,
      shuffleOptions: true,
      questionLimit: 'all',
    };
    const html = renderToStaticMarkup(
      <SetupScreen
        quiz={SAMPLE_QUIZ_VI}
        warnings={[]}
        settings={settings}
        prefs={prefs}
        onChangeSettings={noop}
        onUpdatePrefs={noop}
        onOpenAudioDrawer={noop}
        onBack={noop}
        onStartQuiz={noop}
      />,
    );
    expect(html).toContain(SAMPLE_QUIZ_VI.title.replace('&', '&amp;'));
    expect(html).toContain('Luyện tập (Kiểu Kahoot)');
    expect(html).toContain('Thi thật (Online Exam)');
    expect(html).toContain('Bắt đầu làm bài');
  });

  test('renders QuizScreen in both Practice and Exam modes', () => {
    const practiceSession = createSession(SAMPLE_QUIZ_VI, {
      mode: 'practice',
      timerMode: 'per-question',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: false,
      questionLimit: 'all',
    });
    const practiceHtml = renderToStaticMarkup(
      <QuizScreen
        session={practiceSession}
        prefs={prefs}
        onUpdateSession={noop}
        onFinishSession={noop}
        onToggleBgm={noop}
      />,
    );
    expect(practiceHtml).toContain('Câu 1 / 8');
    expect(practiceHtml).toContain('30s');

    const examSession = createSession(SAMPLE_QUIZ_EN, {
      mode: 'exam',
      timerMode: 'total',
      perQuestionSeconds: 30,
      totalMinutes: 15,
      shuffleQuestions: false,
      shuffleOptions: false,
      questionLimit: 'all',
    });
    const examHtml = renderToStaticMarkup(
      <QuizScreen
        session={examSession}
        prefs={prefs}
        onUpdateSession={noop}
        onFinishSession={noop}
        onToggleBgm={noop}
      />,
    );
    expect(examHtml).toContain('Danh sách (0/8)');
    expect(examHtml).toContain('15:00');
  });

  test('renders ResultScreen with missed questions retry button and AudioTtsDrawer', () => {
    let session = createSession(SAMPLE_QUIZ_VI, {
      mode: 'practice',
      timerMode: 'unlimited',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: false,
      questionLimit: 'all',
    });
    const q1 = session.questions[0];
    session = recordAnswer(session, q1.id, q1.correctOptionId).session;
    const finished = { ...session, status: 'finished' as const, elapsedMs: 15000 };

    const resultHtml = renderToStaticMarkup(
      <ResultScreen
        session={finished}
        prefs={prefs}
        onRetryWrong={noop}
        onRestartSameDeck={noop}
        onBackHome={noop}
      />,
    );
    expect(resultHtml).toContain('Chi tiết đáp án');
    expect(resultHtml).toContain('Ôn lại 7 câu chưa đúng');

    const drawerHtml = renderToStaticMarkup(
      <AudioTtsDrawer open={true} prefs={prefs} onUpdatePrefs={noop} onClose={noop} />,
    );
    expect(drawerHtml).toContain('Lo-fi Piano');
    expect(drawerHtml).toContain('Warm Ambient');
    expect(drawerHtml).toContain('Tiếng mưa nhẹ');
    expect(drawerHtml).toContain('Web Speech API');
  });
});
