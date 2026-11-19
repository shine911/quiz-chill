export type QuizLanguage = 'auto' | 'vi' | 'en';

export interface RawQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic?: string;
}

export interface RawQuiz {
  id: string;
  title: string;
  description?: string;
  language?: QuizLanguage;
  questions: RawQuestion[];
  source?: 'sample' | 'file' | 'paste' | 'recent';
}

export type QuizMode = 'practice' | 'exam';
export type TimerMode = 'unlimited' | 'per-question' | 'total';

export interface QuizSettings {
  mode: QuizMode;
  timerMode: TimerMode;
  perQuestionSeconds: number;
  totalMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionLimit: number | 'all';
}

export interface PreparedOption {
  id: string;
  text: string;
  originalIndex: number;
}

export interface PreparedQuestion {
  id: string;
  originalIndex: number;
  question: string;
  options: PreparedOption[];
  correctOptionId: string;
  explanation: string;
  topic?: string;
}

export interface QuestionAnswerRecord {
  selectedOptionId: string | null;
  timedOut?: boolean;
  answeredAt: number;
  timeSpentMs: number;
}

export interface ActiveSession {
  sessionId: string;
  quizId: string;
  quizTitle: string;
  quizLanguage: QuizLanguage;
  settings: QuizSettings;
  questions: PreparedQuestion[];
  currentIndex: number;
  answers: Record<string, QuestionAnswerRecord>;
  flaggedIds: string[];
  streak: number;
  maxStreak: number;
  points: number;
  startedAt: number;
  finishedAt?: number;
  elapsedMs: number;
  remainingTotalSeconds: number | null;
  remainingQuestionSeconds: number | null;
  status: 'in-progress' | 'finished';
}

export type BgmVibe = 'lofi' | 'ambient' | 'rain' | 'custom';
export type TtsLangSetting = 'auto' | 'vi-VN' | 'en-US';

export interface UserPrefs {
  theme: 'light' | 'dark';
  bgmEnabled: boolean;
  bgmVibe: BgmVibe;
  bgmVolume: number;
  sfxEnabled: boolean;
  ttsAutoRead: boolean;
  ttsLang: TtsLangSetting;
  ttsVoiceURI: string;
  ttsRate: number;
}

export interface HistoryEntry {
  id: string;
  quizId: string;
  quizTitle: string;
  mode: QuizMode;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  points: number;
  maxStreak: number;
  durationMs: number;
  finishedAt: number;
}

export interface StoredDeck {
  id: string;
  title: string;
  description?: string;
  language?: QuizLanguage;
  questionCount: number;
  savedAt: number;
  quiz: RawQuiz;
}
