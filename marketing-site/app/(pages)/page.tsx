'use client'
import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Castle, Handshake, Sword, Gamepad2, Star, Users, Shield, Zap, Smartphone, QrCode, PartyPopper, Crown } from 'lucide-react';

// 特性数据
const features = [
  {
    icon: Castle,
    title: '专属领地',
    description: '每个用户拥有独特的像素风领地，可自由装饰和扩建，打造你的游戏王国',
    color: 'text-gold'
  },
  {
    icon: Handshake,
    title: '真实社交',
    description: '基于共同游戏的深度社交，告别算法推荐的朋友圈，找到真正的游戏伙伴',
    color: 'text-pixel-green'
  },
  {
    icon: Sword,
    title: '领地争夺',
    description: '参与野兽潮等PVE活动，与邻居协作保卫家园，体验团队合作的乐趣',
    color: 'text-battle-red'
  },
  {
    icon: Gamepad2,
    title: '跨游整合',
    description: '整合Steam、Epic、手游等多平台游戏数据，一个账户打通所有游戏世界',
    color: 'text-blue-400'
  }
];

// 统计数据
const stats = [
  { label: '游戏巢穴建成', value: '10,000+' },
  { label: '支持热门游戏', value: '1000+' },
  { label: '日均互动次数', value: '50,000+' },
  { label: '活跃玩家社群', value: '500+' }
];

const HomePage: NextPage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <Head>
        <title>GamDen - 在算法之外，建一座游戏巢穴</title>
        <meta name="description" content="去中心化游戏社交元宇宙，让你的游戏世界独一无二" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* 动态背景 */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-space-black via-space-black-light to-space-black opacity-80"
          style={{
            transform: `translate(${mousePosition.x * 0.005}px, ${mousePosition.y * 0.005}px)`
          }}
        />
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-10" />
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container-custom text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-song mb-6"
            >
              在算法之外，建一座游戏巢穴
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
            >
              去中心化游戏社交元宇宙，让你的游戏世界独一无二
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button className="btn-primary text-lg">
                立即体验
              </button>
              <button className="btn-secondary text-lg">
                观看演示视频
              </button>
            </motion.div>

            {/* 浮动装饰元素 */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-10 w-16 h-16 bg-gold/20 rounded-full blur-xl"
            />
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1/4 right-10 w-24 h-24 bg-pixel-green/20 rounded-full blur-xl"
            />
          </div>
        </section>

        {/* 核心特性 Section */}
        <section className="section-padding bg-space-black-light/30">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2>重新定义游戏社交</h2>
              <p className="text-xl text-gray-400 mt-4 max-w-2xl mx-auto">
                四大核心特性，打造前所未有的游戏社交体验
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="card text-center group"
                >
                  <div className={`inline-block p-4 rounded-full bg-space-black mb-4 ${feature.color}`}>
                    <feature.icon className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 专属小程序门牌卡片 */}
        <section className="section-padding bg-space-black-light/30">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-space-black via-space-black-light to-space-black border border-gold/30 p-8 md:p-12 shadow-2xl">
                {/* 装饰背景 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-pixel-green/5 rounded-full blur-3xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  {/* 左侧图标区 */}
                  <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="flex-shrink-0"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gold/20 to-pixel-green/20 border-2 border-gold/40 flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-2">
                          <Smartphone className="w-8 h-8 text-gold" />
                          <QrCode className="w-8 h-8 text-pixel-green" />
                          <Crown className="w-8 h-8 text-gold/80" />
                          <PartyPopper className="w-8 h-8 text-pixel-green/80" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* 右侧内容区 */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 mb-4">
                      <QrCode className="w-4 h-4 text-gold" />
                      <span className="text-gold text-sm font-medium">邀请解锁</span>
                    </div>
                    
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      📱 你的专属小程序门牌
                    </h3>
                    
                    <p className="text-xl text-gray-300 mb-2">
                      邀请 <span className="text-gold font-bold">3 位好友</span> 入驻 GamDen，即可解锁个人专属小程序
                    </p>
                    
                    <p className="text-gray-400 mb-6">
                      展示你的领地、邀请进度，成为朋友圈里的游戏巢穴主人
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <button className="btn-primary group">
                        <span>了解详情</span>
                        <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>已有 2,847 位玩家解锁</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧装饰 */}
                  <div className="hidden lg:block flex-shrink-0">
                    <div className="relative w-40 h-40">
                      <div className="absolute inset-0 border-2 border-dashed border-gold/30 rounded-xl animate-spin" style={{ animationDuration: '20s' }} />
                      <div className="absolute inset-4 border-2 border-dashed border-pixel-green/30 rounded-lg animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                      <div className="absolute inset-8 bg-gradient-to-br from-gold/10 to-pixel-green/10 rounded-lg flex items-center justify-center">
                        <Crown className="w-12 h-12 text-gold/60" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 底部装饰线 */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* 数据展示 Section */}
        <section className="section-padding">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2>快速成长的游戏社区</h2>
              <p className="text-xl text-gray-400 mt-4">
                每一天，都有更多玩家加入我们的游戏巢穴
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-bold text-gold mb-2 animate-pixel-pulse">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-lg">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* 合作伙伴 Logo 墙 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-20"
            >
              <h3 className="text-center text-2xl mb-12 text-gray-300">合作伙伴</h3>
              <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
                {['Steam', 'Epic Games', '腾讯游戏', '网易游戏', 'Unity', 'Unreal'].map((partner) => (
                  <div key={partner} className="text-2xl font-bold text-gray-500 tracking-wider">
                    {partner}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-padding bg-gradient-to-r from-gold/10 to-pixel-green/10">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="mb-6">准备好建立你的游戏巢穴了吗？</h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                加入10,000+游戏玩家的行列，在去中心化的游戏世界中创造属于你的独特空间
              </p>
              <button className="btn-primary text-xl px-12 py-4">
                立即下载体验
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-space-black-light border-t border-gold/20 py-12">
        <div className="container-custom text-center text-gray-400">
          <p>&copy; 2026 GamDen. 在算法之外，建一座游戏巢穴.</p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="#" className="hover:text-gold transition-colors">关于我们</a>
            <a href="#" className="hover:text-gold transition-colors">产品介绍</a>
            <a href="#" className="hover:text-gold transition-colors">用户故事</a>
            <a href="#" className="hover:text-gold transition-colors">联系我们</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default HomePage;