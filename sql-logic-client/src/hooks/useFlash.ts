import { useCallback, useEffect, useRef, useState } from 'react';

type FlashType = 'success' | 'error';

interface FlashMessage {
  type: FlashType;
  text: string;
}

/**
 * Shared flash/toast hook with automatic cleanup on unmount.
 *
 * Usage:
 *   const { msg, flash } = useFlash();
 *   flash('success', 'Saved');
 *   // In JSX: {msg && <div className={...}>{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div>}
 */
export function useFlash(defaultDuration = 2500) {
  const [msg, setMsg] = useState<FlashMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flash = useCallback(
    (type: FlashType, text: string, duration?: number) => {
      clearTimer();
      setMsg({ type, text });
      timerRef.current = setTimeout(() => setMsg(null), duration ?? defaultDuration);
    },
    [defaultDuration, clearTimer],
  );

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return { msg, flash };
}
