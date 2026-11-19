import type {
  ActiveSession,
  PreparedOption,
  PreparedQuestion,
  QuizSettings,
  RawQuestion,
  RawQuiz,
} from '../types/quiz';

/**
 * Pure Fisher-Yates shuffle returning a new array without mutating the input.
 */
export function fisherYatesShuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sanitizeQuizSettings(
  settings: QuizSettings,
  totalAvailable: number,
): QuizSettings {
  const timerMode =
    settings.mode === 'exam' && settings.timerMode === 'per-question'
      ? 'total'
      : settings.timerMode;

  const perQuestionSeconds = Math.max(5, Math.min(300, Math.round(settings.perQuestionSeconds || 30)));
  const totalMinutes = Math.max(1, Math.min(180, Math.round(settings.totalMinutes || 10)));

  let questionLimit: number | 'all' = settings.questionLimit;
  if (typeof questionLimit === 'number') {
    if (!Number.isFinite(questionLimit) || questionLimit >= totalAvailable || questionLimit <= 0) {
      questionLimit = 'all';
    } else {
      questionLimit = Math.max(1, Math.round(questionLimit));
    }
  }

  return {
    ...settings,
    timerMode,
    perQuestionSeconds,
    totalMinutes,
    questionLimit,
  };
}

function buildPreparedQuestion(
  raw: RawQuestion,
  originalIndex: number,
  shuffleOptions: boolean,
  rng: () => number,
): PreparedQuestion {
  const rawOptions: PreparedOption[] = raw.options.map((text, idx) => ({
    id: `${raw.id}-opt-${idx}`,
    text,
    originalIndex: idx,
  }));

  const correctOptionId = `${raw.id}-opt-${raw.answerIndex}`;
  const options = shuffleOptions ? fisherYatesShuffle(rawOptions, rng) : rawOptions;

  return {
    id: raw.id,
    originalIndex,
    question: raw.question,
    options,
    correctOptionId,
    explanation: raw.explanation,
    topic: raw.topic,
  };
}

/**
 * Creates a brand-new ActiveSession from a RawQuiz and user settings.
 */
export function createSession(
  quiz: RawQuiz,
  rawSettings: QuizSettings,
  rng: () => number = Math.random,
  now: number = Date.now(),
): ActiveSession {
  const settings = sanitizeQuizSettings(rawSettings, quiz.questions.length);

  const indexed = quiz.questions.map((q, idx) => ({ q, idx }));
  const ordered = settings.shuffleQuestions ? fisherYatesShuffle(indexed, rng) : indexed;
  const limited =
    typeof settings.questionLimit === 'number'
      ? ordered.slice(0, settings.questionLimit)
      : ordered;

  const questions = limited.map(({ q, idx }) =>
    buildPreparedQuestion(q, idx, settings.shuffleOptions, rng),
  );

  const remainingTotalSeconds =
    settings.timerMode === 'total' ? settings.totalMinutes * 60 : null;
  const remainingQuestionSeconds =
    settings.mode === 'practice' && settings.timerMode === 'per-question'
      ? settings.perQuestionSeconds
      : null;

  return {
    sessionId: `sess-${now.toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`,
    quizId: quiz.id,
    quizTitle: quiz.title,
    quizLanguage: quiz.language ?? 'auto',
    settings,
    questions,
    currentIndex: 0,
    answers: {},
    flaggedIds: [],
    streak: 0,
    maxStreak: 0,
    points: 0,
    startedAt: now,
    elapsedMs: 0,
    remainingTotalSeconds,
    remainingQuestionSeconds,
    status: 'in-progress',
  };
}

export interface RecordAnswerOptions {
  timedOut?: boolean;
  timeSpentMs?: number;
  remainingQuestionSeconds?: number;
  now?: number;
}

/**
 * Records a user's answer (or timeout) for a question, updating streak & points in practice mode.
 */
