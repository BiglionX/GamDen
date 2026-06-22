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