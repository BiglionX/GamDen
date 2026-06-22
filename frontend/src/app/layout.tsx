import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/feedback/Toast';

export const metadata: Metadata = {
  title: 'GamDen · 游戏巢穴社区',
  description: '在算法之外，建一座游戏巢穴',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-brand-ink text-brand-paper antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}