export function recordAnswer(
  session: ActiveSession,
  questionId: string,
  optionId: string | null,
  opts: RecordAnswerOptions = {},
): { session: ActiveSession; isCorrect: boolean; pointsEarned: number } {
  const question = session.questions.find((q) => q.id === questionId);
  if (!question) {
    return { session, isCorrect: false, pointsEarned: 0 };
  }

  // Practice mode locks an answer once submitted/timed out
  if (session.settings.mode === 'practice' && session.answers[questionId]) {
    const existing = session.answers[questionId];
    return {
      session,
      isCorrect: existing.selectedOptionId === question.correctOptionId,
      pointsEarned: 0,
    };
  }

  const isCorrect = optionId !== null && optionId === question.correctOptionId;
  const now = opts.now ?? Date.now();
  const timeSpentMs = Math.max(0, opts.timeSpentMs ?? 0);

  const nextAnswers = {
    ...session.answers,
    [questionId]: {
      selectedOptionId: optionId,
      timedOut: opts.timedOut,
      answeredAt: now,
      timeSpentMs,
    },
  };

  if (session.settings.mode === 'exam') {
    return {
      session: {
        ...session,
        answers: nextAnswers,
      },
      isCorrect,
      pointsEarned: 0,
    };
  }

  let nextStreak = isCorrect ? session.streak + 1 : 0;
  let nextMaxStreak = Math.max(session.maxStreak, nextStreak);
  let pointsEarned = 0;

  if (isCorrect) {
    const streakBonus = Math.min(nextStreak - 1, 5) * 20;
    let speedBonus = 0;
    if (
      session.settings.timerMode === 'per-question' &&
      session.settings.perQuestionSeconds > 0
    ) {
      const rem = opts.remainingQuestionSeconds ?? session.remainingQuestionSeconds ?? 0;
      const ratio = Math.max(0, Math.min(1, rem / session.settings.perQuestionSeconds));
      speedBonus = Math.round(ratio * 50);
    }
    pointsEarned = 100 + streakBonus + speedBonus;
  }

  return {
    session: {
      ...session,
      answers: nextAnswers,
      streak: nextStreak,
      maxStreak: nextMaxStreak,
      points: session.points + pointsEarned,
    },
    isCorrect,
    pointsEarned,
  };
}

export function toggleFlag(session: ActiveSession, questionId: string): ActiveSession {
  const exists = session.flaggedIds.includes(questionId);
  const flaggedIds = exists
    ? session.flaggedIds.filter((id) => id !== questionId)
    : [...session.flaggedIds, questionId];
  return {
    ...session,
    flaggedIds,
  };
}

export interface QuizResultSummary {
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalCount: number;
  accuracy: number;
  points: number;
  maxStreak: number;
  durationMs: number;
  wrongQuestions: RawQuestion[];
}

function reconstructRawQuestion(pq: PreparedQuestion): RawQuestion {
  const sortedOptions = [...pq.options].sort((a, b) => a.originalIndex - b.originalIndex);
  const correctOpt = pq.options.find((o) => o.id === pq.correctOptionId);
  return {
    id: pq.id,
    question: pq.question,
    options: sortedOptions.map((o) => o.text),
    answerIndex: correctOpt ? correctOpt.originalIndex : 0,
    explanation: pq.explanation,
    topic: pq.topic,
  };
}

/**
 * Computes grading statistics and reconstructs missed RawQuestions for targeted retry.
 */
export function computeResult(session: ActiveSession): QuizResultSummary {
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const wrongQuestions: RawQuestion[] = [];

  for (const q of session.questions) {
    const rec = session.answers[q.id];
    if (!rec || rec.selectedOptionId === null) {
      unansweredCount += 1;
      wrongQuestions.push(reconstructRawQuestion(q));
    } else if (rec.selectedOptionId === q.correctOptionId) {
      correctCount += 1;
    } else {
      wrongCount += 1;
      wrongQuestions.push(reconstructRawQuestion(q));
    }
  }

  const totalCount = session.questions.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const durationMs =
    session.elapsedMs > 0
      ? session.elapsedMs
      : Math.max(0, (session.finishedAt ?? Date.now()) - session.startedAt);

  return {
    correctCount,
    wrongCount,
    unansweredCount,
    totalCount,
    accuracy,
    points: session.points,
    maxStreak: session.maxStreak,
    durationMs,
    wrongQuestions,
  };
}

/**
 * Creates a fresh reshuffled session containing only wrong or unanswered questions.
 */
export function createRetryWrongSession(
  finishedSession: ActiveSession,
  rng: () => number = Math.random,
  now: number = Date.now(),
): ActiveSession | null {
  const result = computeResult(finishedSession);
  if (result.wrongQuestions.length === 0) return null;

  const retryQuiz: RawQuiz = {
    id: `${finishedSession.quizId}-retry`,
    title: `${finishedSession.quizTitle} (Ôn câu sai)`,
    language: finishedSession.quizLanguage,
    questions: result.wrongQuestions,
  };

  return createSession(
    retryQuiz,
    {
      ...finishedSession.settings,
      questionLimit: 'all',
      shuffleQuestions: true,
      shuffleOptions: true,
    },
    rng,
    now,
  );
}
