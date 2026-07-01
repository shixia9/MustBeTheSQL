/**
 * ThinkingSection — collapsible wrapper with framer-motion animations.
 * Replaces native <details> blocks for thought processes, code sections, etc.
 * Uses 'motion' (framer-motion v12) for height/opacity transitions.
 */
import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Optional inline content shown next to the summary when collapsed. */
  summaryExtra?: ReactNode;
  /** Phase A2: when true, shows a spinner to indicate in-progress thinking. */
  running?: boolean;
}

export default function ThinkingSection({ summary, children, defaultOpen = false, summaryExtra, running }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-on-surface-variant/70 cursor-pointer select-none w-full text-left hover:text-on-surface-variant transition-colors"
      >
        <ChevronRight
          size={12}
          className={`transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
        />
        <span>{summary}</span>
        {running && <Loader2 size={11} className="animate-spin text-primary/70 ml-1" />}
        {!open && summaryExtra && (
          <span className="ml-1 text-on-surface-variant/50 truncate">{summaryExtra}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-3 border-l border-outline-variant/20 pl-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}