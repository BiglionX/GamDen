'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AgentAvatar } from './AgentAvatar';

interface GuestGuideModalProps {
  onClose: () => void;
}

export const GuestGuideModal: React.FC<GuestGuideModalProps> = ({ onClose }) => {
  const router = useRouter();

  const handleRegister = () => {
    // 保留当前页面路径，注册成功后跳回
    const currentPath = window.location.pathname;
    localStorage.setItem('gamden_return_path', currentPath);
    router.push('/auth/register');
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* 半透明蒙层 */}
      <div className="absolute inset-0 bg-brand-ink-deep/80 backdrop-blur-sm" />

      {/* 居中卡片 */}
      <motion.div
        className="relative w-full max-w-md bg-gradient-to-br from-[rgba(255,252,245,0.98)] to-[rgba(255,250,240,0.98)] rounded-xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 古风边框纹理 */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(201, 168, 124, 0.3) 10px, rgba(201, 168, 124, 0.3) 11px)',
          }}
        />

        {/* 顶部装饰线 */}
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, #C9A87C 30%, #A8865E 50%, #C9A87C 70%, transparent 100%)',
          }}
        />

        <div className="p-8">
          {/* 头部：守护灵对话 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-brand-ink-raised border-2 border-brand-gold/60 overflow-hidden flex-shrink-0">
              <AgentAvatar type="mechanic" size="md" animated />
            </div>
            <div className="flex-1">
              <div
                className="bg-brand-ink/5 rounded-lg px-4 py-3 border border-brand-gold/20"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), 10px 100%, 0 calc(100% - 10px))',
                }}
              >
                <p className="text-brand-paper-mute font-serif text-sm leading-relaxed">
                  你在外面看了那么久，不进来坐坐吗？
                </p>
                <p className="text-brand-ink/60 font-serif text-xs italic mt-2">
                  ——只需要一个名字，我就给你一块地。
                </p>
              </div>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRegister}
              className="w-full py-3 px-6 bg-gradient-to-r from-brand-moss to-brand-moss-dark text-white font-serif text-base rounded-lg shadow-glow-gold hover:shadow-lg transition-all"
            >
              领取我的领地
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-6 bg-transparent border border-brand-gold/30 text-brand-paper-mute font-serif text-base rounded-lg hover:border-brand-gold/60 hover:text-brand-paper transition-all"
            >
              再看看
            </button>
          </div>
        </div>

        {/* 底部装饰线 */}
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, #C9A87C 30%, #A8865E 50%, #C9A87C 70%, transparent 100%)',
          }}
        />
      </motion.div>
    </motion.div>
  );
};
