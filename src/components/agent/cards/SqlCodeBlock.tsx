/**
 * SqlCodeBlock — syntax-highlighted SQL or Python code block with copy button.
 * Uses shiki for highlighting and sql-formatter for SQL prettification.
 */
import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';
import { format } from 'sql-formatter';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['dark-plus'],
      langs: ['sql', 'python'],
    });
  }
  return highlighterPromise;
}

interface Props {
  code: string;
  language?: 'sql' | 'python';
}

export default function SqlCodeBlock({ code, language = 'sql' }: Props) {
  const [html, setHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hl = await getHighlighter();
        if (cancelled) return;
        // Format SQL before highlighting
        let formatted = code;
        if (language === 'sql') {
          try { formatted = format(code, { language: 'mysql' }); } catch { /* keep raw */ }
        }
        const result = hl.codeToHtml(formatted, {
          lang: language,
          theme: 'dark-plus',
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml(`<pre>${escapeHtml(code)}</pre>`);
      }
    })();
    return () => { cancelled = true; };
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }, [code]);

  if (!code) return null;

  return (
    <div className="relative group mt-1">
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface-variant/60 hover:text-on-surface"
          title="Copy code"
        >
          {copied ? <Check size={12} className="text-[#16a34a]" /> : <Copy size={12} />}
        </button>
      </div>
      {html ? (
        <div
          className="text-[11px] leading-relaxed overflow-x-auto rounded border border-outline-variant/20 bg-[#1e1e1e] [&>pre]:p-3 [&>pre]:m-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="text-[11px] text-on-surface bg-surface-container-low rounded px-3 py-2 overflow-x-auto border-l-2 border-primary/30 whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}