'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { AgentAvatar, GuardianType } from '@/components/business/AgentAvatar';
import { useAuth } from '@/services/authStore';
import { NestAnimation } from '@/components/business/NestAnimation';
import { getDeviceId } from '@/utils/deviceId';
import { trackConversion } from '@/services/tracking';

const guardianOptions: { value: GuardianType; name: string; desc: string }[] = [
  { value: 'mechanic', name: '机械师', desc: '科技与秩序的守护者' },
  { value: 'elf', name: '精灵', desc: '自然与生长的守护者' },
  { value: 'astrologer', name: '占星师', desc: '命运与星辰的守护者' },
];

type LoginMethod = 'phone' | 'wechat';

export default function RegisterPage() {
  const router = useRouter();
  const { loginSuccess } = useAuth();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [formData, setFormData] = useState({
    phone: '',
    sms_code: '',
    invite_code: '',
    guardian_type: '' as GuardianType | '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [showNestAnimation, setShowNestAnimation] = useState(false);
  const [newUserId, setNewUserId] = useState(0);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendSms = async () => {
    if (!formData.phone) {
      setError('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setSendingSms(true);
    setError('');

    try {
      const response = await authAPI.sendSms(formData.phone, 'register');
      if (response.code === 200) {
        setCountdown(60);
      } else {
        setError(response.message || '发送失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '发送失败，请重试');
    } finally {
      setSendingSms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.phone) {
      setError('请输入手机号');
      return;
    }
    if (!formData.sms_code) {
      setError('请输入验证码');
      return;
    }
    if (!formData.guardian_type) {
      setError('请选择一位守护灵');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.registerByPhone({
        phone: formData.phone,
        sms_code: formData.sms_code,
        invite_code: formData.invite_code,
        guardian_type: formData.guardian_type,
        nickname: formData.nickname,
        device_id: getDeviceId(),
      });

      if (response.code === 200 && response.data) {
        // 显示归巢动画
        setNewUserId(response.data.user_id);
        loginSuccess({
          token: response.data.token,
          refresh_token: response.data.refresh_token,
          user_id: response.data.user_id,
          territory_coord_x: response.data.territory_coord_x || 0,
          territory_coord_y: response.data.territory_coord_y || 0,
        });

        // 埋点
        trackConversion('register');

        setShowNestAnimation(true);
      } else {
        setError(response.message || '建巢失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '建巢失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNestAnimationComplete = () => {
    setShowNestAnimation(false);
    // 读取上下文保留的返回路径
    const returnPath = sessionStorage.getItem('gamden_return_path');
    if (returnPath) {
      sessionStorage.removeItem('gamden_return_path');
      router.push(returnPath);
    } else {
      router.push('/territory');
    }
  };

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-6 py-12 relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #C9A87C 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        <Card variant="scroll" className="relative max-w-md w-full">
          <CardBody className="p-8">
            <div className="text-center mb-6">
              <h1 className="font-serif text-4xl text-brand-paper mb-2">
                建<span className="text-brand-gold text-glow-gold">巢</span>
              </h1>
              <p className="text-sm text-brand-paper-mute font-serif italic">
                在算法的角落，为自己开辟一片领地
              </p>
            </div>

            {/* 登录方式切换 */}
            <div className="flex border-b border-brand-gold-deep/30 mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={[
                  'flex-1 pb-3 text-sm font-serif transition-colors relative',
                  loginMethod === 'phone'
                    ? 'text-brand-gold'
                    : 'text-brand-paper-mute hover:text-brand-paper',
                ].join(' ')}
              >
                手机号验证码
                {loginMethod === 'phone' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('wechat')}
                className={[
                  'flex-1 pb-3 text-sm font-serif transition-colors relative',
                  loginMethod === 'wechat'
                    ? 'text-brand-gold'
                    : 'text-brand-paper-mute hover:text-brand-paper',
                ].join(' ')}
              >
                微信一键登录
                {loginMethod === 'wechat' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
                )}
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <>
                {/* 守护灵选择 */}
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-brand-paper-mute">
                    选择你的守护灵
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {guardianOptions.map((opt) => {
                      const active = formData.guardian_type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, guardian_type: opt.value })
                          }
                          className={[
                            'flex flex-col items-center p-3 rounded-nest-md transition-all',
                            active
                              ? 'bg-brand-ink-raised border-2 border-brand-gold shadow-glow-gold'
                              : 'bg-brand-ink-deep border border-brand-gold-deep/30 hover:border-brand-gold-deep',
                          ].join(' ')}
                        >
                          <AgentAvatar type={opt.value} size="md" animated={active} />
                          <span className="mt-2 text-sm font-serif text-brand-paper">
                            {opt.name}
                          </span>
                          <span className="text-xs text-brand-mute mt-0.5 text-center leading-tight">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-brand-beacon/15 border border-brand-beacon/40 text-brand-beacon px-4 py-2.5 rounded-nest-sm text-sm animate-fade-in">
                      {error}
                    </div>
                  )}

                  <Input
                    id="invite_code"
                    name="invite_code"
                    type="text"
                    label="邀请码"
                    required
                    value={formData.invite_code}
                    onChange={(e) =>
                      setFormData({ ...formData, invite_code: e.target.value })
                    }
                    placeholder="请输入邀请码"
                  />

                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    label="手机号"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="请输入手机号"
                  />

                  <div>
                    <Input
                      id="sms_code"
                      name="sms_code"
                      type="text"
                      label="验证码"
                      required
                      value={formData.sms_code}
                      onChange={(e) =>
                        setFormData({ ...formData, sms_code: e.target.value })
                      }
                      placeholder="请输入 6 位验证码"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleSendSms}
                      disabled={sendingSms || countdown > 0}
                      className="text-xs text-brand-gold hover:text-brand-gold-light mt-1 disabled:opacity-50"
                    >
                      {countdown > 0
                        ? `${countdown} 秒后重新发送`
                        : sendingSms
                        ? '发送中...'
                        : '获取验证码'}
                    </button>
                  </div>

                  <Input
                    id="nickname"
                    name="nickname"
                    type="text"
                    label="昵称（可选）"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value })
                    }
                    placeholder="给自己起个名字"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                  >
                    {loading ? '建巢中...' : '建立我的巢穴'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-brand-paper-mute font-serif mb-6">
                  使用微信一键登录，快速加入巢穴
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setError('微信登录功能开发中，敬请期待');
                  }}
                >
                  微信一键登录
                </Button>
                <p className="text-xs text-brand-mute mt-4">
                  微信登录需要配置微信开放平台 AppID
                </p>
              </div>
            )}

            <div className="text-center text-sm text-brand-paper-mute pt-6">
              已有巢穴？
              <Link
                href="/auth/login"
                className="text-brand-gold hover:text-brand-gold-light ml-1 font-medium"
              >
                直接归巢
              </Link>
            </div>
          </CardBody>
        </Card>
      </main>

      {/* 归巢动画 */}
      {showNestAnimation && (
        <NestAnimation
          onComplete={handleNestAnimationComplete}
          userId={newUserId}
        />
      )}
    </>
  );
}