'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

/**
 * 古风 Modal - 暗色卷轴 + 顶部金色光带
 * 内置：背景遮罩、ESC 关闭、滚动锁定
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
}) => {
  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 锁定滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-brand-ink-deep/85 backdrop-blur-sm"
            onClick={() => closeOnBackdrop && onClose()}
            aria-hidden="true"
          />

          {/* 内容 */}
          <motion.div
            className={[
              'relative w-full',
              SIZE_MAP[size],
              'rounded-nest-md overflow-hidden',
              'bg-brand-ink-raised border border-brand-gold/40 shadow-nest-card',
              className,
            ].join(' ')}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              boxShadow:
                '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 24px rgba(201, 168, 124, 0.2)',
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* 卷轴顶部装饰 */}
            <div
              className="h-1"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, #C9A87C 30%, #A8865E 50%, #C9A87C 70%, transparent 100%)',
              }}
            />

            {/* 标题 */}
            {(title || subtitle) && (
              <div className="px-6 pt-5 pb-3 text-center border-b border-brand-gold-deep/30">
                {title && (
                  <h2 className="font-serif text-xl text-brand-paper">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-brand-paper-mute mt-1 font-serif italic">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-nest-sm text-brand-paper-mute hover:text-brand-paper hover:bg-brand-ink-deep/60 transition-colors flex items-center justify-center"
              aria-label="关闭"
            >
              ×
            </button>

            {/* 内容 */}
            <div className="px-6 py-5 text-brand-paper-mute max-h-[70vh] overflow-y-auto">
              {children}
            </div>

            {/* 底部 */}
            {footer && (
              <div className="px-6 py-4 border-t border-brand-gold-deep/30 flex gap-3 justify-end bg-brand-ink-deep/40">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};