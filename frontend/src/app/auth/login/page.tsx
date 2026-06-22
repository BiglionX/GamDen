'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { useAuth } from '@/services/authStore';
import { getDeviceId } from '@/utils/deviceId';
import { trackConversion } from '@/services/tracking';

type LoginMethod = 'phone' | 'wechat';

export default function LoginPage() {
  const router = useRouter();
  const { loginSuccess } = useAuth();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  
  // 手机号密码登录
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // 手机号验证码登录
  const [smsPhone, setSmsPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [error, setError] = useState('');

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendSms = async () => {
    if (!smsPhone) {
      setError('请输入手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(smsPhone)) {
      setError('请输入正确的手机号');
      return;
    }

    setSendingSms(true);
    setError('');

    try {
      const response = await authAPI.sendSms(smsPhone, 'login');
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

  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({ phone, password });

      if (response.code === 200 && response.data) {
        loginSuccess(
          response.data.token,
          response.data.refresh_token,
          {
            user_id: response.data.user_id,
            phone,
          },
          response.data.territory_coord_x || 0,
          response.data.territory_coord_y || 0
        );

        trackConversion('login');
        router.push('/territory');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!smsPhone) {
      setError('请输入手机号');
      return;
    }
    if (!smsCode) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.loginByPhone({
        phone: smsPhone,
        sms_code: smsCode,
        device_id: getDeviceId(),
      });

      if (response.code === 200 && response.data) {
        loginSuccess(
          response.data.token,
          response.data.refresh_token,
          {
            user_id: response.data.user_id,
            phone: smsPhone,
          },
          response.data.territory_coord_x || 0,
          response.data.territory_coord_y || 0
        );

        trackConversion('login');
        router.push('/territory');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <span className="text-brand-gold text-glow-gold">归</span>巢
            </h1>
            <p className="text-sm text-brand-paper-mute font-serif italic">
              欢迎回到你的领地
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
              密码登录
              {loginMethod === 'phone' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('sms')}
              className={[
                'flex-1 pb-3 text-sm font-serif transition-colors relative',
                loginMethod === 'sms'
                  ? 'text-brand-gold'
                  : 'text-brand-paper-mute hover:text-brand-paper',
              ].join(' ')}
            >
              验证码登录
              {loginMethod === 'sms' && (
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
              微信登录
              {loginMethod === 'wechat' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
              )}
            </button>
          </div>

          {loginMethod === 'phone' && (
            <form className="space-y-5" onSubmit={handlePhonePasswordLogin}>
              {error && (
                <div className="bg-brand-beacon/15 border border-brand-beacon/40 text-brand-beacon px-4 py-2.5 rounded-nest-sm text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <Input
                id="phone"
                type="tel"
                label="手机号"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
              />

              <Input
                id="password"
                type="password"
                label="巢穴密钥"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? '进入中...' : '进入巢穴'}
              </Button>
            </form>
          )}

          {loginMethod === 'sms' && (
            <form className="space-y-5" onSubmit={handlePhoneSmsLogin}>
              {error && (
                <div className="bg-brand-beacon/15 border border-brand-beacon/40 text-brand-beacon px-4 py-2.5 rounded-nest-sm text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <Input
                id="sms_phone"
                type="tel"
                label="手机号"
                required
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="请输入手机号"
              />

              <div>
                <Input
                  id="sms_code"
                  type="text"
                  label="验证码"
                  required
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? '进入中...' : '进入巢穴'}
              </Button>
            </form>
          )}

          {loginMethod === 'wechat' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-brand-paper-mute font-serif mb-6">
                使用微信一键登录，快速回到巢穴
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
            还没有领地？
            <Link
              href="/auth/register"
              className="text-brand-gold hover:text-brand-gold-light ml-1 font-medium"
            >
              建立新巢
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response: any = await authAPI.login({ phone, password });

      if (response.code === 200) {
        localStorage.setItem('gamden_token', response.data.token);
        localStorage.setItem('gamden_refresh_token', response.data.refresh_token);
        localStorage.setItem(
          'gamden_user',
          JSON.stringify({
            user_id: response.data.user_id,
            territory_coord_x: response.data.territory_coord_x,
            territory_coord_y: response.data.territory_coord_y,
          })
        );
        router.push('/territory');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl text-brand-paper mb-2">
              <span className="text-brand-gold text-glow-gold">归</span>巢
            </h1>
            <p className="text-sm text-brand-paper-mute font-serif italic">
              欢迎回到你的领地
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-brand-beacon/15 border border-brand-beacon/40 text-brand-beacon px-4 py-2.5 rounded-nest-sm text-sm animate-fade-in">
                {error}
              </div>
            )}

            <Input
              id="phone"
              type="tel"
              label="手机号"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
            />

            <Input
              id="password"
              type="password"
              label="巢穴密钥"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? '进入中...' : '进入巢穴'}
            </Button>

            <div className="text-center text-sm text-brand-paper-mute pt-2">
              还没有领地？
              <Link
                href="/auth/register"
                className="text-brand-gold hover:text-brand-gold-light ml-1 font-medium"
              >
                建立新巢
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}