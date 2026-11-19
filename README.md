# QuizChill — Client-Side Multiple-Choice Quiz Web App

**QuizChill** is a 100% client-side multiple-choice quiz web application inspired by Kahoot and modern online exam platforms — no login, no backend, and no database required:

- **Flexible JSON Deck Import**: Drag and drop or upload a `.json` file, or paste JSON directly. Automatically detects common JSON variants, includes a downloadable sample template, and ships with 2 built-in sample decks (Vietnamese with code blocks & English).
- **Two Quiz Modes**:
  - **Practice Mode (Kahoot-style)**: Instant right/wrong grading, immediate explanation reveal, combo streaks, and speed-based scoring.
  - **Exam Mode (Online Exam)**: Free navigation across questions, question flagging for review, single-submit grading with full answer breakdown, and targeted retry for missed questions.
- **Flexible Timer Settings**: Unlimited time, per-question countdown (Practice mode), or total exam timer.
- **Automatic Shuffling**: Shuffles option order (`A/B/C/D`) while preserving exact answer mapping, optionally shuffles question order, and supports random N-question subsets.
- **Chill Background Music & SFX**: Three built-in procedural Web Audio API vibes (*Lo-fi Piano*, *Warm Ambient*, *Soft Rain*), support for uploading custom `.mp3`/audio files, independent volume/SFX controls, and automatic BGM ducking while TTS is speaking.
- **Free Mobile-Compatible Text-to-Speech (TTS)**: Powered by the browser's native Web Speech API (`window.speechSynthesis`), with automatic Vietnamese/English detection, device voice selection, playback speed (`0.75x–1.5x`), auto-read on question change, and markdown stripping for natural speech.

---

## Running Locally with Bun

```bash
# Install dependencies
bun install

# Start the development server
bun run dev

# Run unit and SSR render smoke tests
bun test

# Type-check and build static production assets into dist/
bun run build
```

The generated `dist/` directory is a pure static bundle ready to deploy on Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

---

## Input JSON Format

Recommended canonical schema:

```json
{
  "title": "Deck Title",
  "description": "Short description (optional)",
  "language": "en",
  "questions": [
    {
      "topic": "Category (optional)",
      "question": "Question text (supports **bold**, `inline code`, and ```code blocks```)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 2,
      "explanation": "Detailed explanation of why Option C is correct"
    }
  ]
}
```

### Supported Schema Variants
- Root can be a direct array `[...]` or an object with `questions`, `items`, `data`, or `quiz`.
- Answer fields (`answer`, `correctAnswer`, `correct`, `correctIndex`, `correct_answer`, `rightAnswer`, `answerIndex`) accept:
  - `0`-based index (`0..3`), or `1`-based index (`1..4`, auto-detected across the deck)
  - Letter (`"A"`..`"F"`, case-insensitive, including `"B."` or `"option C"`)
  - Exact text matching one of the options (case-insensitive).
- Options (`options`, `choices`, `answers`) can be a string array, an object `{ "A": "...", "B": "...", "C": "...", "D": "..." }`, or flat fields `optionA`..`optionD`.

---

## Free Mobile-Compatible TTS Guide

QuizChill uses the browser's built-in **Web Speech API (`window.speechSynthesis`)** — **100% free, zero API keys, zero backend**, and works offline:
- **iOS (Safari / iOS Chrome)**: Uses system voices (such as *Linh* for Vietnamese and *Samantha* for English). If a voice is missing or quiet, check the hardware Silent switch and download enhanced voices under *Settings → Accessibility → Spoken Content → Voices*.
- **Android (Chrome / Edge / Samsung Internet)**: Uses Google Speech Services for reliable Vietnamese and English playback.
- Built-in mobile safeguards in QuizChill: synchronous audio/TTS unlock on user tap, sentence chunking to avoid mid-utterance cutoffs on Chrome and Safari, markdown cleanup before speaking, and automatic background music ducking during speech.
