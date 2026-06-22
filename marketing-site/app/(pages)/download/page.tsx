import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, Globe, Apple, Download, Mail, Key, Shield, Star, Gift } from 'lucide-react';

const DownloadPage: NextPage = () => {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const platforms = [
    {
      name: 'iOS',
      icon: Apple,
      description: '通过TestFlight体验最新版本',
      status: '内测中',
      buttonText: '申请TestFlight',
      features: ['抢先体验新功能', '直接参与产品改进', '与开发团队直接交流'],
      color: 'bg-gray-900 text-white'
    },
    {
      name: 'Android',
      icon: Smartphone,
      description: '直接下载APK安装包',
      status: '公测中',
      buttonText: '立即下载',
      features: ['支持Android 7.0+', '无需Google Play', '自动更新检测'],
      color: 'bg-green-600 text-white'
    },
    {
      name: 'Windows',
      icon: Monitor,
      description: 'PC端大屏体验，专业领地编辑',
      status: '开发中',
      buttonText: '预约测试',
      features: ['4K分辨率支持', '专业编辑器', '键鼠精准操作'],
      color: 'bg-blue-600 text-white'
    },
    {
      name: 'macOS',
      icon: Monitor,
      description: 'Mac用户专属优化版本',
      status: '计划中',
      buttonText: '敬请期待',
      features: ['原生M系列芯片优化', 'Retina显示支持', 'macOS设计语言'],
      color: 'bg-gray-700 text-white'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email || inviteCode) {
      setSubmitted(true);
    }
  };

  return (
    <>
      <Head>
        <title>下载中心 - GamDen</title>
        <meta name="description" content="下载GamDen应用，开启你的游戏社交之旅" />
      </Head>

      <main className="pt-20">
        {/* Header */}
        <section className="py-20 bg-space-black-light/30 text-center">
          <div className="container-custom">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              下载 GamDen
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 max-w-3xl mx-auto"
            >
              选择适合你的平台，加入10,000+游戏玩家的行列，在去中心化的游戏世界中建立你的专属巢穴
            </motion.p>
          </div>
        </section>

        {/* 下载平台 */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {platforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card text-center relative overflow-hidden"
                >
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${platform.status === '公测中' ? 'bg-green-500/20 text-green-400' : platform.status === '内测中' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {platform.status}
                  </div>
                  
                  <div className="flex justify-center mb-6">
                    <div className={`p-4 rounded-full ${platform.color}`}>
                      <platform.icon className="w-12 h-12" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-semibold text-white mb-3">{platform.name}</h3>
                  <p className="text-gray-400 mb-6">{platform.description}</p>

                  <ul className="text-left space-y-2 mb-8">
                    {platform.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm text-gray-300">
                        <Star className="w-4 h-4 text-gold mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button 
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${platform.status === '公测中' ? 'bg-gold text-space-black hover:bg-gold-light' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
                    disabled={platform.status !== '公测中'}
                  >
                    {platform.buttonText}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 邀请码申请 */}
        <section className="section-padding bg-gradient-to-r from-gold/5 to-pixel-green/5">
          <div className="container-custom">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
              >
                <h2 className="mb-4">获取邀请码</h2>
                <p className="text-xl text-gray-400">
                  填写邮箱申请内测资格，或直接输入邀请码立即体验
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="card max-w-2xl mx-auto"
              >
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        邮箱地址
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-space-black border border-gold/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold outline-none transition-colors"
                      />
                    </div>

                    <div className="text-center text-gray-500">或</div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Key className="w-4 h-4 inline mr-2" />
                        邀请码（可选）
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="A3B7C9"
                        className="w-full px-4 py-3 bg-space-black border border-gold/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold outline-none transition-colors uppercase"
                      />
                    </div>

                    <button type="submit" className="w-full btn-primary">
                      {email ? '申请内测资格' : inviteCode ? '验证邀请码' : '提交申请'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, type: 'spring' }}
                    >
                      <Gift className="w-16 h-16 text-gold mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-2xl font-semibold text-white mb-4">申请已提交！</h3>
                    <p className="text-gray-300 mb-6">
                      {email ? 
                        '我们会在3个工作日内审核并通过邮件发送邀请码给您。' : 
                        '邀请码验证成功！请前往下载页面获取应用。'
                      }
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)} 
                      className="btn-secondary"
                    >
                      申请另一个
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* 安装指南 */}
        <section className="section-padding">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="mb-4">安装指南</h2>
              <p className="text-xl text-gray-400">简单几步，开启你的游戏社交之旅</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  step: '01',
                  title: '下载应用',
                  description: '选择对应平台下载安装包，Android用户可直接安装APK文件',
                  icon: Download
                },
                {
                  step: '02',
                  title: '注册账户',
                  description: '使用邮箱注册，输入邀请码可获得新手礼包和特殊身份标识',
                  icon: Shield
                },
                {
                  step: '03',
                  title: '创建领地',
                  description: '完成新手引导，选择守护灵，开始装饰你的第一个游戏巢穴',
                  icon: Star
                }
              ].map((guide, index) => (
                <motion.div
                  key={guide.step}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                      <guide.icon className="w-10 h-10 text-gold" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold text-space-black rounded-full flex items-center justify-center font-bold">
                      {guide.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{guide.title}</h3>
                  <p className="text-gray-400">{guide.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default DownloadPage;