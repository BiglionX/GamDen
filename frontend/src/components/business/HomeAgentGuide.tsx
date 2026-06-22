'use client';

import { useRouter } from 'next/navigation';
import { AgentGuide } from './AgentGuide';

/**
 * 主页底部的守护灵引导气泡 - Client Component
 * 解决 Server Component 无法传递 onClick 的限制
 */
export const HomeAgentGuide: React.FC = () => {
  const router = useRouter();
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <AgentGuide
        type="elf"
        message="欢迎来到 GamDen。在算法之外，建一座属于你的巢穴。"
        delay={1500}
        autoHide={8000}
        cta={{
          label: '开始探索',
          onClick: () => router.push('/auth/login'),
        }}
      />
    </div>
  );
};