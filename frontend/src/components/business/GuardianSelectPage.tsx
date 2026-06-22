'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AgentAvatar, GuardianType, getGuardianName } from '@/components/business/AgentAvatar';
import { Button } from '@/components/ui/button';

const guardians: {
  value: GuardianType;
  name: string;
  desc: string;
  quote: string;
  color: string;
}[] = [
  {
    value: 'mechanic',
    name: '机械师',
    desc: '科技与秩序',
    quote: '"秩序之中藏着自由。"',
    color: '#5A7A8F',
  },
  {
    value: 'elf',
    name: '精灵',
    desc: '自然与生长',
    quote: '"万物皆在呼吸。"',
    color: '#7CA67C',
  },
  {
    value: 'astrologer',
    name: '占星师',
    desc: '命运与星辰',
    quote: '"你的轨迹已被写下。"',
    color: '#8F6FA8',
  },
];

interface GuardianSelectPageProps {
  onSelect?: (type: GuardianType) => Promise<void> | void;
  initialType?: GuardianType | null;
}

/**
 * 守护灵三选一页 - Onboarding 第二步
 * 三选一卡片，带光晕脉冲和个性化台词
 */
export const GuardianSelectPage: React.FC<GuardianSelectPageProps> = ({
  onSelect,
  initialType,
}) => {
  const router = useRouter();
  const [selected, setSelected] = useState<GuardianType | null>(
    initialType || null
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (onSelect) {
        await onSelect(selected);
      } else {
        // 默认行为：存入 localStorage 并跳转注册页
        localStorage.setItem('gamden_pending_guardian', selected);
        router.push('/auth/register');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* 装饰：远景光斑 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(201, 168, 124, 0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(90, 143, 108, 0.06), transparent 40%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl w-full text-center mb-8"
      >
        <p className="text-xs uppercase tracking-[0.4em] text-brand-gold mb-3">
          第二步
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-brand-paper mb-3">
          选择你的<span className="text-brand-gold text-glow-gold">守护灵</span>
        </h1>
        <p className="text-sm text-brand-paper-mute font-serif italic">
          它将陪你走过巢穴的四季，予你指引
        </p>
      </motion.div>

      {/* 三选一卡片 */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-8">
        {guardians.map((g, i) => {
          const active = selected === g.value;
          return (
            <motion.button
              key={g.value}
              type="button"
              onClick={() => setSelected(g.value)}
              className={[
                'group relative flex flex-col items-center p-5 rounded-nest-md transition-all text-left',
                active
                  ? 'bg-brand-ink-raised border-2 border-brand-gold shadow-glow-gold'
                  : 'bg-brand-ink-deep border border-brand-gold-deep/30 hover:border-brand-gold-deep',
              ].join(' ')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
              whileHover={{ scale: active ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={active}
            >
              {/* 选中标记 */}
              {active && (
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-brand-ink text-xs font-bold shadow-glow-gold"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ✓
                </motion.div>
              )}

              {/* 头像 */}
              <AgentAvatar type={g.value} size="xl" animated={active} />

              {/* 名字 + 类型 */}
              <h3 className="mt-3 font-serif text-xl text-brand-paper">
                {g.name}
              </h3>
              <p className="text-xs text-brand-paper-mute mt-0.5">{g.desc}</p>

              {/* 个性化台词 */}
              <p
                className={[
                  'mt-3 text-sm italic text-center font-serif px-2 py-2 rounded-nest-sm transition-colors',
                  active
                    ? 'bg-brand-gold/15 text-brand-gold'
                    : 'bg-brand-ink-deep text-brand-paper-mute',
                ].join(' ')}
              >
                {g.quote}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* 操作 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="relative z-10"
      >
        <Button
          variant="primary"
          size="lg"
          disabled={!selected}
          loading={submitting}
          onClick={handleConfirm}
        >
          {selected ? `与 ${getGuardianName(selected)} 同行` : '请先选择一位'}
        </Button>
      </motion.div>
    </main>
  );
};