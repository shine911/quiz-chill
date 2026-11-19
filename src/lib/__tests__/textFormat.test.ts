import { describe, expect, test } from 'bun:test';
import { parseInlineTokens, parseRichBlocks, stripMarkdownForTTS } from '../textFormat';

describe('textFormat', () => {
  test('parses fenced code blocks and surrounding text', () => {
    const input = 'Kết quả:\n```js\nconst a = 1;\nconsole.log(a);\n```\nGiải thích thêm.';
    const blocks = parseRichBlocks(input);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'text', content: 'Kết quả:' });
    expect(blocks[1]).toEqual({
      type: 'code',
      language: 'js',
      content: 'const a = 1;\nconsole.log(a);',
    });
    expect(blocks[2]).toEqual({ type: 'text', content: 'Giải thích thêm.' });
  });

  test('parses inline bold, italic, and inline code', () => {
    const tokens = parseInlineTokens('Dùng **Promise** và `async/await` rất *tiện*.');
    expect(tokens).toEqual([
      { type: 'text', value: 'Dùng ' },
      { type: 'bold', value: 'Promise' },
      { type: 'text', value: ' và ' },
      { type: 'code', value: 'async/await' },
      { type: 'text', value: ' rất ' },
      { type: 'italic', value: 'tiện' },
      { type: 'text', value: '.' },
    ]);
  });

  test('stripMarkdownForTTS cleans syntax while preserving Vietnamese diacritics', () => {
    const input =
      'Mã **404** nghĩa là `Not Found`.\n```js\nconsole.log(1 === 1);\n```\nRất dễ hiểu!';
    const tts = stripMarkdownForTTS(input, 'vi');
    expect(tts).not.toContain('**');
    expect(tts).not.toContain('`');
    expect(tts).toContain('Mã 404 nghĩa là Not Found.');
    expect(tts).toContain('bằng tuyệt đối');
    expect(tts).toContain('Rất dễ hiểu!');
  });

  test('stripMarkdownForTTS summarizes long code blocks cleanly', () => {
    const longCode = 'const x = ' + 'a + '.repeat(45) + '1;';
    const input = `Đọc đoạn sau:\n\`\`\`ts\n${longCode}\n\`\`\``;
    const ttsVi = stripMarkdownForTTS(input, 'vi');
    const ttsEn = stripMarkdownForTTS(input, 'en');
    expect(ttsVi).toContain('đoạn mã nguồn');
    expect(ttsEn).toContain('code snippet');
  });
});
