import type { QuizLanguage, RawQuestion, RawQuiz } from '../types/quiz';

export type ParseQuizResult =
  | { ok: true; quiz: RawQuiz; warnings: string[] }
  | { ok: false; error: string };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickFirstString(obj: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return undefined;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function extractOptionText(entry: unknown): string | null {
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof entry === 'number' || typeof entry === 'boolean') {
    return String(entry);
  }
  if (isRecord(entry)) {
    const found = pickFirstString(entry, ['text', 'label', 'value', 'content', 'title']);
    return found ?? null;
  }
  return null;
}

function extractOptions(item: JsonRecord): string[] | null {
  const container = item.options ?? item.choices ?? item.answers;

  if (Array.isArray(container)) {
    const extracted = container
      .map(extractOptionText)
      .filter((v): v is string => v !== null);
    return extracted.length >= 2 ? extracted.slice(0, 6) : null;
  }

  if (isRecord(container)) {
    const entries = Object.entries(container)
      .map(([k, v]) => ({ key: k.trim().toUpperCase(), text: extractOptionText(v) }))
      .filter((e): e is { key: string; text: string } => e.text !== null && /^[A-F]$/.test(e.key))
      .sort((a, b) => a.key.localeCompare(b.key));
    if (entries.length >= 2) {
      return entries.map((e) => e.text);
    }
  }

  // Flat fields: optionA..optionF or a..f (case-insensitive)
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(item)) {
    lowerMap.set(k.toLowerCase(), v);
  }

  const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
  const flatOptions: string[] = [];
  for (const letter of letters) {
    const rawVal =
      lowerMap.get(`option${letter}`) ??
      lowerMap.get(`option_${letter}`) ??
      lowerMap.get(letter);
    const text = extractOptionText(rawVal);
    if (text !== null) {
      flatOptions.push(text);
    } else if (flatOptions.length > 0) {
      break;
    }
  }

  return flatOptions.length >= 2 ? flatOptions : null;
}

function pickRawAnswer(item: JsonRecord): unknown {
  const keys = [
    'answer',
    'correctAnswer',
    'correct',
    'correctIndex',
    'correct_answer',
    'rightAnswer',
    'answerIndex',
  ];
  for (const key of keys) {
    if (key in item && item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }
  return undefined;
}

interface ExtractedItem {
  questionText: string;
  options: string[];
  rawAnswer: unknown;
  explanation: string;
  topic?: string;
}

function parseNumericToken(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return null;
}

function shouldUseOneBasedIndex(items: ExtractedItem[]): boolean {
  const numericEntries: { value: number; optionCount: number }[] = [];

  for (const item of items) {
    const num = parseNumericToken(item.rawAnswer);
    if (num !== null) {
      numericEntries.push({ value: num, optionCount: item.options.length });
    }
  }

  if (numericEntries.length === 0) return false;

  const hasZero = numericEntries.some((entry) => entry.value === 0);
  if (hasZero) return false;

  const allWithinOneBased = numericEntries.every(
    (entry) => entry.value >= 1 && entry.value <= entry.optionCount,
  );
  const atLeastOneEqualsLength = numericEntries.some(
    (entry) => entry.value === entry.optionCount,
  );

  return allWithinOneBased && atLeastOneEqualsLength;
}

function resolveAnswerIndex(
  rawAnswer: unknown,
  options: string[],
  useOneBased: boolean,
): number | null {
  if (rawAnswer === undefined || rawAnswer === null) return null;

  const numeric = parseNumericToken(rawAnswer);
  if (numeric !== null) {
    const idx = useOneBased ? numeric - 1 : numeric;
    if (idx >= 0 && idx < options.length) {
      return idx;
    }
    return null;
  }

  if (typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    // Strip prefixes like "option B", "đáp án C", and trailing "." or ")"
    const cleanedLetter = trimmed
      .replace(/^(option|choice|đáp án|dap an)\s+/i, '')
      .replace(/[.)]+$/, '')
      .trim()
      .toUpperCase();

    if (/^[A-F]$/.test(cleanedLetter)) {
      const idx = cleanedLetter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        return idx;
      }
    }

    // Exact text match (case-insensitive)
    const normalizedTarget = trimmed.toLowerCase();
    const matchedIdx = options.findIndex(
      (opt) => opt.trim().toLowerCase() === normalizedTarget,
    );
    if (matchedIdx !== -1) {
      return matchedIdx;
    }
  }

  return null;
}

function normalizeLanguage(raw: unknown): QuizLanguage | undefined {
  if (typeof raw !== 'string') return undefined;
  const val = raw.trim().toLowerCase();
  if (val === 'vi' || val.startsWith('vi-')) return 'vi';
  if (val === 'en' || val.startsWith('en-')) return 'en';
  if (val === 'auto') return 'auto';
  return undefined;
}

/**
 * Parses user-supplied JSON (canonical format or popular variants) into a validated RawQuiz.
 */
