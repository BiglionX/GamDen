'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { territoryAPI, shopAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { LayoutShell } from '@/components/layout/LayoutShell';
import {
  CoinBadge,
  ProgressBar,
  MapCanvas,
  MapTerritory,
  NeighborInfo,
} from '@/components/business';

export default function TerritoryPage() {
  const router = useRouter();
  const [territoryInfo, setTerritoryInfo] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<MapTerritory[]>([]);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [mapMode, setMapMode] = useState<'map' | 'info'>('map');

  const loadTerritoryData = async () => {
    try {
      const [territoryRes, neighborsRes] = await Promise.all([
        territoryAPI.getInfo(),
        territoryAPI.getNearby(6),
      ]);

      if (territoryRes?.code === 200 && territoryRes.data) {
        setTerritoryInfo(territoryRes.data);
      }

      if (neighborsRes?.code === 200 && Array.isArray(neighborsRes.data)) {
        const selfInfo = territoryRes?.code === 200 ? territoryRes.data : null;
        const selfX = selfInfo?.territory_coord_x ?? 0;
        const selfY = selfInfo?.territory_coord_y ?? 0;

        // 在邻居中加入"自己"作为地图中心
        const allTerritories: MapTerritory[] = [
          {
            id: 'self',
            user_id: selfInfo?.user_id,
            level: selfInfo?.level || 1,
            nickname: selfInfo?.nickname || '我的巢穴',
            guardian_type: selfInfo?.guardian_type,
            coord_x: selfX,
            coord_y: selfY,
            is_self: true,
          },
          ...neighborsRes.data.map((n: any) => ({
            id: n.user_id,
            user_id: n.user_id,
            level: n.level || 1,
            nickname: n.nickname,
            guardian_type: n.guardian_type,
            coord_x: n.territory_coord_x,
            coord_y: n.territory_coord_y,
          })),
        ];
        setNeighbors(allTerritories);
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
      if (response?.code === 200) {
        loadTerritoryData();
      }
    } catch (error: any) {
      console.error('签到失败', error);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleGreetNeighbor = (neighbor: NeighborInfo) => {
    console.log('Greet neighbor:', neighbor.nickname);
    // TODO: 接入 OpenIM 后跳转到私聊
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

  const selfCoord = {
    x: territoryInfo?.territory_coord_x ?? 0,
    y: territoryInfo?.territory_coord_y ?? 0,
  };
  const neighborCount = neighbors.filter((n) => !n.is_self).length;

  return (
    <LayoutShell
      activeTab="map"
      topBarLeft={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMapMode('map')}
            className={[
              'font-serif text-lg transition-colors',
              mapMode === 'map'
                ? 'text-brand-gold text-glow-gold'
                : 'text-brand-paper-mute hover:text-brand-paper',
            ].join(' ')}
          >
            领地<span className="ml-1 opacity-60">·</span>
            <span className="ml-1 text-sm">巢穴</span>
          </button>
          <span className="text-brand-mute">/</span>
          <button
            type="button"
            onClick={() => setMapMode('info')}
            className={[
              'text-sm transition-colors',
              mapMode === 'info'
                ? 'text-brand-gold text-glow-gold'
                : 'text-brand-paper-mute hover:text-brand-paper',
            ].join(' ')}
          >
            详情
          </button>
        </div>
      }
      topBarRight={
        territoryInfo && (
          <CoinBadge amount={territoryInfo.gold_coins || 0} size="sm" />
        )
      }
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        {mapMode === 'map' ? (
          <>
            {/* 地图模式 */}
            <div className="mb-3 px-1 flex items-center justify-between text-xs text-brand-paper-mute">
              <span className="font-serif italic">
                坐标 ({selfCoord.x}, {selfCoord.y}) · 周边{' '}
                <span className="text-brand-gold">{neighborCount}</span> 位侠客
              </span>
            </div>

            <MapCanvas
              selfCoord={selfCoord}
              neighbors={neighbors}
              viewRange={5}
              cellSize={64}
              onGreetNeighbor={handleGreetNeighbor}
            />

            {/* 邀请入口 */}
            <Card
              variant="sunken"
              className="cursor-pointer hover:border-brand-gold transition-colors mt-3"
              onClick={() => router.push('/invite')}
            >
              <CardBody className="p-4 flex items-center gap-3">
                <div className="text-2xl text-brand-gold">✉</div>
                <div className="flex-1">
                  <div className="font-serif text-brand-paper text-sm">
                    邀请更多侠客
                  </div>
                  <div className="text-xs text-brand-paper-mute mt-0.5">
                    邀 3 位解锁你的专属小程序
                  </div>
                </div>
                <div className="text-brand-gold text-lg">›</div>
              </CardBody>
            </Card>
          </>
        ) : (
          <>
            {/* 详情模式 */}
            <Card variant="scroll" className="overflow-hidden mb-3">
              <CardBody className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-gold to-brand-gold-deep rounded-nest-md flex items-center justify-center text-4xl shadow-glow-gold">
                    {territoryInfo?.guardian_type === 'mechanic' && '⚙'}
                    {territoryInfo?.guardian_type === 'elf' && '✦'}
                    {territoryInfo?.guardian_type === 'astrologer' && '☽'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="font-serif text-xl text-brand-paper">
                        Lv.{territoryInfo?.level || 1} 领地
                      </h2>
                      <span className="text-xs text-brand-mute font-mono">
                        ({selfCoord.x}, {selfCoord.y})
                      </span>
                    </div>
                    <p className="text-sm text-brand-paper-mute italic font-serif mt-1 line-clamp-2">
                      "{territoryInfo?.signature || '尚未留下印记'}"
                    </p>
                  </div>
                </div>

                <ProgressBar
                  value={territoryInfo?.exp || 0}
                  max={territoryInfo?.next_level_exp || 100}
                  label="经验"
                  size="md"
                />
              </CardBody>
            </Card>

            {/* 统计 */}
            <Card className="mb-3">
              <CardBody className="p-4 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">金币</div>
                  <div className="font-mono text-brand-gold text-lg font-semibold">
                    {territoryInfo?.gold_coins || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">等级</div>
                  <div className="font-mono text-brand-paper text-lg font-semibold">
                    Lv.{territoryInfo?.level || 1}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-brand-paper-mute mb-1">邻居</div>
                  <div className="font-mono text-brand-paper text-lg font-semibold">
                    {neighborCount}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Button
              onClick={handleSignIn}
              variant="primary"
              size="lg"
              fullWidth
              loading={signInLoading}
            >
              每日签到 · 领取补给
            </Button>
          </>
        )}
      </div>
    </LayoutShell>
  );
}