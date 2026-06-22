'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { inviteAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { ProgressBar } from '@/components/business';

export default function InvitePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('gamden_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const loadInviteData = async () => {
      try {
        setLoading(true);
        setError(null);

        const codeResponse = await inviteAPI.getCode();
        if (codeResponse.code === 0 && codeResponse.data) {
          setInviteCode(codeResponse.data.invite_code);
        }

        const progressResponse = await inviteAPI.getProgress();
        if (progressResponse.code === 0 && progressResponse.data) {
          setProgress(progressResponse.data);
        }
      } catch (err: any) {
        console.error('加载邀请数据失败:', err);
        setError(err.response?.data?.message || '加载失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    loadInviteData();
  }, [router]);

  const copyInviteCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
  };

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/invite?code=${inviteCode}`;
    navigator.clipboard.writeText(shareLink);
  };

  if (loading) {
    return (
      <LayoutShell showBottomTabs={false}>
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute font-serif italic animate-pulse-soft">
          召唤盟友中...
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell showBottomTabs={false}>
        <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
          <div>
            <div className="text-brand-beacon mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>重试</Button>
          </div>
        </div>
      </LayoutShell>
    );
  }

  const invitedCount = progress?.invited_count || 0;
  const unlocked = invitedCount >= 3;

  return (
    <LayoutShell
      showBottomTabs={false}
      topBarLeft={
        <button
          onClick={() => router.back()}
          className="text-brand-paper-mute hover:text-brand-gold transition-colors"
          aria-label="返回"
        >
          ‹
        </button>
      }
      topBarRight={
        <span className="font-serif text-sm text-brand-paper-mute">邀请</span>
      }
    >
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="text-center mb-2">
          <h1 className="font-serif text-3xl text-brand-paper mb-2">
            召唤<span className="text-brand-gold text-glow-gold">盟友</span>
          </h1>
          <p className="text-sm text-brand-paper-mute font-serif italic">
            邀 3 位好友，解锁你的专属领地小程序
          </p>
        </div>

        <Card variant="scroll">
          <CardBody className="p-6">
            <ProgressBar
              value={Math.min(invitedCount, 3)}
              max={3}
              label="进度"
              size="lg"
            />
            <p className="text-sm text-brand-paper-mute mt-3 font-serif italic">
              {unlocked
                ? '✦ 已解锁小程序码，可保存分享'
                : `还差 ${3 - invitedCount} 位盟友，巢穴的边界即可再扩`}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <div className="text-xs text-brand-paper-mute mb-2 font-medium uppercase tracking-wider">
                你的邀请码
              </div>
              <div className="flex items-center justify-between bg-brand-ink-deep rounded-nest-md p-3 border border-brand-gold-deep/30">
                <span className="text-2xl font-mono text-brand-gold tracking-widest text-glow-gold">
                  {inviteCode || '------'}
                </span>
                <Button variant="outline" size="sm" onClick={copyInviteCode}>
                  复制
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs text-brand-paper-mute mb-2 font-medium uppercase tracking-wider">
                分享链接
              </div>
              <div className="flex items-center justify-between bg-brand-ink-deep rounded-nest-md p-3 border border-brand-gold-deep/30">
                <span className="text-sm text-brand-paper-mute truncate flex-1 mr-3">
                  点击复制完整链接
                </span>
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  复制
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {progress?.invite_list && progress.invite_list.length > 0 && (
          <Card>
            <CardHeader>盟友记录</CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-brand-gold-deep/20">
                {progress.invite_list.map((invite: any) => (
                  <li
                    key={invite.invitee_id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-brand-paper">
                        {invite.invitee_nickname}
                      </div>
                      <div className="text-xs text-brand-mute">
                        邀请于{' '}
                        {new Date(invite.invited_at).toLocaleDateString()}
                      </div>
                    </div>
                    {invite.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-nest-sm bg-brand-vitality/20 text-brand-vitality border border-brand-vitality/40">
                        ✓ 已活跃
                      </span>
                    ) : (
                      <span className="text-xs text-brand-mute font-serif italic">
                        等待活跃
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <Card variant="sunken">
          <CardBody className="p-5">
            <h3 className="font-serif text-sm text-brand-paper mb-3">邀请规则</h3>
            <ol className="text-xs text-brand-paper-mute space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>将邀请码或分享链接发给好友</li>
              <li>好友凭邀请码完成注册</li>
              <li>好友活跃 7 天后，计入你的进度</li>
              <li>满 3 人，自动解锁你的小程序</li>
            </ol>
            <div className="mt-4 p-3 bg-brand-beacon/10 border border-brand-beacon/30 rounded-nest-sm">
              <p className="text-xs text-brand-beacon">
                ⚠ 防刷机制：同设备不可重复注册，被邀请人需活跃 7 天计入进度
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </LayoutShell>
  );
}