export function parseQuizJson(input: string, fallbackTitle?: string): ParseQuizResult {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return { ok: false, error: 'Nội dung JSON đang trống. Hãy tải file hoặc dán dữ liệu JSON.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedInput);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi cú pháp';
    return {
      ok: false,
      error: `JSON không hợp lệ (${message}). Kiểm tra lại dấu ngoặc kép, dấu phẩy hoặc ngoặc nhọn.`,
    };
  }

  let title = fallbackTitle?.trim() || 'Bộ đề tùy chỉnh';
  let description: string | undefined;
  let language: QuizLanguage | undefined;
  let rawItems: unknown[] | undefined;

  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (isRecord(parsed)) {
    title =
      pickFirstString(parsed, ['title', 'name', 'quizTitle']) ||
      fallbackTitle?.trim() ||
      'Bộ đề tùy chỉnh';
    description = pickFirstString(parsed, ['description', 'desc', 'subtitle']);
    language = normalizeLanguage(parsed.language ?? parsed.lang);

    const candidateList =
      parsed.questions ?? parsed.items ?? parsed.data ?? parsed.quiz;
    if (Array.isArray(candidateList)) {
      rawItems = candidateList;
    }
  }

  if (!rawItems) {
    return {
      ok: false,
      error:
        'Không tìm thấy danh sách câu hỏi. JSON cần là một mảng `[...]` hoặc object có trường `"questions"`.',
    };
  }

  if (rawItems.length === 0) {
    return {
      ok: false,
      error: 'Danh sách câu hỏi đang rỗng (0 câu). Vui lòng thêm ít nhất 1 câu hỏi.',
    };
  }

  const extractedItems: ExtractedItem[] = [];
  for (let i = 0; i < rawItems.length; i += 1) {
    const rowNum = i + 1;
    const item = rawItems[i];
    if (!isRecord(item)) {
      return {
        ok: false,
        error: `Câu hỏi số ${rowNum} không phải là object JSON hợp lệ.`,
      };
    }

    const questionText = pickFirstString(item, ['question', 'prompt', 'text', 'q', 'title']);
    if (!questionText) {
      return {
        ok: false,
        error: `Câu hỏi số ${rowNum} bị thiếu nội dung câu hỏi (trường "question").`,
      };
    }

    const options = extractOptions(item);
    if (!options || options.length < 2) {
      return {
        ok: false,
        error: `Câu hỏi số ${rowNum} cần ít nhất 2 phương án trả lời hợp lệ trong "options".`,
      };
    }

    const rawAnswer = pickRawAnswer(item);
    if (rawAnswer === undefined) {
      return {
        ok: false,
        error: `Câu hỏi số ${rowNum} bị thiếu đáp án đúng (trường "answer").`,
      };
    }

    const explanation =
      pickFirstString(item, ['explanation', 'explain', 'reason', 'note', 'solution']) ?? '';
    const topic = pickFirstString(item, ['topic', 'category', 'tag']);

    extractedItems.push({
      questionText,
      options,
      rawAnswer,
      explanation,
      topic,
    });
  }

  const warnings: string[] = [];
  const useOneBased = shouldUseOneBasedIndex(extractedItems);
  if (useOneBased) {
    warnings.push(
      'Đã tự động nhận diện chỉ số đáp án dạng 1-based (1..4) và chuyển về chuẩn nội bộ (0..3).',
    );
  }

  const missingExplanations = extractedItems.filter((item) => !item.explanation).length;
  if (missingExplanations > 0) {
    warnings.push(
      `${missingExplanations} câu hỏi chưa có phần giải thích ("explanation") — web vẫn hiển thị đáp án đúng bình thường.`,
    );
  }

  const questions: RawQuestion[] = [];
  for (let i = 0; i < extractedItems.length; i += 1) {
    const rowNum = i + 1;
    const item = extractedItems[i];
    const answerIndex = resolveAnswerIndex(item.rawAnswer, item.options, useOneBased);
    if (answerIndex === null) {
      return {
        ok: false,
        error: `Câu hỏi số ${rowNum} có đáp án "${String(item.rawAnswer)}" không khớp với ${item.options.length} phương án đã nhập.`,
      };
    }

    const qId = `q-${rowNum}-${hashString(`${item.questionText}|${item.options.join('|')}`)}`;
    questions.push({
      id: qId,
      question: item.questionText,
      options: item.options,
      answerIndex,
      explanation: item.explanation,
      topic: item.topic,
    });
  }

  const signature = `${title}|${questions.map((q) => q.id).join(',')}`;
  const quiz: RawQuiz = {
    id: `deck-${hashString(signature)}`,
    title,
    description,
    language: language ?? 'auto',
    questions,
  };

  return { ok: true, quiz, warnings };
}

/**
 * Produces a clean canonical 3-question template JSON string for user download or quick fill.
 */
export function createTemplateJsonString(): string {
  const template = {
    title: 'Bộ đề mẫu QuizChill',
    description: 'Mẫu chuẩn JSON gồm câu hỏi, 4 lựa chọn, đáp án (0-3 hoặc A-D) và giải thích.',
    language: 'vi',
    questions: [
      {
        topic: 'Kiến thức chung',
        question: 'Trong giao thức HTTP, mã trạng thái nào biểu thị **tài nguyên không tồn tại** (Not Found)?',
        options: ['200 OK', '301 Moved Permanently', '404 Not Found', '500 Internal Server Error'],
        answer: 2,
        explanation:
          'Mã `404 Not Found` cho biết máy chủ không tìm thấy tài nguyên tương ứng với đường dẫn được yêu cầu.',
      },
      {
        topic: 'JavaScript',
        question: 'Đoạn code JavaScript sau sẽ in ra gì?\n```js\nconsole.log(typeof null);\n```',
        options: ['"null"', '"undefined"', '"object"', '"boolean"'],
        answer: 'C',
        explanation:
          'Đây là một đặc điểm lịch sử nổi tiếng của JavaScript từ phiên bản đầu tiên: `typeof null` trả về `"object"`.',
      },
      {
        topic: 'Web',
        question: 'Thẻ HTML nào dùng để tạo một liên kết (hyperlink)?',
        options: ['<link>', '<a>', '<href>', '<nav>'],
        answer: 1,
        explanation:
          'Thẻ `<a>` (anchor) cùng thuộc tính `href` dùng để tạo siêu liên kết điều hướng sang trang hoặc vị trí khác.',
      },
    ],
  };

  return JSON.stringify(template, null, 2);
}
