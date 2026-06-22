'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { agentAPI, territoryAPI } from '@/services/api';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LayoutShell } from '@/components/layout/LayoutShell';
import {
  AgentAvatar,
  AgentBubble,
  getGuardianName,
  GuardianType,
} from '@/components/business';

export default function AgentPage() {
  const router = useRouter();
  const [agentType, setAgentType] = useState<string>('');
  const [dialogues, setDialogues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gamden_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const loadData = async () => {
      try {
        const territoryRes: any = await territoryAPI.getInfo();
        if (territoryRes.code === 200) {
          setAgentType(territoryRes.data.guardian_type);
        }

        const dialoguesRes: any = await agentAPI.getDialogues(20);
        if (dialoguesRes.code === 200) {
          setDialogues(dialoguesRes.data || []);
        }
      } catch (error: any) {
        console.error('加载守护灵数据失败:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('gamden_token');
          localStorage.removeItem('gamden_refresh_token');
          localStorage.removeItem('gamden_user');
          router.push('/auth/login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <LayoutShell activeTab="mine">
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute font-serif italic animate-pulse-soft">
          守护灵正在苏醒...
        </div>
      </LayoutShell>
    );
  }

  const latest = dialogues[0];

  return (
    <LayoutShell
      activeTab="mine"
      topBarLeft={
        <span className="font-serif text-lg text-brand-paper">
          守护<span className="text-brand-gold text-glow-gold">灵</span>
        </span>
      }
    >
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* 守护灵主卡片 */}
        <Card variant="scroll" className="overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center gap-5">
              <AgentAvatar type={agentType as GuardianType} size="xl" />
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-2xl text-brand-paper mb-1">
                  {getGuardianName(agentType)}
                </h2>
                <p className="text-sm text-brand-paper-mute italic font-serif mb-3 leading-relaxed">
                  {agentType === 'mechanic' && '科技与秩序的守护者，冷静理性。'}
                  {agentType === 'elf' && '自然与生长的守护者，温柔亲切。'}
                  {agentType === 'astrologer' && '命运与星辰的守护者，深邃神秘。'}
                </p>
                <div className="text-xs text-brand-paper-mute flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-vitality animate-pulse-soft" />
                  <span>常伴左右</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 最新箴言 */}
        {latest && (
          <div>
            <h3 className="font-serif text-sm text-brand-paper-mute mb-2 px-1">
              今日箴言
            </h3>
            <AgentBubble
              type={latest.agent_type || agentType}
              text={latest.response_text}
              timestamp={new Date(latest.created_at).toLocaleString()}
              triggerEvent={latest.trigger_event}
            />
          </div>
        )}

        {/* 对话历史 */}
        <Card>
          <CardHeader>守护灵语录</CardHeader>
          <CardBody className="space-y-3 p-3">
            {dialogues.length === 0 ? (
              <div className="py-8 text-center text-brand-paper-mute">
                <p className="font-serif italic">守护灵沉默中</p>
              </div>
            ) : (
              dialogues.map((d) => (
                <AgentBubble
                  key={d.id}
                  type={d.agent_type || agentType}
                  text={d.response_text}
                  timestamp={new Date(d.created_at).toLocaleString()}
                  triggerEvent={d.trigger_event}
                />
              ))
            )}
          </CardBody>
        </Card>

        {/* 关于守护灵 */}
        <Card variant="sunken">
          <CardBody className="p-5">
            <h3 className="font-serif text-sm text-brand-paper mb-3">
              关于守护灵
            </h3>
            <p className="text-xs text-brand-paper-mute leading-relaxed mb-4">
              守护灵是你在巢穴中的 AI 伙伴，会在关键时刻为你提供指引和鼓励。
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['mechanic', 'elf', 'astrologer'] as GuardianType[]).map((t) => (
                <div
                  key={t}
                  className={[
                    'p-3 rounded-nest-md text-center border',
                    agentType === t
                      ? 'bg-brand-ink-raised border-brand-gold shadow-glow-gold'
                      : 'bg-brand-ink-deep border-brand-gold-deep/30',
                  ].join(' ')}
                >
                  <AgentAvatar type={t} size="sm" animated={agentType === t} />
                  <div className="text-xs mt-2 font-medium text-brand-paper">
                    {getGuardianName(t)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-mute italic mt-3">
              V1.0 中使用固定话术模板，V2.0 将接入大模型 API。
            </p>
          </CardBody>
        </Card>
      </div>
    </LayoutShell>
  );
}
