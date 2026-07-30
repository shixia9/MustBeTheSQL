/**
 * HtmlReportView — renders HTML content in a sandboxed iframe.
 * Used for displaying LLM-generated HTML reports in the right panel.
 * Supports fullscreen and download.
 */
import { useState, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Download } from 'lucide-react';

interface Props {
  htmlContent: string;
  title?: string;
}

export default function HtmlReportView({ htmlContent, title }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wrap HTML content if it's not a complete document
  const wrappedHtml = htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')
    ? htmlContent
    : `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #10131f;
    background: #fafbfc;
    padding: 24px;
    max-width: 960px;
    margin: 0 auto;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e4e6ee; background: #0d0f14; }
  }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.06); }
  th { font-weight: 600; background: rgba(0,0,0,0.02); }
  h1 { font-size: 20px; margin: 16px 0 8px; }
  h2 { font-size: 16px; margin: 14px 0 6px; }
  h3 { font-size: 14px; margin: 12px 0 4px; }
  p { margin: 6px 0; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`;

  const handleFullscreen = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Listen for fullscreen change events
  const fullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) setIsFullscreen(false);
  }, []);

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', fullscreenChange);
    document.addEventListener('webkitfullscreenchange', fullscreenChange);
  }

  const handleDownload = useCallback(() => {
    const blob = new Blob([wrappedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'report'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [wrappedHtml, title]);

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center py-8 text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
        No HTML report content available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="html-report-viewer relative" style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: `1px solid ${isFullscreen ? 'transparent' : 'var(--color-border-subtle)'}`,
      background: isFullscreen ? '#fff' : undefined,
    }}>
      {/* Toolbar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-3 py-1.5" style={{
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-app-bg-alt)',
        }}>
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
            {title || 'HTML Report'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleFullscreen}
              className="p-1 rounded transition-colors hover:bg-surface-variant/20"
              style={{ color: 'var(--color-ink-tertiary)' }}
              title="Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 rounded transition-colors hover:bg-surface-variant/20"
              style={{ color: 'var(--color-ink-tertiary)' }}
              title="Download HTML"
            >
              <Download size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        srcDoc={wrappedHtml}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{
          height: isFullscreen ? '100vh' : '500px',
          display: 'block',
          background: '#fff',
        }}
        title={title || 'HTML Report'}
      />

      {/* Fullscreen exit button */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
            }}
          >
            <Minimize2 size={14} />
            Exit Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
