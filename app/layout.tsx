import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '../components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GamDen - 在算法之外，建一座游戏巢穴',
  description: '去中心化游戏社交元宇宙，让你的游戏世界独一无二',
  keywords: '游戏社交, 元宇宙, 像素风, 去中心化, 游戏社区, GamDen',
  authors: [{ name: 'GamDen Team' }],
  openGraph: {
    title: 'GamDen - 在算法之外，建一座游戏巢穴',
    description: '去中心化游戏社交元宇宙，让你的游戏世界独一无二',
    url: 'https://gamden.proclaw.cc',
    siteName: 'GamDen',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GamDen - 游戏巢穴社区'
      }
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GamDen - 在算法之外，建一座游戏巢穴',
    description: '去中心化游戏社交元宇宙，让你的游戏世界独一无二',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}