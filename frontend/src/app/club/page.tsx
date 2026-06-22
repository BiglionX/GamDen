'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clubAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LayoutShell } from '@/components/layout/LayoutShell';

const mockClubs = [
  {
    id: 1,
    name: '原神茶摊',
    game_name: '原神',
    description: '提瓦特大陆的旅行者聚集地，欢迎一切冒险故事。',
    member_count: 158,
    post_count: 42,
  },
  {
    id: 2,
    name: '王者峡谷',
    game_name: '王者荣耀',
    description: '五排开黑、攻略分享、皮肤鉴赏。',
    member_count: 87,
    post_count: 23,
  },
  {
    id: 3,
    name: '独立游戏驿站',
    game_name: '独立游戏',
    description: '聊聊那些不被算法推荐的好游戏。',
    member_count: 34,
    post_count: 12,
  },
];

export default function ClubPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    game_name: '',
    description: '',
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
        setShowCreateModal(false);
        setCreateForm({ name: '', game_name: '', description: '' });
        loadClubs();
      }
    } catch (error: any) {
      console.error(error.response?.data?.message || '创建失败');
    }
  };

  const loadClubs = () => {
    setClubs(mockClubs);
  };

  if (loading) {
    return (
      <LayoutShell activeTab="club">
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute font-serif italic animate-pulse-soft">
          茶摊即将开张...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell
      activeTab="club"
      topBarLeft={
        <span className="font-serif text-lg text-brand-paper">
          俱乐<span className="text-brand-gold text-glow-gold">部</span>
        </span>
      }
      topBarRight={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          立摊
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto px-4 py-5">
        <p className="text-sm text-brand-paper-mute font-serif italic mb-4 px-1">
          {clubs.length} 间茶摊在此静候
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <Card
              key={club.id}
              variant="scroll"
              onClick={() => router.push(`/club/${club.id}`)}
            >
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif text-lg text-brand-paper">
                    {club.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-brand-gold/15 text-brand-gold rounded-nest-sm border border-brand-gold/30">
                    {club.game_name}
                  </span>
                </div>
                <p className="text-sm text-brand-paper-mute line-clamp-2 mb-3 leading-relaxed">
                  {club.description}
                </p>
                <div className="flex justify-between text-xs text-brand-mute pt-3 border-t border-brand-gold-deep/20">
                  <span>
                    <span className="text-brand-gold font-mono">
                      {club.member_count}
                    </span>{' '}
                    位侠客
                  </span>
                  <span>
                    今日新帖{' '}
                    <span className="text-brand-paper font-mono">
                      {club.post_count}
                    </span>
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {clubs.length === 0 && (
          <div className="py-12 text-center text-brand-paper-mute">
            <p className="font-serif italic">暂无茶摊</p>
            <p className="text-xs mt-1 text-brand-mute">开一间吧</p>
          </div>
        )}
      </div>

      {/* 创建俱乐部弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-brand-ink-deep/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
          <Card variant="scroll" className="w-full max-w-md">
            <CardBody className="p-6">
              <h2 className="font-serif text-xl text-brand-paper mb-1">
                立一间茶摊
              </h2>
              <p className="text-xs text-brand-paper-mute mb-5 font-serif italic">
                邀三五同道，慢慢聊
              </p>

              <form onSubmit={handleCreateClub} className="space-y-4">
                <Input
                  id="club-name"
                  label="茶摊名"
                  required
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="给茶摊起个名字"
                />

                <Input
                  id="club-game"
                  label="所属游戏"
                  required
                  value={createForm.game_name}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      game_name: e.target.value,
                    })
                  }
                  placeholder="如：原神、王者荣耀"
                />

                <Textarea
                  id="club-desc"
                  label="描述（可选）"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="聊聊这间茶摊的风格"
                />

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    建立茶摊
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </LayoutShell>
  );
}
