import { describe, expect, test } from 'bun:test';
import {
  computeResult,
  createRetryWrongSession,
  createSession,
  recordAnswer,
  toggleFlag,
} from '../quizEngine';
import type { QuizSettings, RawQuiz } from '../../types/quiz';

const SAMPLE: RawQuiz = {
  id: 'test-quiz',
  title: 'Test Quiz',
  language: 'vi',
  questions: [
    {
      id: 'q1',
      question: 'Q1',
      options: ['Correct1', 'Wrong1a', 'Wrong1b', 'Wrong1c'],
      answerIndex: 0,
      explanation: 'Exp 1',
    },
    {
      id: 'q2',
      question: 'Q2',
      options: ['Wrong2a', 'Correct2', 'Wrong2b', 'Wrong2c'],
      answerIndex: 1,
      explanation: 'Exp 2',
    },
    {
      id: 'q3',
      question: 'Q3',
      options: ['Wrong3a', 'Wrong3b', 'Correct3', 'Wrong3c'],
      answerIndex: 2,
      explanation: 'Exp 3',
    },
  ],
};

function makeSeededRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('quizEngine', () => {
  test('option shuffling preserves exact correctOptionId mapping', () => {
    const settings: QuizSettings = {
      mode: 'practice',
      timerMode: 'per-question',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: false,
      shuffleOptions: true,
      questionLimit: 'all',
    };

    const session = createSession(SAMPLE, settings, makeSeededRng(7));
    expect(session.questions).toHaveLength(3);

    const q1 = session.questions[0];
    const correct1 = q1.options.find((o) => o.id === q1.correctOptionId);
    expect(correct1?.text).toBe('Correct1');

    const q2 = session.questions[1];
    const correct2 = q2.options.find((o) => o.id === q2.correctOptionId);
    expect(correct2?.text).toBe('Correct2');
  });

  test('limits question count when questionLimit < total', () => {
    const settings: QuizSettings = {
      mode: 'practice',
      timerMode: 'unlimited',
      perQuestionSeconds: 30,
      totalMinutes: 10,
      shuffleQuestions: true,
      shuffleOptions: false,
      questionLimit: 2,
    };
    const session = createSession(SAMPLE, settings, makeSeededRng(9));
    expect(session.questions).toHaveLength(2);
  });

  test('practice mode computes streak, points, and locks answered question', () => {
    const settings: QuizSettings = {
      mode: 'practice',
      timerMode: 'per-question',
      perQuestionSeconds: 20,
      totalMinutes: 5,
      shuffleQuestions: false,
      shuffleOptions: false,
      questionLimit: 'all',
    };

    let session = createSession(SAMPLE, settings, makeSeededRng(1), 1000);
    const q1 = session.questions[0];
    const q2 = session.questions[1];
    const q3 = session.questions[2];

    // Q1 correct with full remaining seconds -> 100 + 0 + 50 = 150
    const res1 = recordAnswer(session, q1.id, q1.correctOptionId, {
      remainingQuestionSeconds: 20,
      timeSpentMs: 1000,
    });
    session = res1.session;
    expect(res1.isCorrect).toBe(true);
    expect(session.streak).toBe(1);
    expect(session.points).toBe(150);

    // Attempt to overwrite Q1 in practice mode should be ignored
    const wrongOpt = q1.options.find((o) => o.id !== q1.correctOptionId)!;
    const overwriteAttempt = recordAnswer(session, q1.id, wrongOpt.id);
    expect(overwriteAttempt.session.points).toBe(150);

    // Q2 correct with streak 2 -> 100 + 20 + 25 = 145
    const res2 = recordAnswer(session, q2.id, q2.correctOptionId, {
      remainingQuestionSeconds: 10,
      timeSpentMs: 10000,
    });
    session = res2.session;
    expect(session.streak).toBe(2);
    expect(session.maxStreak).toBe(2);
    expect(session.points).toBe(295);

    // Q3 timeout resets streak
    const res3 = recordAnswer(session, q3.id, null, { timedOut: true });
    session = res3.session;
    expect(res3.isCorrect).toBe(false);
    expect(session.streak).toBe(0);
    expect(session.maxStreak).toBe(2);
  });

  test('exam mode normalizes per-question timer, allows changing answers, flags, and retry-wrong', () => {
    const settings: QuizSettings = {
      mode: 'exam',
      timerMode: 'per-question', // should normalize to 'total'
      perQuestionSeconds: 30,
      totalMinutes: 15,
      shuffleQuestions: false,
      shuffleOptions: false,
      questionLimit: 'all',
    };

    let session = createSession(SAMPLE, settings, makeSeededRng(3), 1000);
    expect(session.settings.timerMode).toBe('total');
    expect(session.remainingTotalSeconds).toBe(900);
    expect(session.remainingQuestionSeconds).toBeNull();

    const q1 = session.questions[0];
    const q2 = session.questions[1];

    // Pick wrong on Q1, then change to right
    const wrong1 = q1.options.find((o) => o.id !== q1.correctOptionId)!;
    session = recordAnswer(session, q1.id, wrong1.id).session;
    session = recordAnswer(session, q1.id, q1.correctOptionId).session;

    // Pick wrong on Q2, leave Q3 unanswered
    const wrong2 = q2.options.find((o) => o.id !== q2.correctOptionId)!;
    session = recordAnswer(session, q2.id, wrong2.id).session;

    // Flag Q2
    session = toggleFlag(session, q2.id);
    expect(session.flaggedIds).toEqual([q2.id]);
    session = toggleFlag(session, q2.id);
    expect(session.flaggedIds).toEqual([]);

    const finished = { ...session, status: 'finished' as const, elapsedMs: 12000 };
    const result = computeResult(finished);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.accuracy).toBe(33);
    expect(result.wrongQuestions.map((q) => q.id)).toEqual(['q2', 'q3']);

    const retry = createRetryWrongSession(finished, makeSeededRng(5));
    expect(retry).not.toBeNull();
    expect(retry?.questions).toHaveLength(2);
  });
});
