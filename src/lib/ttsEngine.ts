import type { PreparedQuestion, QuizLanguage, TtsLangSetting } from '../types/quiz';
import { audioEngine } from './audioEngine';
import { stripMarkdownForTTS } from './textFormat';

export interface TtsSegment {
  id: string;
  text: string;
  lang?: 'vi-VN' | 'en-US';
}

export interface TtsSpeakOptions {
  langSetting: TtsLangSetting;
  voiceURI: string;
  rate: number;
}

export interface TtsStateSnapshot {
  supported: boolean;
  speaking: boolean;
  activeSegment: string | null;
  voices: SpeechSynthesisVoice[];
  hasVoices: boolean;
}

type TtsListener = (state: TtsStateSnapshot) => void;

const VI_DIACRITIC_REGEX =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

class TtsEngine {
  private supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  private voices: SpeechSynthesisVoice[] = [];
  private speaking = false;
  private activeSegment: string | null = null;
  private runId = 0;
  private startTimer: number | null = null;
  private listeners = new Set<TtsListener>();

  constructor() {
    if (this.supported) {
      this.refreshVoices();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
      } else {
        window.speechSynthesis.onvoiceschanged = this.handleVoicesChanged;
      }
    }
  }

  private handleVoicesChanged = (): void => {
    this.refreshVoices();
    this.emit();
  };

  public refreshVoices(): void {
    if (!this.supported) return;
    try {
      this.voices = window.speechSynthesis.getVoices() || [];
    } catch {
      this.voices = [];
    }
  }

  public subscribe(listener: TtsListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): TtsStateSnapshot {
    return {
      supported: this.supported,
      speaking: this.speaking,
      activeSegment: this.activeSegment,
      voices: this.voices,
      hasVoices: this.voices.length > 0,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  /**
   * Unlocks SpeechSynthesis on user interaction (needed on iOS Safari).
   */
  public unlock(): void {
    if (!this.supported) return;
    try {
      this.refreshVoices();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (!this.speaking) {
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        silent.rate = 2;
        window.speechSynthesis.speak(silent);
      }
    } catch {
      // ignore unlock quirks
    }
  }

  public detectLanguage(text: string, quizLang: QuizLanguage = 'auto'): 'vi-VN' | 'en-US' {
    if (quizLang === 'vi') return 'vi-VN';
    if (quizLang === 'en') return 'en-US';
    return VI_DIACRITIC_REGEX.test(text) ? 'vi-VN' : 'en-US';
  }

  public resolveTargetLang(
    text: string,
    langSetting: TtsLangSetting,
    quizLang: QuizLanguage = 'auto',
  ): 'vi-VN' | 'en-US' {
    if (langSetting === 'vi-VN' || langSetting === 'en-US') {
      return langSetting;
    }
    return this.detectLanguage(text, quizLang);
  }

  public pickVoice(lang: 'vi-VN' | 'en-US', preferredURI?: string): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.refreshVoices();
    }
    if (this.voices.length === 0) return null;

    if (preferredURI) {
      const exact = this.voices.find((v) => v.voiceURI === preferredURI);
      if (exact) return exact;
    }

    const prefix = lang.slice(0, 2).toLowerCase();
    const candidates = this.voices.filter((v) =>
      v.lang.toLowerCase().startsWith(prefix),
    );
    if (candidates.length === 0) return null;

    const scored = [...candidates].sort((a, b) => {
      const scoreVoice = (v: SpeechSynthesisVoice): number => {
        let score = 0;
        if (v.lang.toLowerCase() === lang.toLowerCase()) score += 4;
        if (/natural|google|linh|hoaimy|samantha|daniel|neural|enhanced/i.test(v.name)) {
          score += 6;
        }
        if (v.localService) score += 2;
        if (v.default) score += 1;
        return score;
      };
      return scoreVoice(b) - scoreVoice(a);
    });

    return scored[0] ?? null;
  }

  /**
   * Splits long text into <= maxLen chunks along sentence/clause boundaries
   * to prevent Chromium & iOS Safari TTS cutoffs.
   */
  public chunkText(text: string, maxLen = 170): string[] {
    const clean = text.trim();
    if (!clean) return [];
    if (clean.length <= maxLen) return [clean];

    const sentences = clean
      .split(/(?<=[.!?;:])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    const pushPiece = (piece: string) => {
      if (piece.length <= maxLen) {
        if (!current) {
          current = piece;
        } else if (current.length + 1 + piece.length <= maxLen) {
          current = `${current} ${piece}`;
        } else {
          chunks.push(current);
          current = piece;
        }
        return;
      }

      // Split oversized clause by commas or spaces
      const words = piece.split(/\s+/);
      for (const word of words) {
        if (!current) {
          current = word;
        } else if (current.length + 1 + word.length <= maxLen) {
          current = `${current} ${word}`;
        } else {
          chunks.push(current);
          current = word;
        }
      }
    };

    for (const sentence of sentences) {
      pushPiece(sentence);
    }
    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  public stop(): void {
    this.runId += 1;
    if (this.startTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    if (this.supported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (this.speaking || this.activeSegment !== null) {
      this.speaking = false;
      this.activeSegment = null;
      audioEngine.setDucked(false);
      this.emit();
    }
  }

  public speakSegments(segments: TtsSegment[], options: TtsSpeakOptions): void {
    if (!this.supported) return;

    const cleanSegments = segments
      .map((s) => ({ ...s, text: s.text.trim() }))
      .filter((s) => s.text.length > 0);
    if (cleanSegments.length === 0) return;

    this.stop();
    const myRunId = this.runId;

    this.speaking = true;
    this.activeSegment = cleanSegments[0].id;
    audioEngine.setDucked(true);
    this.emit();

    const rate = Math.max(0.75, Math.min(1.5, options.rate || 1));

    // Flatten into chunk queue keeping segment id
    const queue: { segmentId: string; text: string; lang: 'vi-VN' | 'en-US' }[] = [];
    for (const seg of cleanSegments) {
      const lang =
        seg.lang ??
        this.resolveTargetLang(seg.text, options.langSetting, 'auto');
      const chunks = this.chunkText(seg.text);
      for (const chunk of chunks) {
        queue.push({ segmentId: seg.id, text: chunk, lang });
      }
    }

    const speakNext = (index: number) => {
      if (myRunId !== this.runId) return;
      if (index >= queue.length) {
        this.speaking = false;
        this.activeSegment = null;
        audioEngine.setDucked(false);
        this.emit();
        return;
      }

      const item = queue[index];
      if (this.activeSegment !== item.segmentId) {
        this.activeSegment = item.segmentId;
        this.emit();
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = item.lang;
        utterance.rate = rate;

        const voice = this.pickVoice(item.lang, options.voiceURI || undefined);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || item.lang;
        }

        let finished = false;
        const advance = () => {
          if (finished || myRunId !== this.runId) return;
          finished = true;
          speakNext(index + 1);
        };

        utterance.onend = advance;
        utterance.onerror = advance;

        window.speechSynthesis.speak(utterance);
      } catch {
        this.stop();
      }
    };

    // Short 55ms delay after cancel() avoids Safari swallowing the first utterance
    this.startTimer = window.setTimeout(() => {
      this.startTimer = null;
      speakNext(0);
    }, 55);
  }

  public speakQuestionOnly(
    question: PreparedQuestion,
    options: TtsSpeakOptions,
    quizLang: QuizLanguage = 'auto',
  ): void {
    const langHint = this.resolveLangHint(question.question, options.langSetting, quizLang);
    const cleaned = stripMarkdownForTTS(question.question, langHint);
    const targetLang = langHint === 'vi' ? 'vi-VN' : 'en-US';
    this.speakSegments([{ id: 'question', text: cleaned, lang: targetLang }], options);
  }

  public speakQuestionAndOptions(
    question: PreparedQuestion,
    options: TtsSpeakOptions,
    quizLang: QuizLanguage = 'auto',
  ): void {
    const combinedSample = `${question.question} ${question.options.map((o) => o.text).join(' ')}`;
    const langHint = this.resolveLangHint(combinedSample, options.langSetting, quizLang);
    const targetLang: 'vi-VN' | 'en-US' = langHint === 'vi' ? 'vi-VN' : 'en-US';

    const questionPrefix = langHint === 'vi' ? 'Câu hỏi: ' : 'Question: ';
    const segments: TtsSegment[] = [
      {
        id: 'question',
        text: `${questionPrefix}${stripMarkdownForTTS(question.question, langHint)}`,
        lang: targetLang,
      },
    ];

    question.options.forEach((opt, idx) => {
      const letter = OPTION_LETTERS[idx] ?? String(idx + 1);
      const optPrefix = langHint === 'vi' ? `Đáp án ${letter}: ` : `Option ${letter}: `;
      segments.push({
        id: `option-${idx}`,
        text: `${optPrefix}${stripMarkdownForTTS(opt.text, langHint)}`,
        lang: targetLang,
      });
    });

    this.speakSegments(segments, options);
  }

  public speakExplanation(
    explanation: string,
    options: TtsSpeakOptions,
    quizLang: QuizLanguage = 'auto',
  ): void {
    const langHint = this.resolveLangHint(explanation, options.langSetting, quizLang);
    const targetLang: 'vi-VN' | 'en-US' = langHint === 'vi' ? 'vi-VN' : 'en-US';
    const prefix = langHint === 'vi' ? 'Giải thích: ' : 'Explanation: ';
    const cleaned = stripMarkdownForTTS(explanation, langHint);
    if (!cleaned) return;
    this.speakSegments([{ id: 'explanation', text: `${prefix}${cleaned}`, lang: targetLang }], options);
  }

  public speakSample(options: TtsSpeakOptions): void {
    const isVi = options.langSetting !== 'en-US';
    const text = isVi
      ? 'Xin chào! Đây là giọng đọc câu hỏi trắc nghiệm miễn phí trên trình duyệt của bạn.'
      : 'Hello! This is a preview of your browser text to speech voice for QuizChill.';
    this.speakSegments(
      [{ id: 'sample', text, lang: isVi ? 'vi-VN' : 'en-US' }],
      options,
    );
  }

  private resolveLangHint(
    text: string,
    langSetting: TtsLangSetting,
    quizLang: QuizLanguage,
  ): 'vi' | 'en' {
    if (langSetting === 'vi-VN') return 'vi';
    if (langSetting === 'en-US') return 'en';
    const detected = this.detectLanguage(text, quizLang);
    return detected === 'vi-VN' ? 'vi' : 'en';
  }
}

export const ttsEngine = new TtsEngine();
