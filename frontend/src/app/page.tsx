import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { TerritoryIcon } from '@/components/business/TerritoryIcon';
import { AgentAvatar } from '@/components/business/AgentAvatar';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* 装饰：远景像素屋 */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #C9A87C 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9A87C 1px, transparent 1px)',
          backgroundSize: '60px 60px, 80px 80px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo + 主标题 */}
        <div className="mb-2 flex items-center justify-center">
          <TerritoryIcon level={3} size="lg" />
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-medium text-brand-paper mb-3 tracking-wide">
          Gam<span className="text-brand-gold text-glow-gold">Den</span>
        </h1>
        <p className="text-brand-paper-mute font-serif text-lg italic mb-12">
          在算法之外，建一座游戏巢穴
        </p>

        {/* 三栏特性 - 卷轴卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card variant="scroll" className="text-left">
            <CardBody>
              <TerritoryIcon level={2} size="md" className="mb-3" />
              <h2 className="font-serif text-lg text-brand-paper mb-2">领地系统</h2>
              <p className="text-sm text-brand-paper-mute leading-relaxed">
                注册即获专属领地，邀请好友扩张版图。
              </p>
            </CardBody>
          </Card>

          <Card variant="scroll" className="text-left">
            <CardBody>
              <div className="mb-3">
                <AgentAvatar type="elf" size="md" />
              </div>
              <h2 className="font-serif text-lg text-brand-paper mb-2">AI 守护灵</h2>
              <p className="text-sm text-brand-paper-mute leading-relaxed">
                三位守护灵随你挑选，陪你走过巢穴四季。
              </p>
            </CardBody>
          </Card>

          <Card variant="scroll" className="text-left">
            <CardBody>
              <div className="text-4xl mb-3 text-brand-gold">✦</div>
              <h2 className="font-serif text-lg text-brand-paper mb-2">俱乐部</h2>
              <p className="text-sm text-brand-paper-mute leading-relaxed">
                加入志同道合者的古风茶摊，慢慢聊。
              </p>
            </CardBody>
          </Card>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center mb-6">
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
        </div>

        <p className="text-xs text-brand-mute font-serif italic">
          邀请制社区 · 仅限持有邀请码者入内
        </p>
      </div>
    </main>
  );
}
