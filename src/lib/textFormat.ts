export type RichBlock =
  | { type: 'text'; content: string }
  | { type: 'code'; language: string; content: string };

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string };

const FENCED_CODE_RE = /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)```/g;
const INLINE_TOKEN_RE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

/**
 * Splits input markdown-lite text into normal text paragraphs and fenced code blocks.
 */
export function parseRichBlocks(input: string): RichBlock[] {
  if (!input) return [];

  const normalized = input.replace(/\r\n/g, '\n');
  const blocks: RichBlock[] = [];
  let lastIndex = 0;

  FENCED_CODE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCED_CODE_RE.exec(normalized)) !== null) {
    const before = normalized.slice(lastIndex, match.index);
    if (before.trim()) {
      blocks.push({ type: 'text', content: before.trim() });
    }
    const language = (match[1] || '').trim();
    const codeContent = match[2].replace(/\n$/, '');
    blocks.push({ type: 'code', language, content: codeContent });
    lastIndex = match.index + match[0].length;
  }

  const tail = normalized.slice(lastIndex);
  if (tail.trim()) {
    blocks.push({ type: 'text', content: tail.trim() });
  }

  if (blocks.length === 0 && normalized.trim()) {
    blocks.push({ type: 'text', content: normalized.trim() });
  }

  return blocks;
}

/**
 * Tokenizes a single line into plain text, inline code, bold, and italic segments.
 */
export function parseInlineTokens(line: string): InlineToken[] {
  if (!line) return [];

  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  INLINE_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_TOKEN_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('`') && raw.endsWith('`') && raw.length > 2) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**') && raw.endsWith('**') && raw.length > 4) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*') && raw.endsWith('*') && raw.length > 2) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', value: line.slice(lastIndex) });
  }

  return tokens;
}

const VI_DIACRITICS_RE =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

/**
 * Cleans markdown syntax (code blocks, inline code, bold/italic, headings, bullets)
 * into natural spoken prose suitable for Web Speech API TTS.
 */
export function stripMarkdownForTTS(input: string, langHint?: 'vi' | 'en'): string {
  if (!input) return '';

  const isVietnamese =
    langHint === 'vi' || (langHint !== 'en' && VI_DIACRITICS_RE.test(input));

  let cleaned = input.replace(/\r\n/g, '\n');

  cleaned = cleaned.replace(FENCED_CODE_RE, (_full, _lang: string, body: string) => {
    const compact = body.replace(/\s+/g, ' ').trim();
    if (!compact) return '';
    if (compact.length <= 120) {
      const spokenCode = compact
        .replace(/[`{}[\]()]/g, ' ')
        .replace(/===/g, isVietnamese ? ' bằng tuyệt đối ' : ' strict equals ')
        .replace(/!==/g, isVietnamese ? ' khác tuyệt đối ' : ' strict not equals ')
        .replace(/=>/g, ' ')
        .replace(/;/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
      return `. ${spokenCode}. `;
    }
    return isVietnamese ? '. đoạn mã nguồn. ' : '. code snippet. ';
  });

  // Remove inline formatting markers while preserving inner text
  cleaned = cleaned
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');

  // Collapse newlines into natural spoken pauses
  cleaned = cleaned
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s*([.,;!?])\s*/g, '$1 ')
    .replace(/\.{2,}/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}
