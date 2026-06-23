'use client'
import { motion } from 'framer-motion';
import { Users, Calendar, Target, Award, Heart, Rocket } from 'lucide-react';

const AboutPage = () => {
  const team = [
    {
      name: 'BiglionX',
      role: '创始人 & CEO',
      description: '前腾讯游戏制作人，10年游戏行业经验，致力于打造去中心化游戏社交平台'
    },
    {
      name: '技术团队',
      role: '核心技术组',
      description: '来自字节、阿里、网易的资深工程师，专注游戏技术和社交产品创新'
    },
    {
      name: '设计团队',
      role: '创意设计组',
      description: '专业的UI/UX设计师，擅长像素艺术和游戏视觉设计'
    }
  ];

  const milestones = [
    { year: '2024', event: '项目启动，核心团队组建' },
    { year: '2025', event: '完成MVP开发，获得种子轮融资' },
    { year: '2026 Q1', event: '内测版发布，首批1000名玩家入驻' },
    { year: '2026 Q2', event: '正式版上线，用户突破10,000人' },
    { year: '2026 Q3', event: '推出开发者API，生态合作伙伴计划' }
  ];

  return (
    <>
      <div className="pt-20">
        {/* Header */}
        <section className="py-20 bg-space-black-light/30 text-center">
          <div className="container-custom">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              关于我们
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 max-w-3xl mx-auto"
            >
              一群热爱游戏的理想主义者，致力于重新定义游戏社交体验
            </motion.p>
          </div>
        </section>

        {/* 使命愿景 */}
        <section className="section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Target className="w-12 h-12 text-gold mb-6" />
                <h2 className="text-3xl mb-6">我们的使命</h2>
                <p className="text-gray-300 text-lg mb-6">
                  在算法推荐主导的社交时代，我们相信游戏玩家值得更好的社交体验。
                  GamDen致力于打破数据孤岛，让玩家基于真实的游戏兴趣建立深度连接，
                  在去中心化的虚拟世界中创造属于自己的游戏巢穴。
                </p>
                <p className="text-gray-400">
                  我们相信，最好的社交不是被推荐来的，而是因为共同的爱好自然而生的。
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-gradient-to-br from-gold/10 to-pixel-green/10 p-8 rounded-2xl"
              >
                <Heart className="w-12 h-12 text-battle-red mb-6" />
                <h2 className="text-3xl mb-6">我们的愿景</h2>
                <p className="text-gray-300 text-lg mb-6">
                  成为游戏社交领域的开拓者和领导者，构建一个让每个玩家都能找到归属感的
                  去中心化游戏社区。让每一次游戏不仅是娱乐，更是友谊的开始。
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-gold">10K+</div>
                    <div className="text-gray-400">活跃玩家</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gold">1K+</div>
                    <div className="text-gray-400">支持游戏</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 发展历程 */}
        <section className="section-padding bg-space-black-light/30">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <Calendar className="w-12 h-12 text-gold mx-auto mb-4" />
              <h2 className="mb-4">发展历程</h2>
              <p className="text-xl text-gray-400">从构想到现实，每一步都充满热爱</p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gold/30"></div>
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.year}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className="relative flex items-center mb-12"
                  >
                    <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                      <div className={`${index % 2 === 0 ? 'ml-auto' : 'mr-auto'} max-w-xs`}>
                        <div className="text-xl font-bold text-gold mb-2">{milestone.year}</div>
                        <div className="text-gray-300">{milestone.event}</div>
                      </div>
                    </div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gold rounded-full border-4 border-space-black"></div>
                    <div className={`w-1/2 ${index % 2 === 0 ? 'pl-8' : 'pr-8'}`}></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 团队介绍 */}
        <section className="section-padding">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <Users className="w-12 h-12 text-gold mx-auto mb-4" />
              <h2 className="mb-4">核心团队</h2>
              <p className="text-xl text-gray-400">热爱游戏的技术专家与设计精英</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="card text-center"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-gold/20 to-pixel-green/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Users className="w-12 h-12 text-gold" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{member.name}</h3>
                  <div className="text-gold font-medium mb-4">{member.role}</div>
                  <p className="text-gray-400 text-sm">{member.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutPage;