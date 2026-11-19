import React, { useState } from 'react';
import { parseInlineTokens, parseRichBlocks } from '../lib/textFormat';
import { IconCheck, IconCopy } from './Icons';

interface RichTextProps {
  text: string;
  className?: string;
}

const CodeBlock: React.FC<{ language: string; content: string }> = ({ language, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(content).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      });
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900 text-slate-100 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/90">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
        <span className="font-mono uppercase tracking-wider text-[11px] text-slate-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <>
              <IconCheck className="w-3 h-3 text-emerald-400" />
              <span>Đã chép</span>
            </>
          ) : (
            <>
              <IconCopy className="w-3 h-3" />
              <span>Chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto max-w-full p-3 text-[13px] leading-relaxed font-mono text-slate-100">
        <code>{content}</code>
      </pre>
    </div>
  );
};

export const RichText: React.FC<RichTextProps> = ({ text, className = '' }) => {
  const blocks = parseRichBlocks(text);

  return (
    <div className={`space-y-2 break-words ${className}`}>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'code') {
          return <CodeBlock key={blockIdx} language={block.language} content={block.content} />;
        }

        const lines = block.content.split('\n');
        return (
          <div key={blockIdx} className="space-y-1">
            {lines.map((line, lineIdx) => {
              const tokens = parseInlineTokens(line);
              return (
                <p key={lineIdx} className="leading-relaxed">
                  {tokens.map((tok, tokIdx) => {
                    if (tok.type === 'code') {
                      return (
                        <code
                          key={tokIdx}
                          className="mx-0.5 rounded bg-[#EAEAE4] px-1.5 py-0.5 font-mono text-[0.9em] text-[#2447E5] dark:bg-[#2B3038] dark:text-[#7896FF]"
                        >
                          {tok.value}
                        </code>
                      );
                    }
                    if (tok.type === 'bold') {
                      return (
                        <strong key={tokIdx} className="font-semibold text-[#141413] dark:text-white">
                          {tok.value}
                        </strong>
                      );
                    }
                    if (tok.type === 'italic') {
                      return (
                        <em key={tokIdx} className="italic">
                          {tok.value}
                        </em>
                      );
                    }
                    return <React.Fragment key={tokIdx}>{tok.value}</React.Fragment>;
                  })}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
