'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface ClubPageProps {
  params: { clubId: string };
}

export default function ClubDetailPage({ params }: ClubPageProps) {
  const router = useRouter();
  const clubId = parseInt(params.clubId);
  const [club, setClub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (clubId) {
      loadData();
    }
  }, [clubId]);

  const loadData = async () => {
    try {
      const [clubRes, postsRes] = await Promise.all([
        clubAPI.getDetail(clubId),
        clubAPI.getPosts(clubId)
      ]);

      if (clubRes.code === 200) {
        setClub(clubRes.data);
      }

      if (postsRes.code === 200) {
        setPosts(postsRes.data.posts);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.trim()) {
      alert('请输入帖子内容');
      return;
    }

    setPosting(true);
    try {
      const response: any = await clubAPI.createPost({
        club_id: clubId,
        content: newPost
      });

      if (response.code === 200) {
        alert('发帖成功，待审核');
        setNewPost('');
        loadData();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '发帖失败');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">俱乐部不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/club">
              <Button variant="outline" size="sm">← 返回列表</Button>
            </Link>
            <h1 className="text-3xl font-bold mt-4">{club.name}</h1>
            <p className="text-gray-600">游戏：{club.game_name}</p>
          </div>
          <Link href="/territory">
            <Button variant="outline">返回领地</Button>
          </Link>
        </div>

        {/* 俱乐部信息 */}
        <Card className="p-6 mb-8">
          <p className="text-gray-700 mb-4">{club.description}</p>
          <div className="flex space-x-6 text-sm text-gray-500">
            <span>成员：{club.member_count}</span>
            <span>帖子：{club.post_count}</span>
            <span>创建时间：{new Date(club.created_at).toLocaleDateString()}</span>
          </div>
        </Card>

        {/* 发帖表单 */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">发布帖子</h2>
          <form onSubmit={handleCreatePost}>
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="分享你的游戏心得..."
              maxLength={500}
              rows={4}
              className="mb-4"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {newPost.length}/500 字
              </span>
              <Button type="submit" loading={posting}>
                发布帖子
              </Button>
            </div>
          </form>
        </Card>

        {/* 帖子列表 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">帖子列表</h2>
          
          {posts.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              暂无帖子，快来发布第一条吧！
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-6">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    {post.guardian_type === 'mechanic' && '⚙️'}
                    {post.guardian_type === 'elf' && '🌱'}
                    {post.guardian_type === 'astrologer' && '🔮'}
                  </div>
                  <div>
                    <div className="font-medium">{post.nickname}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{post.content}</p>
                <div className="flex space-x-4 text-sm text-gray-500">
                  <span>👍 {post.like_count}</span>
                  <span>💬 {post.reply_count}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
