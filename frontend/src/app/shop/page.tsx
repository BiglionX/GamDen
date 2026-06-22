'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { shopAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { CoinBadge } from '@/components/business';

const items = [
  {
    key: 'avatar_frame',
    name: '头像框',
    desc: '个性化你的头像，展示独特风格',
    price: 200,
    icon: '◐',
  },
  {
    key: 'chat_bubble',
    name: '古风聊天气泡',
    desc: '卷轴样式的消息气泡',
    price: 150,
    icon: '✉',
  },
  {
    key: 'special_signature',
    name: '特殊签名',
    desc: '30 字签名权限（30 天）',
    price: 300,
    icon: '✦',
  },
];

const coinSources = [
  { icon: '☀', title: '每日签到', desc: '+10 金币（连续签到额外 +5/天）' },
  { icon: '✎', title: '发帖', desc: '+5 金币（每日上限 50）' },
  { icon: '☷', title: '回帖', desc: '+2 金币（每日上限 20）' },
  { icon: '☍', title: '邀请好友', desc: '+50 金币（好友需活跃 7 天）' },
];

export default function ShopPage() {
  const router = useRouter();
  const [goldCoins, setGoldCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exchangeLoading, setExchangeLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const response: any = await shopAPI.getGold();
      if (response.code === 200) {
        setGoldCoins(response.data.gold_coins);
      }
    } catch (error: any) {
      console.error('加载金币余额失败:', error);
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

  useEffect(() => {
    const token = localStorage.getItem('gamden_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [router]);

  const handleExchange = async (item: typeof items[number]) => {
    if (goldCoins < item.price) return;
    setExchangeLoading(item.key);
    try {
      let response;
      if (item.key === 'avatar_frame') {
        response = await shopAPI.exchangeAvatarFrame(`frame_${Date.now()}`);
      } else if (item.key === 'chat_bubble') {
        response = await shopAPI.exchangeChatBubble(`bubble_${Date.now()}`);
      } else if (item.key === 'special_signature') {
        response = await shopAPI.exchangeSpecialSignature(30);
      }
      if (response?.code === 200) {
        loadData();
      }
    } catch (error: any) {
      console.error(error.response?.data?.message || '兑换失败');
    } finally {
      setExchangeLoading(null);
    }
  };

  if (loading) {
    return (
      <LayoutShell activeTab="shop">
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute font-serif italic animate-pulse-soft">
          集市开张中...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell
      activeTab="shop"
      topBarLeft={
        <span className="font-serif text-lg text-brand-paper">
          巢穴<span className="text-brand-gold text-glow-gold">集市</span>
        </span>
      }
      topBarRight={<CoinBadge amount={goldCoins} size="sm" />}
    >
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.key} variant="scroll">
              <CardBody>
                <div className="text-3xl text-brand-gold mb-3">{item.icon}</div>
                <h3 className="font-serif text-lg text-brand-paper mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-brand-paper-mute mb-4 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
                <div className="flex items-center justify-between">
                  <CoinBadge amount={item.price} size="sm" />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleExchange(item)}
                    loading={exchangeLoading === item.key}
                    disabled={goldCoins < item.price}
                  >
                    兑换
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>如何获取金币</CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-brand-gold-deep/20">
              {coinSources.map((src) => (
                <li
                  key={src.title}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="text-2xl text-brand-gold w-8 text-center">
                    {src.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-brand-paper">
                      {src.title}
                    </div>
                    <div className="text-xs text-brand-paper-mute">
                      {src.desc}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </LayoutShell>
  );
}