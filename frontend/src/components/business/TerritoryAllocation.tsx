'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TerritoryIcon } from '@/components/business/TerritoryIcon';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface TerritoryAllocationProps {
  territoryId?: number;
  coordX?: number;
  coordY?: number;
  onComplete?: () => void;
  redirectTo?: string;
}

/**
 * 领地分配动画 - Onboarding 第三步
 * 种子从空中落下 → 砸出金色脉冲 → 领地小屋长出 → 弹出欢迎语
 */
export const TerritoryAllocation: React.FC<TerritoryAllocationProps> = ({
  territoryId = 12345,
  coordX = 100,
  coordY = 200,
  onComplete,
  redirectTo = '/territory',
}) => {
  const router = useRouter();
  const [stage, setStage] = useState<'falling' | 'landed' | 'growing' | 'done'>(
    'falling'
  );

  // 阶段推进
  useEffect(() => {
    const t1 = setTimeout(() => setStage('landed'), 1400);
    const t2 = setTimeout(() => setStage('growing'), 1900);
    const t3 = setTimeout(() => setStage('done'), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-brand-ink">
      {/* 远景光晕 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(201, 168, 124, 0.1), transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-md w-full text-center">
        {/* 阶段标签 */}
        <AnimatePresence mode="wait">
          {stage === 'falling' && (
            <motion.p
              key="falling-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs uppercase tracking-[0.3em] text-brand-gold mb-6"
            >
              第三步 · 分配领地
            </motion.p>
          )}
          {stage === 'done' && (
            <motion.p
              key="done-label"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs uppercase tracking-[0.3em] text-brand-gold mb-3"
            >
              巢穴已落定
            </motion.p>
          )}
        </AnimatePresence>

        {/* 中央舞台 */}
        <div className="relative h-64 flex items-center justify-center mb-8">
          {/* 地面光晕（落地后扩散） */}
          <AnimatePresence>
            {stage !== 'falling' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute inset-0 m-auto w-32 h-32 rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(201, 168, 124, 0.4) 0%, transparent 70%)',
                }}
              />
            )}
          </AnimatePresence>

          {/* 种子下落 */}
          <AnimatePresence mode="wait">
            {stage === 'falling' && (
              <motion.div
                key="seed"
                initial={{ y: -260, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: 360 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{
                  y: { duration: 1.2, ease: [0.45, 0, 0.55, 1] },
                  opacity: { duration: 0.2 },
                  rotate: { duration: 1.2, ease: 'easeIn' },
                }}
                className="absolute text-5xl"
              >
                <span className="drop-shadow-[0_0_16px_rgba(201,168,124,0.8)]">
                  ✦
                </span>
              </motion.div>
            )}

            {/* 落地爆炸光 */}
            {stage === 'landed' && (
              <motion.div
                key="burst"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute w-24 h-24 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(201, 168, 124, 0.7), rgba(201, 168, 124, 0))',
                }}
              />
            )}

            {/* 领地生长 */}
            {(stage === 'growing' || stage === 'done') && (
              <motion.div
                key="territory"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  damping: 10,
                  stiffness: 200,
                  delay: 0.1,
                }}
                className="absolute"
              >
                <motion.div
                  animate={
                    stage === 'done'
                      ? { y: [0, -6, 0] }
                      : { y: 0 }
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <TerritoryIcon level={1} size="lg" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 文案 */}
        <AnimatePresence mode="wait">
          {stage === 'falling' && (
            <motion.h2
              key="h-fall"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-serif text-xl text-brand-paper mb-2"
            >
              寻一处合适的地方
            </motion.h2>
          )}

          {stage === 'done' && (
            <motion.div
              key="h-done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-serif text-2xl text-brand-paper mb-2">
                欢迎归巢
              </h2>
              <p className="text-sm text-brand-paper-mute font-serif italic mb-1">
                你获得了第{' '}
                <span className="text-brand-gold text-glow-gold font-mono">
                  #{territoryId}
                </span>{' '}
                号领地
              </p>
              <p className="text-xs text-brand-mute font-mono">
                ({coordX}, {coordY})
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 完成按钮 */}
        <AnimatePresence>
          {stage === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  onComplete?.();
                  router.push(redirectTo);
                }}
              >
                进入我的领地
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};