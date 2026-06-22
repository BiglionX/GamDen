'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/services/authStore';
import { AgentAvatar } from './AgentAvatar';
import { GuestGuideModal } from './GuestGuideModal';

// 守护灵文案库
const guideTexts = [
  { type: 'mechanic', text: '检测到观望信号。巢穴的门是开着的，随时欢迎归队。' },
  { type: 'elf', text: '你站在领地边缘很久了。风在等你做出决定。' },
  { type: 'astrologer', text: '星象显示，你即将做出一个重要的选择。不急，我等你。' },
];

const FREQUENCY_KEY = 'gamden_guide_last_shown';
const MAX_SHOW_TIMES = 2; // 30 分钟内最多 2 次
const FREQUENCY_MS = 30 * 60 * 1000; // 30 分钟

export const GuestGuideBubble: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guide, setGuide] = useState(guideTexts[0]);

  useEffect(() => {
    // 已登录不显示
    if (isLoggedIn) return;

    // 检查频次限制
    const lastShown = localStorage.getItem(FREQUENCY_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown);
      if (elapsed < FREQUENCY_MS) {
        return; // 30 分钟内不再显示
      }
    }

    // 30 秒后显示
    const timer = setTimeout(() => {
      const randomGuide = guideTexts[Math.floor(Math.random() * guideTexts.length)];
      setGuide(randomGuide);
      setVisible(true);

      // 记录显示时间
      localStorage.setItem(FREQUENCY_KEY, Date.now().toString());

      // 15 秒后自动消失
      setTimeout(() => {
        if (!expanded) {
          setVisible(false);
        }
      }, 15000);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const handleClick = () => {
    setExpanded(true);
    setTimeout(() => {
      setShowModal(true);
    }, 300);
  };

  return (
    <>
      <AnimatePresence>
        {visible && !isLoggedIn && (
          <motion.div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 cursor-pointer"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onClick={handleClick}
          >
            <div className="flex items-center gap-3">
              {/* 守护灵头像 */}
              <div className="w-12 h-12 rounded-full bg-brand-ink-raised border-2 border-brand-gold/60 shadow-glow-gold overflow-hidden">
                <AgentAvatar type={guide.type as any} size="sm" animated />
              </div>

              {/* 对话气泡 */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    className="bg-brand-ink-raised/95 backdrop-blur border border-brand-gold/40 rounded-lg px-4 py-3 max-w-xs shadow-nest-card"
                    initial={{ opacity: 0, x: -20, maxWidth: 0 }}
                    animate={{ opacity: 1, x: 0, maxWidth: 320 }}
                    exit={{ opacity: 0, x: -20, maxWidth: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm text-brand-paper font-serif leading-relaxed">
                      {guide.text}
                    </p>
                    <div className="mt-2 text-xs text-brand-paper-mute italic">
                      点击了解更多 →
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 引导弹窗 */}
      {showModal && (
        <GuestGuideModal
          onClose={() => {
            setShowModal(false);
            setExpanded(false);
            setVisible(false);
          }}
        />
      )}
    </>
  );
};
