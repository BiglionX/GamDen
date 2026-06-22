'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { AgentAvatar } from '@/components/business';

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
];

const mockPosts = [
  {
    id: 1,
    nickname: '测试玩家',
    guardian_type: 'mechanic',
    content: '刚刚抽到雷神，分享一波玄学，祝大家好运！',
    like_count: 12,
    reply_count: 5,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    nickname: '玩家B',
    guardian_type: 'elf',
    content: '有组队一起打周本的吗？UID 在签名里。',
    like_count: 3,
    reply_count: 1,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ClubDetailPage({ params }: { params: { clubId: string } }) {
  const router = useRouter();
  const clubId = parseInt(params.clubId);
  const [club, setClub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    // 演示模式：使用模拟数据
    if (clubId === 1) {
      setClub(mockClubs[0]);
      setPosts(mockPosts);
    } else if (clubId === 2) {
      setClub(mockClubs[1]);
      setPosts([]);
    }
    setLoading(false);
  }, [clubId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const response: any = await clubAPI.createPost({
        club_id: clubId,
        content: newPost,
      });
      if (response.code === 200) {
        setNewPost('');
      }
    } catch (error: any) {
      console.error(error.response?.data?.message || '发帖失败');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <LayoutShell activeTab="club">
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute font-serif italic animate-pulse-soft">
          加载中...
        </div>
      </LayoutShell>
    );
  }

  if (!club) {
    return (
      <LayoutShell activeTab="club">
        <div className="flex items-center justify-center min-h-[60vh] text-brand-paper-mute">
          茶摊已打烊
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell
      activeTab="club"
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
        <span className="text-xs px-2 py-1 bg-brand-gold/15 text-brand-gold rounded-nest-sm border border-brand-gold/30">
          {club.game_name}
        </span>
      }
    >
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* 俱乐部头部 */}
        <div className="text-center pb-2">
          <h1 className="font-serif text-2xl text-brand-paper mb-1">
            {club.name}
          </h1>
          <p className="text-sm text-brand-paper-mute font-serif italic">
            {club.description}
          </p>
          <div className="flex justify-center gap-6 mt-3 text-xs text-brand-paper-mute">
            <span>
              <span className="text-brand-gold font-mono">
                {club.member_count}
              </span>{' '}
              位侠客
            </span>
            <span>
              <span className="text-brand-paper font-mono">{club.post_count}</span>{' '}
              篇帖子
            </span>
          </div>
        </div>

        {/* 发帖表单 */}
        <Card>
          <CardBody>
            <form onSubmit={handleCreatePost}>
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="分享你的游戏心得..."
                maxLength={500}
                rows={3}
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-brand-mute font-mono">
                  {newPost.length}/500
                </span>
                <Button type="submit" variant="primary" loading={posting}>
                  发布
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* 帖子列表 */}
        <div className="space-y-3">
          <h2 className="font-serif text-sm text-brand-paper-mute px-1">
            最近的茶话
          </h2>
          {posts.length === 0 ? (
            <Card variant="sunken">
              <CardBody className="text-center py-10 text-brand-paper-mute">
                <p className="font-serif italic">茶摊尚静</p>
                <p className="text-xs mt-1 text-brand-mute">来开个头吧</p>
              </CardBody>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardBody>
                  <div className="flex items-center gap-3 mb-3">
                    <AgentAvatar type={post.guardian_type} size="sm" animated={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-brand-paper">
                        {post.nickname}
                      </div>
                      <div className="text-xs text-brand-mute">
                        {new Date(post.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p className="text-brand-paper-mute leading-relaxed whitespace-pre-wrap mb-3">
                    {post.content}
                  </p>
                  <div className="flex gap-4 text-xs text-brand-paper-mute pt-2 border-t border-brand-gold-deep/20">
                    <span>赞 {post.like_count}</span>
                    <span>回复 {post.reply_count}</span>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </LayoutShell>
  );
}