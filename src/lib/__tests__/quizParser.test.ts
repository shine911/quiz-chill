import { describe, expect, test } from 'bun:test';
import { createTemplateJsonString, parseQuizJson } from '../quizParser';

describe('parseQuizJson', () => {
  test('parses canonical template JSON cleanly', () => {
    const template = createTemplateJsonString();
    const res = parseQuizJson(template);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quiz.title).toBe('Bộ đề mẫu QuizChill');
    expect(res.quiz.questions).toHaveLength(3);
    expect(res.quiz.questions[0].answerIndex).toBe(2);
    expect(res.quiz.questions[1].answerIndex).toBe(2); // "C" -> 2
    expect(res.quiz.questions[2].answerIndex).toBe(1);
  });

  test('accepts top-level array and {A,B,C,D} object options + letter variations', () => {
    const raw = JSON.stringify([
      {
        prompt: 'Thủ đô Việt Nam?',
        choices: { D: 'Cần Thơ', A: 'Hà Nội', C: 'Đà Nẵng', B: 'TP.HCM' },
        correct: 'a.',
        explain: 'Hà Nội là thủ đô.',
      },
      {
        text: '2 + 2 = ?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: 'option B',
      },
    ]);

    const res = parseQuizJson(raw, 'File test');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quiz.title).toBe('File test');
    expect(res.quiz.questions).toHaveLength(2);
    expect(res.quiz.questions[0].options).toEqual(['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ']);
    expect(res.quiz.questions[0].answerIndex).toBe(0);
    expect(res.quiz.questions[0].explanation).toBe('Hà Nội là thủ đô.');
    expect(res.quiz.questions[1].answerIndex).toBe(1);
    expect(res.warnings.length).toBeGreaterThan(0); // 1 missing explanation warning
  });

  test('detects 1-based numeric answer indices automatically across questions', () => {
    const raw = JSON.stringify({
      title: '1-based test',
      items: [
        {
          question: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          answer: 1,
        },
        {
          question: 'Q2',
          options: ['W', 'X', 'Y', 'Z'],
          answer: 4,
        },
      ],
    });

    const res = parseQuizJson(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quiz.questions[0].answerIndex).toBe(0);
    expect(res.quiz.questions[1].answerIndex).toBe(3);
    expect(res.warnings.some((w) => w.includes('1-based'))).toBe(true);
  });

  test('keeps 0-based numeric indices when 0 is present', () => {
    const raw = JSON.stringify({
      questions: [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 0 },
        { question: 'Q2', options: ['A', 'B', 'C', 'D'], answer: 3 },
      ],
    });

    const res = parseQuizJson(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quiz.questions[0].answerIndex).toBe(0);
    expect(res.quiz.questions[1].answerIndex).toBe(3);
  });

  test('matches exact answer text case-insensitively', () => {
    const raw = JSON.stringify([
      {
        question: 'Select TypeScript',
        options: ['Python', 'TypeScript', 'Ruby', 'Go'],
        answer: 'typescript',
      },
    ]);
    const res = parseQuizJson(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quiz.questions[0].answerIndex).toBe(1);
  });

  test('returns helpful Vietnamese errors for invalid JSON, empty questions, and unresolvable answers', () => {
    expect(parseQuizJson('{ bad json').ok).toBe(false);
    expect(parseQuizJson(JSON.stringify({ questions: [] })).ok).toBe(false);
    expect(
      parseQuizJson(
        JSON.stringify([{ question: 'Missing opts', options: ['Only 1'], answer: 0 }]),
      ).ok,
    ).toBe(false);
    expect(
      parseQuizJson(
        JSON.stringify([{ question: 'Bad ans', options: ['A', 'B', 'C', 'D'], answer: 'Z' }]),
      ).ok,
    ).toBe(false);
  });
});
