'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { agentAPI } from '@/services/api';
import { territoryAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AgentPage() {
  const router = useRouter();
  const [agentType, setAgentType] = useState<string>('');
  const [dialogues, setDialogues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        // 获取用户信息（包含守护灵类型）
        const territoryRes: any = await territoryAPI.getInfo();
        if (territoryRes.code === 200) {
          setAgentType(territoryRes.data.guardian_type);
        }

        // 获取守护灵对话历史
        const dialoguesRes: any = await agentAPI.getDialogues(20);
        if (dialoguesRes.code === 200) {
          setDialogues(dialoguesRes.data || []);
        }
      } catch (error: any) {
        console.error('加载守护灵数据失败:', error);
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

  const getAgentEmoji = (type: string) => {
    switch (type) {
      case 'mechanic': return '⚙️';
      case 'elf': return '🌱';
      case 'astrologer': return '🔮';
      default: return '🤖';
    }
  };

  const getAgentName = (type: string) => {
    switch (type) {
      case 'mechanic': return '机械师';
      case 'elf': return '精灵';
      case 'astrologer': return '占星师';
      default: return '守护灵';
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
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">AI守护灵</h1>
          <a href="/territory">
            <Button variant="outline">返回领地</Button>
          </a>
        </div>

        {/* 守护灵信息卡片 */}
        <Card className="p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-8xl">
              {getAgentEmoji(agentType)}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">
                {getAgentName(agentType)}
              </h2>
              <p className="text-gray-600 mb-4">
                {agentType === 'mechanic' && '科技与秩序的守护者，冷静理性，善于分析。'}
                {agentType === 'elf' && '自然与生长的守护者，温柔亲切，热爱生命。'}
                {agentType === 'astrologer' && '命运与星辰的守护者，神秘深邃，洞察万物。'}
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-700 italic">
                  "{dialogues.length > 0 ? dialogues[0].response_text : '守护灵沉默中...'}"
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 对话历史 */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">对话历史</h3>
          
          {dialogues.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无对话记录</p>
          ) : (
            <div className="space-y-4">
              {dialogues.map((dialogue) => (
                <div
                  key={dialogue.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-2xl">
                      {getAgentEmoji(dialogue.agent_type)}
                    </span>
                    <span className="font-medium">
                      {getAgentName(dialogue.agent_type)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(dialogue.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{dialogue.response_text}</p>
                  <div className="text-xs text-gray-400 mt-1">
                    触发事件：{dialogue.trigger_event}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 守护灵说明 */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">关于守护灵</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              守护灵是你在GamDen中的AI伙伴，会在关键时刻为你提供指引和鼓励。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-medium mb-2">⚙️ 机械师</div>
                <p className="text-sm">
                  科技与秩序的守护者。话术风格：冷静、理性、系统化。
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="font-medium mb-2">🌱 精灵</div>
                <p className="text-sm">
                  自然与生长的守护者。话术风格：温柔、亲切、自然化。
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="font-medium mb-2">🔮 占星师</div>
                <p className="text-sm">
                  命运与星辰的守护者。话术风格：神秘、深邃、哲理性。
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              💡 V1.0中守护灵使用固定话术模板。V2.0将接入大模型API，实现真正的智能对话。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
