'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    invite_code: '',
    guardian_type: '',
    nickname: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 8) {
      setError('密码长度至少8位');
      return;
    }

    if (!formData.guardian_type) {
      setError('请选择守护灵');
      return;
    }

    setLoading(true);

    try {
      const response: any = await authAPI.register({
        phone: formData.phone,
        password: formData.password,
        invite_code: formData.invite_code,
        guardian_type: formData.guardian_type,
        nickname: formData.nickname
      });

      if (response.code === 200) {
        // 保存Token和用户信息
        localStorage.setItem('gamden_token', response.data.token);
        localStorage.setItem('gamden_refresh_token', response.data.refresh_token);
        localStorage.setItem('gamden_user', JSON.stringify({
          user_id: response.data.user_id,
          territory_coord_x: response.data.territory_coord_x,
          territory_coord_y: response.data.territory_coord_y
        }));

        // 跳转到首页
        router.push('/territory');
      } else {
        setError(response.message || '注册失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            注册 GamDen
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            已有账号？
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-500">
              立即登录
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              手机号
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="至少8位"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              确认密码
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请再次输入密码"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="invite_code" className="block text-sm font-medium text-gray-700">
              邀请码
            </label>
            <Input
              id="invite_code"
              name="invite_code"
              type="text"
              required
              value={formData.invite_code}
              onChange={handleChange}
              placeholder="请输入邀请码"
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="guardian_type" className="block text-sm font-medium text-gray-700">
              选择守护灵
            </label>
            <Select
              id="guardian_type"
              name="guardian_type"
              required
              value={formData.guardian_type}
              onChange={handleChange}
              className="mt-1"
            >
              <option value="">请选择</option>
              <option value="mechanic">⚙️ 机械师 - 科技与秩序</option>
              <option value="elf">🌿 精灵 - 自然与生长</option>
              <option value="astrologer">🔮 占星师 - 命运与星辰</option>
            </Select>
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
              昵称（可选）
            </label>
            <Input
              id="nickname"
              name="nickname"
              type="text"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="给自己起个名字"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>
      </div>
    </div>
  );
}
