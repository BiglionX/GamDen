'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { TerritoryIcon } from '@/components/business/TerritoryIcon';
import { AgentAvatar } from '@/components/business/AgentAvatar';
import { HomeAgentGuide } from '@/components/business/HomeAgentGuide';
import { useAuth } from '@/services/authStore';

export default function Home() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  // 游客态：自动跳转到地图（AC-01）
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/territory');
    }
  }, [isLoggedIn, router]);

  // 已登录：显示首页 CTA
  if (isLoggedIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* 装饰：远景光斑 */}
      <motion.div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(201, 168, 124, 0.06), transparent 40%), radial-gradient(circle at 80% 70%, rgba(90, 143, 108, 0.04), transparent 40%)',
        }}
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Logo + 主标题 */}
      <motion.div
        className="relative z-10 max-w-2xl w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mb-3 flex items-center justify-center"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TerritoryIcon level={3} size="lg" />
        </motion.div>

        <motion.h1
          className="font-serif text-5xl md:text-6xl font-medium text-brand-paper mb-3 tracking-wide"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="inline-block">Gam</span>
          <span className="text-brand-gold text-glow-gold inline-block">Den</span>
        </motion.h1>

        <motion.p
          className="text-brand-paper-mute font-serif text-lg italic mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          在算法之外，建一座游戏巢穴
        </motion.p>

        {/* 三栏特性 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            {
              icon: <TerritoryIcon level={2} size="md" />,
              title: '领地系统',
              desc: '注册即获专属领地，邀请好友扩张版图。',
            },
            {
              icon: <AgentAvatar type="elf" size="md" />,
              title: 'AI 守护灵',
              desc: '三位守护灵随你挑选，陪你走过巢穴四季。',
            },
            {
              icon: <span className="text-4xl text-brand-gold">✦</span>,
              title: '俱乐部',
              desc: '加入志同道合者的古风茶摊，慢慢聊。',
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            >
              <Card variant="scroll" className="text-left h-full">
                <CardBody>
                  <div className="mb-3">{card.icon}</div>
                  <h2 className="font-serif text-lg text-brand-paper mb-2">
                    {card.title}
                  </h2>
                  <p className="text-sm text-brand-paper-mute leading-relaxed">
                    {card.desc}
                  </p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="flex gap-4 justify-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <Link href="/auth/login">
            <Button variant="primary" size="lg">
              进入巢穴
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="outline" size="lg">
              注册新领地
            </Button>
          </Link>
        </motion.div>

        <motion.p
          className="text-xs text-brand-mute font-serif italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
        >
          邀请制社区 · 仅限持有邀请码者入内
        </motion.p>
      </motion.div>

      {/* 守护灵引导气泡（首次访问时显示） */}
      <HomeAgentGuide />
    </main>
    );
  }

  // 游客态：加载中（即将跳转）
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-brand-paper-mute font-serif italic animate-pulse-soft">
        正在踏入巢穴...
      </div>
    </main>
  );
}