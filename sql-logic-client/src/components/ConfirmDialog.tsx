import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }: ConfirmDialogProps) {
  const accentColor = variant === 'danger' ? 'var(--color-error)' : 'var(--color-semantic-gate)';
  const accentSoft = variant === 'danger' ? 'var(--color-error-soft)' : 'var(--color-semantic-gate-soft)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm overflow-hidden"
        style={{
          background: 'var(--color-panel-bg)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                background: accentSoft,
                color: accentColor,
              }}
            >
              <AlertTriangle size={14} />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{
              width: 28,
              height: 28,
              color: 'var(--color-ink-tertiary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
              e.currentTarget.style.color = 'var(--color-ink)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-ink-tertiary)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Message */}
        <div className="px-4 py-4">
          <p
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--color-ink-secondary)',
              lineHeight: 1.6,
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-content-bg-alt)' }}
        >
          <button onClick={onCancel} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
            style={{
              background: variant === 'danger' ? 'var(--color-error)' : 'var(--color-semantic-gate)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
