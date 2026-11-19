# AGENTS.md

Guidance for coding agents working in the **QuizChill**

## Project Overview

QuizChill is a 100% client-side, static multiple-choice quiz web app inspired by Kahoot and online exam platforms.
- **No backend, no authentication, no database**: all quiz parsing, shuffling, grading, audio, TTS, and persistence happen in the browser (`localStorage`).
- **Primary UI language**: Vietnamese, with built-in sample decks in both Vietnamese and English (`src/data/sampleQuizzes.ts`).
- **Target UX**: Responsive mobile-first layout (one-handed sticky bottom actions, safe-area padding) plus desktop keyboard shortcuts, Light/Dark theme, procedural Web Audio chill BGM + custom MP3 support, and free Web Speech API TTS.

## Runtime & Commands

This environment uses **Bun** (`node` and `npm` are not expected to be in `PATH`).

```bash
bun install      # Install dependencies
bun run dev      # Start Vite dev server
bun test         # Run unit + React SSR render smoke tests
bun run build    # Run `tsc --noEmit && vite build` -> emits static `dist/`
bun run preview  # Preview production `dist/` locally
```

Always run `bun test && bun run build` before considering any change complete.

## Tech Stack & Configuration Rules

- **React 18 + TypeScript (`strict: true`) + Vite 5 (`base: './'`)**.
- **Tailwind CSS v4 via `@tailwindcss/postcss`** (`postcss.config.js` + `src/index.css`):
  - Keep `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` so manual `.dark` class toggling (synced with `index.html` pre-paint script) continues to work.
  - Do not assume Tailwind v3 `tailwind.config.js` or non-standard breakpoints like `xs:`.
- **Zero extra UI icon/confetti runtime dependencies**: icons live in `src/components/Icons.tsx` and confetti in `src/components/ConfettiCanvas.tsx`. Keep bundle lean unless explicitly asked to add packages.
- `tsconfig.json` excludes `src/lib/__tests__` (tests use `bun:test` globals); keep `src/lib/__tests__` compatible with `bun test`.

## Architecture & Module Boundaries

- `src/types/quiz.ts` — Core domain types (`RawQuiz`, `QuizSettings`, `ActiveSession`, `UserPrefs`, `HistoryEntry`, `StoredDeck`).
- `src/lib/quizParser.ts` — `parseQuizJson()` & `createTemplateJsonString()`. Accepts canonical JSON and common variants (root array, `questions`/`items`/`data`/`quiz`, `options`/`choices`/`answers`, `{A,B,C,D}` maps, `optionA..optionD` flat fields, `0..3`, auto-detected `1..4`, letters `A..F`, or exact option text).
- `src/lib/quizEngine.ts` — Pure quiz state transitions (`fisherYatesShuffle`, `createSession`, `recordAnswer`, `toggleFlag`, `computeResult`, `createRetryWrongSession`) with injectable `rng` for deterministic tests.
- `src/lib/textFormat.ts` & `src/components/RichText.tsx` — Lightweight safe parser for fenced code blocks, inline `` `code` ``, `**bold**`, and `*italic*`, plus `stripMarkdownForTTS()`. **Never use `dangerouslySetInnerHTML`** for user JSON content.
- `src/lib/audioEngine.ts` — Singleton Web Audio API engine for 3 procedural chill vibes (`lofi`, `ambient`, `rain`), custom uploaded audio (`<audio>` ObjectURL), SFX, and smooth BGM ducking during TTS.
- `src/lib/ttsEngine.ts` — Singleton `window.speechSynthesis` wrapper with VI/EN auto-detection, natural voice scoring, sentence chunking, Safari cancel-delay handling, and `activeSegment` highlights.
- `src/lib/storage.ts` — Safe `localStorage` wrapper under `quizchill:*` keys (`prefs`, `session`, `decks`, `history`) with quota guards.
- `src/components/` — Top-level views (`HomeScreen`, `SetupScreen`, `QuizScreen`, `ResultScreen`) and shared UI (`Header`, `AudioTtsDrawer`, `RichText`, `ConfettiCanvas`, `Icons`).

## Critical Invariants to Preserve

1. **Mobile Audio / TTS Autoplay Compliance**:
   - Call `audioEngine.unlock()` and `ttsEngine.unlock()` synchronously inside direct user click handlers (such as "Bắt đầu làm bài", "Tiếp tục làm bài", drawer switches, and speaker buttons) so iOS Safari & mobile Chrome permit playback.
   - Guard all browser-only globals (`window`, `document`, `speechSynthesis`, `AudioContext`, `localStorage`) so `src/lib/*` and components remain safe under `bun test` (`react-dom/server`).
2. **React 18 StrictMode in `QuizScreen.tsx`**:
   - Avoid one-shot `prevIdRef` guards that break when StrictMode double-invokes mount/cleanup effects; trigger TTS auto-read and stop cleanup cleanly per `[session.sessionId, currentQuestionId]`.
   - Always call `ttsEngine.stop()` on question change, quiz completion, or unmount.
3. **Quiz Correctness & Modes**:
   - `shuffleOptions` must preserve exact `correctOptionId` mapping from the original `answerIndex`.
   - `exam` mode must normalize `per-question` timer settings to `total` so users can navigate freely between questions and flag items before submitting.
   - Keyboard shortcuts in `QuizScreen.tsx` must stay ignored when focus is inside `<input>`, `<textarea>`, `<select>`, `contentEditable`, or open modals.
4. **Testing Expectations**:
   - Update or add tests in `src/lib/__tests__/` whenever modifying parser rules, quiz engine scoring/shuffling, markdown/TTS formatting, or top-level screen props.
   - Verify UI layout has no horizontal overflow on narrow mobile viewports (~360px–390px) as well as desktop.
