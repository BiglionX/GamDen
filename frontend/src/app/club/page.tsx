'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ClubPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    game_name: '',
    description: ''
  });

  useEffect(() => {
    // 演示模式：使用模拟数据
    setClubs(mockClubs);
    setLoading(false);
  }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response: any = await clubAPI.create(createForm);
      if (response.code === 200) {
        alert('俱乐部创建成功！');
        setShowCreateModal(false);
        setCreateForm({ name: '', game_name: '', description: '' });
        loadClubs();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '创建失败');
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
          <h1 className="text-3xl font-bold">俱乐部（贴吧）</h1>
          <div className="space-x-4">
            <Link href="/territory">
              <Button variant="outline">返回领地</Button>
            </Link>
            <Button onClick={() => setShowCreateModal(true)}>
              创建俱乐部
            </Button>
          </div>
        </div>

        {/* 俱乐部列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <Card
              key={club.id}
              onClick={() => router.push(`/club/${club.id}`)}
            >
              <h3 className="text-xl font-semibold mb-2">{club.name}</h3>
              <p className="text-gray-600 mb-2">游戏：{club.game_name}</p>
              <p className="text-sm text-gray-500 mb-4">{club.description}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>成员：{club.member_count}</span>
                <span>帖子：{club.post_count}</span>
              </div>
            </Card>
          ))}
        </div>

        {clubs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无俱乐部，快来创建第一个吧！
          </div>
        )}

        {/* 创建俱乐部弹窗 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">创建俱乐部</h2>
              
              <form onSubmit={handleCreateClub} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    俱乐部名称
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="给俱乐部起个名字"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    游戏名称
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.game_name}
                    onChange={(e) => setCreateForm({ ...createForm, game_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="如：原神、王者荣耀"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="简单介绍一下这个俱乐部"
                  />
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button type="submit" className="flex-1">
                    创建
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
