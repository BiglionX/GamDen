'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { AgentAvatar, GuardianType } from '@/components/business/AgentAvatar';

const guardianOptions: { value: GuardianType; name: string; desc: string }[] = [
  { value: 'mechanic', name: '机械师', desc: '科技与秩序的守护者' },
  { value: 'elf', name: '精灵', desc: '自然与生长的守护者' },
  { value: 'astrologer', name: '占星师', desc: '命运与星辰的守护者' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    invite_code: '',
    guardian_type: '' as GuardianType | '',
    nickname: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密钥不一致');
      return;
    }
    if (formData.password.length < 8) {
      setError('密钥长度至少 8 位');
      return;
    }
    if (!formData.guardian_type) {
      setError('请选择一位守护灵');
      return;
    }

    setLoading(true);

    try {
      const response: any = await authAPI.register({
        phone: formData.phone,
        password: formData.password,
        invite_code: formData.invite_code,
        guardian_type: formData.guardian_type,
        nickname: formData.nickname,
      });

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
        setError(response.message || '建巢失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '建巢失败，请重试');
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
              建<span className="text-brand-gold text-glow-gold">巢</span>
            </h1>
            <p className="text-sm text-brand-paper-mute font-serif italic">
              在算法的角落，为自己开辟一片领地
            </p>
          </div>

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
              onChange={handleChange}
              placeholder="请输入邀请码"
            />

            <Input
              id="phone"
              name="phone"
              type="tel"
              label="手机号"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号"
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="巢穴密钥"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="至少 8 位"
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="确认密钥"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请再次输入密钥"
            />

            <Input
              id="nickname"
              name="nickname"
              type="text"
              label="昵称（可选）"
              value={formData.nickname}
              onChange={handleChange}
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

            <div className="text-center text-sm text-brand-paper-mute pt-2">
              已有巢穴？
              <Link
                href="/auth/login"
                className="text-brand-gold hover:text-brand-gold-light ml-1 font-medium"
              >
                直接归巢
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}