'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NestAnimationProps {
  onComplete: () => void;
  userId: number;
}

export const NestAnimation: React.FC<NestAnimationProps> = ({ onComplete, userId }) => {
  const [phase, setPhase] = useState<'falling' | 'ripple' | 'complete'>('falling');

  useEffect(() => {
    // 阶段 1：种子落地（0-500ms）
    const timer1 = setTimeout(() => setPhase('ripple'), 500);
    
    // 阶段 2：涟漪扩散（500-1500ms）
    const timer2 = setTimeout(() => setPhase('complete'), 1500);
    
    // 阶段 3：完成回调（1500ms）
    const timer3 = setTimeout(() => onComplete(), 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-brand-ink-deep flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 种子落地 */}
        {phase === 'falling' && (
          <motion.div
            className="w-4 h-4 rounded-full bg-brand-gold shadow-glow-gold"
            initial={{ y: -200, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          />
        )}

        {/* 涟漪扩散 */}
        {phase === 'ripple' && (
          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute w-4 h-4 rounded-full bg-brand-gold"
              initial={{ scale: 1 }}
              animate={{ scale: 50, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute w-4 h-4 rounded-full bg-brand-gold/60"
              initial={{ scale: 1 }}
              animate={{ scale: 40, opacity: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute w-4 h-4 rounded-full bg-brand-gold/30"
              initial={{ scale: 1 }}
              animate={{ scale: 30, opacity: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* 完成提示 */}
        {phase === 'complete' && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-brand-gold font-serif text-2xl mb-2">欢迎归巢</p>
            <p className="text-brand-paper-mute font-serif text-lg">
              第 <span className="text-brand-gold font-mono">{userId}</span> 号巢民
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
