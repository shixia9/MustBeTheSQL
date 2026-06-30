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
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-surface-container-high border border-outline-variant w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className={variant === 'danger' ? 'text-error' : 'text-amber-500'} />
            <span className="text-sm font-mono font-semibold text-on-surface">{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="text-on-surface-variant/60 hover:text-on-surface transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Message */}
        <div className="px-4 py-4">
          <p className="text-[13px] font-mono text-on-surface-variant leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs font-mono text-on-surface-variant border border-outline-variant hover:bg-surface-container-high transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={'px-4 py-1.5 text-xs font-mono border transition-colors ' + (variant === 'danger'
              ? 'border-error/60 text-error hover:bg-error/10'
              : 'border-amber-500/60 text-amber-500 hover:bg-amber-500/10')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
