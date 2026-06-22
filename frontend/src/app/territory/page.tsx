'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { territoryAPI } from '@/services/api';
import { shopAPI } from '@/services/api';
import { Button } from '@/components/ui/button';

export default function TerritoryPage() {
  const router = useRouter();
  const [territoryInfo, setTerritoryInfo] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);

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
        const [territoryRes, neighborsRes] = await Promise.all([
          territoryAPI.getInfo(),
          territoryAPI.getNearby(10)
        ]);
        
        if (territoryRes.code === 200) {
          setTerritoryInfo(territoryRes.data);
        }
        if (neighborsRes.code === 200) {
          setNeighbors(neighborsRes.data || []);
        }
      } catch (error: any) {
        console.error('加载领地数据失败:', error);
        if (error.response?.status === 401) {
          // Token过期或无效
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

  const handleSignIn = async () => {
    setSignInLoading(true);
    try {
      const response: any = await shopAPI.signIn();
      if (response.code === 200) {
        alert('签到成功！');
        loadData();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '签到失败');
    } finally {
      setSignInLoading(false);
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
          <h1 className="text-3xl font-bold">我的领地</h1>
          <div className="space-x-4">
            <Link href="/club">
              <Button variant="outline">俱乐部</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline">商城</Button>
            </Link>
            <Link href="/agent">
              <Button variant="outline">守护灵</Button>
            </Link>
          </div>
        </div>

        {/* 领地信息卡片 */}
        {territoryInfo && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center text-4xl">
                    {territoryInfo.guardian_type === 'mechanic' && '⚙️'}
                    {territoryInfo.guardian_type === 'elf' && '🌱'}
                    {territoryInfo.guardian_type === 'astrologer' && '🔮'}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-semibold">Lv.{territoryInfo.level} 领地</h2>
                    <p className="text-gray-600">{territoryInfo.signature || '暂无签名'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">经验值</span>
                    <span>{territoryInfo.exp} / {territoryInfo.next_level_exp}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(territoryInfo.exp / territoryInfo.next_level_exp) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">金币</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {territoryInfo.gold_coins}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">领地坐标</div>
                    <div className="text-lg font-mono">
                      ({territoryInfo.territory_coord_x}, {territoryInfo.territory_coord_y})
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSignIn}
                  loading={signInLoading}
                  className="w-full mt-4"
                >
                  每日签到
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 邻居列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            周围邻居（±10格）- 共 {neighbors.length} 人
          </h3>
          
          {neighbors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无邻居，邀请好友入驻吧！</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {neighbors.map((neighbor) => (
                <div key={neighbor.user_id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {neighbor.guardian_type === 'mechanic' && '⚙️'}
                      {neighbor.guardian_type === 'elf' && '🌱'}
                      {neighbor.guardian_type === 'astrologer' && '🔮'}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium">{neighbor.nickname}</div>
                      <div className="text-sm text-gray-600">Lv.{neighbor.level}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {neighbor.signature || '暂无签名'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    坐标: ({neighbor.territory_coord_x}, {neighbor.territory_coord_y})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
