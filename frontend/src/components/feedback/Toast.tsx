'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 兜底：在没有 Provider 时使用 alert
    return {
      show: (t: Omit<ToastItem, 'id'>) => console.log('[Toast]', t),
      success: (m: string) => console.log('[Toast]', m),
      error: (m: string) => console.error(m),
      info: (m: string) => console.log(m),
      warning: (m: string) => console.warn(m),
    };
  }
  return ctx;
};

const TYPE_STYLES: Record<
  ToastType,
  { border: string; bg: string; icon: string; glow: string }
> = {
  success: {
    border: 'border-brand-vitality',
    bg: 'bg-brand-vitality/15',
    icon: '✓',
    glow: 'rgba(90, 143, 108, 0.5)',
  },
  error: {
    border: 'border-brand-beacon',
    bg: 'bg-brand-beacon/15',
    icon: '✕',
    glow: 'rgba(192, 57, 43, 0.5)',
  },
  info: {
    border: 'border-brand-gold',
    bg: 'bg-brand-gold/15',
    icon: 'ⓘ',
    glow: 'rgba(201, 168, 124, 0.5)',
  },
  warning: {
    border: 'border-brand-gold-light',
    bg: 'bg-brand-gold-light/15',
    icon: '!',
    glow: 'rgba(217, 188, 147, 0.5)',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${idCounter.current++}`;
      const item: ToastItem = { id, duration: 3500, ...toast };
      setToasts((prev) => [...prev, item]);
      if (item.duration && item.duration > 0) {
        setTimeout(() => remove(id), item.duration);
      }
    },
    [remove]
  );

  const value: ToastContextValue = {
    show,
    success: (message, title) => show({ type: 'success', message, title }),
    error: (message, title) => show({ type: 'error', message, title }),
    info: (message, title) => show({ type: 'info', message, title }),
    warning: (message, title) => show({ type: 'warning', message, title }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
};

const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-md px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastView: React.FC<{
  toast: ToastItem;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const style = TYPE_STYLES[toast.type];

  // 进度条计时器
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    if (!toast.duration) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration!) * 100);
      setProgress(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'pointer-events-auto relative overflow-hidden rounded-nest-md border-2 shadow-nest-card',
        'bg-brand-ink-raised/95 backdrop-blur-md',
        style.border,
      ].join(' ')}
      style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 16px ${style.glow}` }}
    >
      <div className="p-3 flex items-start gap-3">
        <span
          className={[
            'flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold flex-shrink-0',
            style.bg,
          ].join(' ')}
        >
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-serif text-sm text-brand-paper mb-0.5">
              {toast.title}
            </div>
          )}
          <div className="text-sm text-brand-paper-mute">{toast.message}</div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="text-brand-mute hover:text-brand-paper transition-colors text-lg leading-none flex-shrink-0"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
      {/* 进度条 */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-ink-deep">
          <motion.div
            className="h-full bg-brand-gold"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
};