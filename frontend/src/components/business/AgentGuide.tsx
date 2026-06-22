'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentAvatar, GuardianType, getGuardianName } from '@/components/business/AgentAvatar';
import { Button } from '@/components/ui/button';

interface AgentGuideProps {
  type: GuardianType | string;
  message: string;
  cta?: { label: string; onClick: () => void };
  /** 自动显示延时（毫秒） */
  delay?: number;
  /** 显示后自动隐藏延时 */
  autoHide?: number;
  /** 底部锚点位置（指向元素） */
  anchor?: 'top' | 'bottom';
  /** 是否可关闭 */
  dismissible?: boolean;
  onDismiss?: () => void;
}

/**
 * 守护灵引导气泡 - 首次访问触发
 * 区别于 AgentBubble：浮动 + 带箭头 + 自动消失 + CTA
 */
export const AgentGuide: React.FC<AgentGuideProps> = ({
  type,
  message,
  cta,
  delay = 500,
  autoHide,
  anchor = 'bottom',
  dismissible = true,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const showT = setTimeout(() => setVisible(true), delay);
    if (autoHide) {
      const hideT = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, delay + autoHide);
      return () => {
        clearTimeout(showT);
        clearTimeout(hideT);
      };
    }
    return () => clearTimeout(showT);
  }, [delay, autoHide, dismissed, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  const arrowPosition =
    anchor === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="relative max-w-xs"
          initial={{ opacity: 0, y: anchor === 'top' ? 10 : -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {/* 气泡 */}
          <div
            className={[
              'relative rounded-nest-md p-4 pr-8 border-2',
              'bg-brand-ink-raised/95 backdrop-blur-md border-brand-gold/50 shadow-nest-card',
            ].join(' ')}
            style={{
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(201, 168, 124, 0.2)',
            }}
          >
            {/* 关闭按钮 */}
            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-2 right-2 w-5 h-5 rounded-nest-sm text-brand-paper-mute hover:text-brand-paper hover:bg-brand-ink-deep/60 transition-colors flex items-center justify-center text-xs"
                aria-label="关闭"
              >
                ×
              </button>
            )}

            <div className="flex items-start gap-3">
              <AgentAvatar type={type} size="sm" animated={false} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-brand-gold mb-1 font-medium">
                  守护灵 · {getGuardianName(type)}
                </div>
                <p className="text-sm text-brand-paper leading-relaxed">
                  {message}
                </p>
                {cta && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        cta.onClick();
                        handleDismiss();
                      }}
                    >
                      {cta.label}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 尾巴 */}
            <div
              className={[
                'absolute left-6 w-3 h-3 rotate-45',
                anchor === 'top' ? '-bottom-1.5' : '-top-1.5',
                'bg-brand-ink-raised border-brand-gold/50',
                anchor === 'top'
                  ? 'border-b-2 border-r-2'
                  : 'border-t-2 border-l-2',
              ].join(' ')}
              style={{
                background: 'rgba(42, 50, 43, 0.95)',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};