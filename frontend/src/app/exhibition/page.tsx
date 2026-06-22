'use client';

import { motion } from 'framer-motion';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { trackPageView, startDwellHeartbeat } from '@/services/tracking';
import { useEffect } from 'react';

export default function ExhibitionPage() {
  useEffect(() => {
    trackPageView('exhibition');
    const cleanup = startDwellHeartbeat('exhibition');
    return cleanup;
  }, []);

  return (
    <LayoutShell activeTab="map">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 占位图标 */}
          <motion.div
            className="mb-8 flex justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-24 h-24 rounded-nest-lg bg-gradient-to-br from-brand-gold/20 to-brand-gold-deep/10 border border-brand-gold/30 flex items-center justify-center">
              <span className="text-5xl">🎪</span>
            </div>
          </motion.div>

          <h1 className="font-serif text-3xl text-brand-paper mb-3">
            即将<span className="text-brand-gold text-glow-gold">开市</span>
          </h1>

          <p className="text-brand-paper-mute font-serif italic text-lg mb-8">
            巢穴的集市正在筹备中，侠客们请稍候
          </p>

          {/* 倒计时装饰 */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            {[
              { label: '游戏上架', icon: '🎮', status: '筹备中' },
              { label: '评测系统', icon: '⭐', status: '筹备中' },
              { label: '下载跳转', icon: '📲', status: '筹备中' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="p-4 rounded-nest-md bg-brand-ink-deep border border-brand-gold-deep/20"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
              >
                <div className="text-3xl mb-2 opacity-50">{item.icon}</div>
                <div className="text-sm font-serif text-brand-paper mb-1">
                  {item.label}
                </div>
                <div className="text-xs text-brand-mute">{item.status}</div>
              </motion.div>
            ))}
          </div>

          <motion.p
            className="text-xs text-brand-mute font-serif italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            V2.0 计划上线 · 敬请期待
          </motion.p>
        </motion.div>
      </div>
    </LayoutShell>
  );
}
