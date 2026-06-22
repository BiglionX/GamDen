'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inviteAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InvitePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [codeRes, progressRes] = await Promise.all([
        inviteAPI.getCode(),
        inviteAPI.getProgress()
      ]);

      if (codeRes.code === 200) {
        setInviteCode(codeRes.data.invite_code);
      }

      if (progressRes.code === 200) {
        setProgress(progressRes.data);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert('邀请码已复制！');
  };

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/invite?code=${inviteCode}`;
    navigator.clipboard.writeText(shareLink);
    alert('分享链接已复制！');
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
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">邀请好友</h1>
          <Link href="/territory">
            <Button variant="outline">返回领地</Button>
          </Link>
        </div>

        {/* 邀请进度卡片 */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">邀请进度</h2>
          
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span>已邀请 {progress?.invited_count || 0} 人</span>
              <span>目标 10 人</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{
                  width: `${Math.min((progress?.invited_count || 0) / 10 * 100, 100)}%`
                }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {progress?.invited_count >= 3 
                ? '🎉 已解锁个人小程序！' 
                : `还需邀请 ${3 - (progress?.invited_count || 0)} 人解锁小程序`}
            </p>
          </div>

          {/* 邀请码和分享链接 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">你的邀请码</div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold">{inviteCode}</span>
                <Button onClick={copyInviteCode} size="sm">
                  复制
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">分享链接</div>
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">点击复制链接</span>
                <Button onClick={copyShareLink} size="sm">
                  复制
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 邀请列表 */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">邀请记录</h3>
          
          {!progress?.invite_list || progress.invite_list.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无邀请记录</p>
          ) : (
            <div className="space-y-3">
              {progress.invite_list.map((invite: any) => (
                <div
                  key={invite.invitee_id}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div>
                    <div className="font-medium">{invite.invitee_nickname}</div>
                    <div className="text-sm text-gray-500">
                      邀请时间：{new Date(invite.invited_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    {invite.is_active ? (
                      <span className="text-green-600 text-sm">✓ 已活跃</span>
                    ) : (
                      <span className="text-yellow-600 text-sm">等待活跃中...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 邀请规则说明 */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">邀请规则</h2>
          <div className="space-y-3 text-gray-700">
            <p>1. 分享你的邀请码或分享链接给好友</p>
            <p>2. 好友使用邀请码注册成功</p>
            <p>3. 好友活跃7天后，计入你的邀请进度</p>
            <p>4. 邀请满3人，自动解锁个人小程序</p>
            <p>5. 小程序是引流工具，所有深度交互引导回App</p>
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ 防止刷邀请：同一设备不可重复注册，被邀请人需活跃7天才计入进度
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
