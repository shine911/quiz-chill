import type { ActiveSession, HistoryEntry, RawQuiz, StoredDeck, UserPrefs } from '../types/quiz';

const KEYS = {
  PREFS: 'quizchill:prefs',
  SESSION: 'quizchill:session',
  DECKS: 'quizchill:decks',
  HISTORY: 'quizchill:history',
} as const;

const MAX_RECENT_DECKS = 6;
const MAX_HISTORY = 20;
const MAX_DECK_BYTES = 450 * 1024;

export function getDefaultPrefs(): UserPrefs {
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    theme: prefersDark ? 'dark' : 'light',
    bgmEnabled: false,
    bgmVibe: 'lofi',
    bgmVolume: 0.35,
    sfxEnabled: true,
    ttsAutoRead: false,
    ttsLang: 'auto',
    ttsVoiceURI: '',
    ttsRate: 1.0,
  };
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPrefs(): UserPrefs {
  const defaults = getDefaultPrefs();
  const saved = readJson<Partial<UserPrefs>>(KEYS.PREFS);
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    bgmVolume:
      typeof saved.bgmVolume === 'number'
        ? Math.max(0, Math.min(1, saved.bgmVolume))
        : defaults.bgmVolume,
    ttsRate:
      typeof saved.ttsRate === 'number'
        ? Math.max(0.75, Math.min(1.5, saved.ttsRate))
        : defaults.ttsRate,
  };
}

export function savePrefs(prefs: UserPrefs): void {
  writeJson(KEYS.PREFS, prefs);
}

export function loadActiveSession(): ActiveSession | null {
  const session = readJson<ActiveSession>(KEYS.SESSION);
  if (
    !session ||
    session.status !== 'in-progress' ||
    !Array.isArray(session.questions) ||
    session.questions.length === 0
  ) {
    return null;
  }
  return session;
}

export function saveActiveSession(session: ActiveSession): void {
  writeJson(KEYS.SESSION, session);
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(KEYS.SESSION);
  } catch {
    // ignore
  }
}

export function loadRecentDecks(): StoredDeck[] {
  const decks = readJson<StoredDeck[]>(KEYS.DECKS);
  return Array.isArray(decks) ? decks : [];
}

export function saveRecentDeck(quiz: RawQuiz): StoredDeck[] {
  const entry: StoredDeck = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    language: quiz.language,
    questionCount: quiz.questions.length,
    savedAt: Date.now(),
    quiz,
  };

  try {
    if (JSON.stringify(entry).length > MAX_DECK_BYTES) {
      return loadRecentDecks();
    }
  } catch {
    return loadRecentDecks();
  }

  const existing = loadRecentDecks().filter((d) => d.id !== quiz.id);
  const next = [entry, ...existing].slice(0, MAX_RECENT_DECKS);
  writeJson(KEYS.DECKS, next);
  return next;
}

export function deleteRecentDeck(id: string): StoredDeck[] {
  const next = loadRecentDecks().filter((d) => d.id !== id);
  writeJson(KEYS.DECKS, next);
  return next;
}

export function loadHistory(): HistoryEntry[] {
  const list = readJson<HistoryEntry[]>(KEYS.HISTORY);
  return Array.isArray(list) ? list : [];
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory();
  const next = [entry, ...existing].slice(0, MAX_HISTORY);
  writeJson(KEYS.HISTORY, next);
  return next;
}

export function clearAllLocalData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    Object.values(KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
}
