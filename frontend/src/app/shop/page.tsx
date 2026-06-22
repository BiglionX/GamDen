'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { shopAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ShopPage() {
  const router = useRouter();
  const [goldCoins, setGoldCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exchangeLoading, setExchangeLoading] = useState<string | null>(null);

  useEffect(() => {
    // 检查用户是否登录
    const token = localStorage.getItem('gamden_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // 从API加载真实数据
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
        } else {
          alert('加载失败，请重试');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleExchange = async (item: string, price: number) => {
    if (!confirm(`确定要花费 ${price} 金币兑换吗？`)) {
      return;
    }

    setExchangeLoading(item);
    try {
      let response;
      if (item === 'avatar_frame') {
        response = await shopAPI.exchangeAvatarFrame(`frame_${Date.now()}`);
      } else if (item === 'chat_bubble') {
        response = await shopAPI.exchangeChatBubble(`bubble_${Date.now()}`);
      } else if (item === 'special_signature') {
        response = await shopAPI.exchangeSpecialSignature(30);
      }

      if (response?.code === 200) {
        alert('兑换成功！');
        loadGoldCoins();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '兑换失败');
    } finally {
      setExchangeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">百货商城</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 px-4 py-2 rounded-lg">
              <span className="text-yellow-800 font-bold">💰 金币：{goldCoins}</span>
            </div>
            <a href="/territory">
              <Button variant="outline">返回领地</Button>
            </a>
          </div>
        </div>

        {/* 商城商品列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 头像框 */}
          <Card className="p-6">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">头像框</h3>
            <p className="text-gray-600 mb-4">个性化你的头像，展示独特风格</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-yellow-600">200 💰</span>
              <Button
                onClick={() => handleExchange('avatar_frame', 200)}
                loading={exchangeLoading === 'avatar_frame'}
                disabled={goldCoins < 200}
              >
                兑换
              </Button>
            </div>
          </Card>

          {/* 聊天气泡 */}
          <Card className="p-6">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">聊天气泡</h3>
            <p className="text-gray-600 mb-4">自定义聊天消息气泡样式</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-yellow-600">150 💰</span>
              <Button
                onClick={() => handleExchange('chat_bubble', 150)}
                loading={exchangeLoading === 'chat_bubble'}
                disabled={goldCoins < 150}
              >
                兑换
              </Button>
            </div>
          </Card>

          {/* 特殊签名 */}
          <Card className="p-6">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold mb-2">特殊签名</h3>
            <p className="text-gray-600 mb-4">30字签名权限（30天）</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-yellow-600">300 💰</span>
              <Button
                onClick={() => handleExchange('special_signature', 300)}
                loading={exchangeLoading === 'special_signature'}
                disabled={goldCoins < 300}
              >
                兑换
              </Button>
            </div>
          </Card>
        </div>

        {/* 金币获取途径说明 */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">如何获取金币？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">📅</div>
              <div>
                <div className="font-medium">每日签到</div>
                <div className="text-sm text-gray-600">+10金币（连续签到额外+5/天）</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">✍️</div>
              <div>
                <div className="font-medium">发帖</div>
                <div className="text-sm text-gray-600">+5金币（每日上限50）</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">💬</div>
              <div>
                <div className="font-medium">回帖</div>
                <div className="text-sm text-gray-600">+2金币（每日上限20）</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">👥</div>
              <div>
                <div className="font-medium">邀请好友</div>
                <div className="text-sm text-gray-600">+50金币（好友需活跃7天）</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
