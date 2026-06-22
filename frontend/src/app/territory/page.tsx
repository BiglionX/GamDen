'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { territoryAPI } from '@/services/api';
import { shopAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LayoutShell } from '@/components/layout/LayoutShell';
import {
  TerritoryIcon,
  CoinBadge,
  ProgressBar,
  AgentAvatar,
} from '@/components/business';

interface Neighbor {
  user_id: number;
  territory_coord_x: number;
  territory_coord_y: number;
  level: number;
  signature: string;
  guardian_type: string;
  nickname: string;
  avatar?: string;
}

export default function TerritoryPage() {
  const router = useRouter();
  const [territoryInfo, setTerritoryInfo] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);

  const loadTerritoryData = async () => {
    try {
      const [territoryRes, neighborsRes] = await Promise.all([
        territoryAPI.getInfo(),
        territoryAPI.getNearby(10),
      ]);

      if (territoryRes?.code === 200) {
        setTerritoryInfo(territoryRes.data);
      }
      if (neighborsRes?.code === 200) {
        setNeighbors(neighborsRes.data || []);
      }
    } catch (error: any) {
      console.error('加载领地数据失败:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('gamden_token');
        localStorage.removeItem('gamden_refresh_token');
        localStorage.removeItem('gamden_user');
        router.push('/auth/login');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('gamden_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    loadTerritoryData().finally(() => setLoading(false));
  }, [router]);

  const handleSignIn = async () => {
    setSignInLoading(true);
    try {
      const response: any = await shopAPI.signIn();
      if (response.code === 200) {
        loadTerritoryData();
      }
    } catch (error: any) {
      console.error('签到失败', error);
    } finally {
      setSignInLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutShell activeTab="map">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-brand-paper-mute font-serif italic animate-pulse-soft">
            正在踏入巢穴...
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell
      activeTab="map"
      topBarLeft={
        <span className="font-serif text-lg text-brand-paper">
          我的<span className="text-brand-gold text-glow-gold">领地</span>
        </span>
      }
      topBarRight={
        territoryInfo && (
          <CoinBadge amount={territoryInfo.gold_coins || 0} size="sm" />
        )
      }
    >
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {territoryInfo && (
          <Card variant="scroll" className="overflow-hidden">
            <CardBody className="p-6">
              <div className="flex items-start gap-5">
                <TerritoryIcon
                  level={territoryInfo.level || 1}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="font-serif text-2xl text-brand-paper">
                      Lv.{territoryInfo.level || 1} 领地
                    </h2>
                    <span className="text-xs text-brand-mute font-mono">
                      ({territoryInfo.territory_coord_x},{' '}
                      {territoryInfo.territory_coord_y})
                    </span>
                  </div>
                  <p className="text-sm text-brand-paper-mute italic font-serif mb-4 line-clamp-2">
                    "{territoryInfo.signature || '尚未留下印记'}"
                  </p>

                  <ProgressBar
                    value={territoryInfo.exp || 0}
                    max={territoryInfo.next_level_exp || 100}
                    label="经验"
                    size="sm"
                  />
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-brand-gold-deep/30 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">金币</div>
                  <div className="font-mono text-brand-gold font-semibold">
                    {territoryInfo.gold_coins || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">等级</div>
                  <div className="font-mono text-brand-paper font-semibold">
                    Lv.{territoryInfo.level || 1}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">邻居</div>
                  <div className="font-mono text-brand-paper font-semibold">
                    {neighbors.length}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSignIn}
                variant="primary"
                size="lg"
                fullWidth
                loading={signInLoading}
                className="mt-5"
              >
                每日签到 · 领取补给
              </Button>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>周边邻居</span>
              <span className="text-xs text-brand-paper-mute font-normal">
                {neighbors.length} 位侠客
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {neighbors.length === 0 ? (
              <div className="py-12 text-center text-brand-paper-mute">
                <div className="text-3xl mb-2 text-brand-gold opacity-60">✦</div>
                <p className="font-serif italic">周边仍是荒地</p>
                <p className="text-xs mt-1 text-brand-mute">邀请好友来此定居吧</p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-gold-deep/20">
                {neighbors.map((neighbor) => (
                  <li
                    key={neighbor.user_id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-brand-ink-deep/40 transition-colors"
                  >
                    <TerritoryIcon
                      level={neighbor.level || 1}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-paper truncate">
                          {neighbor.nickname}
                        </span>
                        <span className="text-xs text-brand-gold">
                          Lv.{neighbor.level || 1}
                        </span>
                      </div>
                      <div className="text-xs text-brand-paper-mute truncate">
                        {neighbor.signature || '侠客尚未留言'}
                      </div>
                    </div>
                    <AgentAvatar type={neighbor.guardian_type} size="sm" animated={false} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card
          variant="sunken"
          className="cursor-pointer hover:border-brand-gold transition-colors"
          onClick={() => router.push('/invite')}
        >
          <CardBody className="p-5 flex items-center gap-4">
            <div className="text-3xl text-brand-gold">✉</div>
            <div className="flex-1">
              <div className="font-serif text-brand-paper">邀请好友</div>
              <div className="text-xs text-brand-paper-mute mt-0.5">
                邀请 3 位即可解锁你的专属小程序
              </div>
            </div>
            <div className="text-brand-gold text-xl">›</div>
          </CardBody>
        </Card>
      </div>
    </LayoutShell>
  );
}