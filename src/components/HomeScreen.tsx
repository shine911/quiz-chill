import React, { useRef, useState } from 'react';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';
import { createTemplateJsonString, parseQuizJson } from '../lib/quizParser';
import type { ActiveSession, HistoryEntry, RawQuiz, StoredDeck } from '../types/quiz';
import { IconCheck, IconClock, IconDownload, IconTrash, IconUpload, IconX } from './Icons';

interface HomeScreenProps {
  savedSession: ActiveSession | null;
  recentDecks: StoredDeck[];
  history: HistoryEntry[];
  onResumeSession: () => void;
  onDiscardSavedSession: () => void;
  onSelectQuiz: (quiz: RawQuiz, warnings?: string[]) => void;
  onDeleteDeck: (id: string) => void;
  onClearAllData: () => void;
}

function formatDurationShort(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

function formatDateShort(ts: number): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  savedSession,
  recentDecks,
  history,
  onResumeSession,
  onDiscardSavedSession,
  onSelectQuiz,
  onDeleteDeck,
  onClearAllData,
}) => {
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pastedJson, setPastedJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleParsedText = (rawText: string, source: 'file' | 'paste', fileName?: string) => {
    setError(null);
    const fallbackTitle = fileName ? fileName.replace(/\.json$/i, '') : undefined;
    const result = parseQuizJson(rawText, fallbackTitle);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSelectQuiz({ ...result.quiz, source }, result.warnings);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('File JSON vượt quá giới hạn 4MB. Hãy chia nhỏ bộ đề.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      handleParsedText(content, 'file', file.name);
    };
    reader.onerror = () => {
      setError('Không đọc được file từ thiết bị. Vui lòng thử lại.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleDownloadTemplate = () => {
    const json = createTemplateJsonString();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quizchill-template.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-3 py-6 sm:px-6 sm:py-10">
      {/* Resume banner if active session exists */}
      {savedSession && (
        <section className="flex flex-col justify-between gap-3 rounded-xl border border-[#E4E4DF] border-l-4 border-l-[#2447E5] bg-white p-4 dark:border-[#2B3038] dark:border-l-[#4F75FF] dark:bg-[#1A1D22] sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2447E5] dark:text-[#7896FF]">
              <IconClock className="h-3.5 w-3.5" />
              <span>Bài thi đang làm dở</span>
            </div>
            <h2 className="mt-1 truncate text-sm font-bold text-[#141413] dark:text-[#F3F4F6] sm:text-base">
              {savedSession.quizTitle}
            </h2>
            <p className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
              Câu {savedSession.currentIndex + 1}/{savedSession.questions.length} — Chế độ{' '}
              {savedSession.settings.mode === 'practice' ? 'Luyện tập (Kahoot)' : 'Thi thật'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDiscardSavedSession}
              className="rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-[#5C5C56] transition-colors hover:text-[#141413] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#9CA3AF] dark:hover:text-white"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={onResumeSession}
              className="rounded-lg bg-[#2447E5] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1D3AC2] dark:bg-[#3B5BFF]"
            >
              Tiếp tục làm bài
            </button>
          </div>
        </section>
      )}

      {/* Editorial Left-Aligned Header */}
      <section className="max-w-2xl space-y-2.5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#141413] dark:text-[#F3F4F6] sm:text-4xl">
          Nạp file JSON, trộn đáp án và làm bài thi.
        </h1>
        <p className="text-sm leading-relaxed text-[#5C5C56] dark:text-[#9CA3AF] sm:text-base">
          Chạy hoàn toàn trên trình duyệt của bạn, không cần đăng nhập hay cơ sở dữ liệu. Hỗ trợ luyện tập kiểu Kahoot, thi thật tính giờ, nhạc nền thư giãn và đọc câu hỏi bằng giọng nói.
        </p>
      </section>

      {/* Main Asymmetric Workspace: Left Import (7 cols) / Right Sample Decks (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white dark:border-[#2B3038] dark:bg-[#1A1D22] lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E4DF] bg-[#FBFBF9] px-4 py-3 dark:border-[#2B3038] dark:bg-[#16191D] sm:px-5">
            <div className="inline-flex rounded-lg border border-[#E4E4DF] bg-[#F7F7F5] p-0.5 dark:border-[#2B3038] dark:bg-[#121417]">
              <button
                type="button"
                onClick={() => {
                  setImportTab('file');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  importTab === 'file'
                    ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                    : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF] dark:hover:text-white'
                }`}
              >
                Tải file .json
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportTab('paste');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  importTab === 'paste'
                    ? 'bg-white text-[#141413] shadow-2xs dark:bg-[#1A1D22] dark:text-white'
                    : 'text-[#5C5C56] hover:text-[#141413] dark:text-[#9CA3AF] dark:hover:text-white'
                }`}
              >
                Dán JSON trực tiếp
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#F7F7F5] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#F3F4F6] dark:hover:bg-[#23272E]"
              >
                <IconDownload className="h-3.5 w-3.5" />
                <span>Tải JSON mẫu</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSchema((v) => !v)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2447E5] transition-colors hover:bg-[#2447E5]/8 dark:text-[#7896FF]"
              >
                {showSchema ? 'Ẩn chuẩn JSON' : 'Xem chuẩn JSON'}
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {showSchema && (
              <div className="animate-panel-reveal rounded-xl border border-[#E4E4DF] bg-[#F7F7F5] p-3.5 text-xs text-[#5C5C56] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#9CA3AF]">
                <div className="mb-2 font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Cấu trúc JSON chuẩn và biến thể được hỗ trợ
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[#141413] p-3 font-mono text-[11.5px] leading-relaxed text-[#F3F4F6]">
{`{
  "title": "Tên bộ đề (tùy chọn)",
  "questions": [
    {
      "question": "Nội dung câu hỏi (hỗ trợ **in đậm**, \`code\`)?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "answer": 2,
      "explanation": "Giải thích chi tiết vì sao C đúng"
    }
  ]
}`}
                </pre>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed">
                  <li>
                    <code>answer</code> nhận chỉ số <code>0..3</code>, <code>1..4</code>, chữ cái <code>&quot;A&quot;..&quot;D&quot;</code> hoặc nội dung trùng đáp án.
                  </li>
                  <li>
                    Hỗ trợ mảng gốc <code>[...]</code>, object <code>{`{ A, B, C, D }`}</code>, <code>optionA..optionD</code>, <code>choices</code>, <code>correctAnswer</code>, <code>explain</code>.
                  </li>
                </ul>
              </div>
            )}

            {importTab === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-11 text-center transition-colors ${
                  isDragging
                    ? 'border-[#2447E5] bg-[#2447E5]/5 dark:border-[#4F75FF]'
                    : 'border-[#D5D5CE] bg-[#FBFBF9] hover:border-[#2447E5] dark:border-[#2B3038] dark:bg-[#15181D] dark:hover:border-[#4F75FF]'
                }`}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E4E4DF] bg-white text-[#2447E5] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:text-[#7896FF]">
                  <IconUpload className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                  Kéo thả file <code className="text-[#2447E5] dark:text-[#7896FF]">.json</code> vào đây hoặc bấm để chọn
                </p>
                <p className="mt-1 text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
                  Đề thi được parse và trộn đáp án ngay trên máy của bạn
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={pastedJson}
                  onChange={(e) => {
                    setPastedJson(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={8}
                  placeholder='Dán mảng JSON hoặc object { "title": "...", "questions": [...] } vào đây...'
                  className="w-full rounded-xl border border-[#D5D5CE] bg-[#FBFBF9] p-3.5 font-mono text-xs leading-relaxed text-[#141413] focus:border-[#2447E5] focus:bg-white focus:outline-none dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#F3F4F6]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPastedJson(createTemplateJsonString());
                      setError(null);
                    }}
                    className="rounded-lg border border-[#E4E4DF] bg-white px-3 py-2 text-xs font-semibold text-[#5C5C56] transition-colors hover:text-[#141413] dark:border-[#2B3038] dark:bg-[#121417] dark:text-[#9CA3AF] dark:hover:text-white"
                  >
                    Điền ví dụ nhanh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleParsedText(pastedJson, 'paste')}
                    className="inline-flex items-center gap-1.5 rounded-lg border-b-2 border-[#1631B0] bg-[#2447E5] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1D3AC2] active:translate-y-[1px] dark:bg-[#3B5BFF]"
                  >
                    <IconCheck className="h-4 w-4" />
                    <span>Nạp bộ đề từ JSON</span>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#D9385A]/40 bg-[#D9385A]/8 px-3.5 py-2.5 text-xs font-medium text-[#9F1D3A] dark:bg-[#D9385A]/15 dark:text-rose-200"
              >
                <IconX className="mt-0.5 h-4 w-4 shrink-0 text-[#D9385A]" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Built-in Sample Decks */}
        <aside className="space-y-3 lg:col-span-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
              Bộ đề mẫu dùng thử ngay
            </h2>
            <span className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">Việt và Anh</span>
          </div>

          <div className="space-y-3">
            {SAMPLE_QUIZZES.map((quiz) => {
              const isEn = quiz.language === 'en';
              return (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() => onSelectQuiz(quiz)}
                  className={`group block w-full rounded-xl border border-[#E4E4DF] border-l-4 bg-white p-4 text-left transition-colors hover:border-[#C9C9C0] hover:bg-[#FBFBF9] dark:border-[#2B3038] dark:bg-[#1A1D22] dark:hover:border-[#3E4550] ${
                    isEn ? 'border-l-[#0E7AE6]' : 'border-l-[#168A5B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-bold ${
                        isEn
                          ? 'text-[#0E7AE6] dark:text-sky-400'
                          : 'text-[#168A5B] dark:text-emerald-400'
                      }`}
                    >
                      {isEn ? 'English' : 'Tiếng Việt'}
                    </span>
                    <span className="font-mono text-[#5C5C56] dark:text-[#9CA3AF]">
                      {quiz.questions.length} câu
                    </span>
                  </div>
                  <h3 className="font-display mt-1.5 text-base font-bold text-[#141413] group-hover:text-[#2447E5] dark:text-[#F3F4F6] dark:group-hover:text-[#7896FF]">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5C5C56] dark:text-[#9CA3AF]">
                      {quiz.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Recent Decks & History */}
      {(recentDecks.length > 0 || history.length > 0) && (
        <section className="space-y-6 border-t border-[#E4E4DF] pt-6 dark:border-[#2B3038]">
          {recentDecks.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                Bộ đề đã nạp gần đây
              </h2>
              <div className="divide-y divide-[#E4E4DF] overflow-hidden rounded-xl border border-[#E4E4DF] bg-white dark:divide-[#2B3038] dark:border-[#2B3038] dark:bg-[#1A1D22]">
                {recentDecks.map((deck) => (
                  <div key={deck.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectQuiz({ ...deck.quiz, source: 'recent' })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-bold text-[#141413] hover:text-[#2447E5] dark:text-[#F3F4F6] dark:hover:text-[#7896FF]">
                        {deck.title}
                      </div>
                      <div className="text-xs text-[#5C5C56] dark:text-[#9CA3AF]">
                        {deck.questionCount} câu, lưu {formatDateShort(deck.savedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDeck(deck.id)}
                      title="Xóa bộ đề này"
                      aria-label={`Xóa bộ đề ${deck.title}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5C5C56] transition-colors hover:bg-[#D9385A]/10 hover:text-[#D9385A] dark:text-[#9CA3AF]"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="font-display text-sm font-bold text-[#141413] dark:text-[#F3F4F6]">
                Lịch sử kết quả gần đây
              </h2>
              <div className="divide-y divide-[#E4E4DF] overflow-hidden rounded-xl border border-[#E4E4DF] bg-white dark:divide-[#2B3038] dark:border-[#2B3038] dark:bg-[#1A1D22]">
                {history.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#141413] dark:text-[#F3F4F6]">
                        {item.quizTitle}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[#5C5C56] dark:text-[#9CA3AF]">
                        <span className="rounded bg-[#F7F7F5] px-1.5 py-0.5 font-semibold dark:bg-[#121417]">
                          {item.mode === 'practice' ? 'Kahoot' : 'Thi thật'}
                        </span>
                        <span>{formatDurationShort(item.durationMs)}</span>
                        <span>{formatDateShort(item.finishedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-[#5C5C56] dark:text-[#9CA3AF]">
                        {item.correctCount}/{item.totalCount}
                      </span>
                      <span
                        className={`min-w-[44px] rounded-md px-2 py-0.5 text-center font-mono font-bold ${
                          item.accuracy >= 80
                            ? 'bg-[#168A5B]/12 text-[#168A5B] dark:text-emerald-400'
                            : item.accuracy >= 50
                              ? 'bg-[#D9820B]/12 text-[#B86B04] dark:text-amber-300'
                              : 'bg-[#D9385A]/12 text-[#D9385A] dark:text-rose-300'
                        }`}
                      >
                        {item.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {confirmClearAll ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#D9385A]/40 bg-[#D9385A]/8 px-3 py-2 text-xs">
                <span className="font-medium text-[#9F1D3A] dark:text-rose-200">
                  Xóa toàn bộ bộ đề và lịch sử lưu trên trình duyệt?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    setConfirmClearAll(false);
                  }}
                  className="rounded-md bg-[#D9385A] px-2.5 py-1 font-bold text-white hover:bg-[#BE2B4A]"
                >
                  Xóa ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="rounded-md px-2 py-1 font-semibold text-[#5C5C56] hover:bg-black/5 dark:text-[#9CA3AF]"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#5C5C56] transition-colors hover:bg-[#D9385A]/10 hover:text-[#D9385A] dark:text-[#9CA3AF]"
              >
                <IconTrash className="h-3.5 w-3.5" />
                <span>Xóa toàn bộ dữ liệu cục bộ</span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
