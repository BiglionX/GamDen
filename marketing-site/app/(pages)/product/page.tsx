"use client"
import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Map, Users, Crown, Shield, Swords, Share2, BarChart3, Eye, BookOpen, Heart, Mic, Code, Server, Database } from 'lucide-react';

// 自定义图标组件（因为lucide-react中没有Mountain和Sparkles）
const Mountain = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m11-5a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const ProductPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState('territory');

  const tabs = [
    { id: 'territory', label: '领地系统', icon: Map },
    { id: 'social', label: '社交系统', icon: Users },
    { id: 'content', label: '内容系统', icon: Share2 },
    { id: 'technical', label: '技术架构', icon: BarChart3 }
  ];

  const features = {
    territory: [
      {
        icon: Crown,
        title: '可视化领地编辑器',
        description: '拖拽式装饰领地，数百种建筑、装饰品自由选择，打造独一无二的游戏王国',
        details: '支持实时预览，撤销重做，模板保存，一键分享到社交平台'
      },
      {
        icon: Mountain,
        title: '5级进化路径',
        description: '从新手村到顶级领主，每级解锁新建筑和特殊功能，见证领地成长历程',
        details: 'Lv.1 新手村 → Lv.2 聚居地 → Lv.3 城镇 → Lv.4 都市 → Lv.5 王城'
      },
      {
        icon: Sparkles,
        title: '守护灵系统',
        description: '召唤神秘守护灵为领地提供buff加成，不同属性守护灵拥有独特技能',
        details: '火系守护灵提升攻击力，水系守护灵增强防御，风系守护灵加速建造'
      }
    ],
    social: [
      {
        icon: Users,
        title: '智能邻居匹配',
        description: '基于游戏偏好、活跃时间、领地风格的智能匹配，找到志同道合的邻居',
        details: '算法考虑游戏类型重合度、在线时间同步率、装饰风格相似度'
      },
      {
        icon: Eye,
        title: '领地互访系统',
        description: '参观好友的游戏空间，点赞评论装饰创意，学习借鉴布置灵感',
        details: '支持实时聊天、截图分享、装饰方案收藏、批量拜访模式'
      },
      {
        icon: Swords,
        title: '协作领地争夺',
        description: '组队参与野兽潮等PVE活动，与邻居协作保卫家园，赢取稀有奖励',
        details: '支持8人队伍，实时语音指挥，战术标记系统，战后复盘分析'
      }
    ],
    content: [
      {
        icon: BookOpen,
        title: '游戏攻略共创',
        description: '建立游戏知识库，玩家贡献攻略心得，AI辅助整理成体系化攻略',
        details: '支持图文、视频、直播回放，智能标签分类，难度星级评定'
      },
      {
        icon: Heart,
        title: '动态广场',
        description: '分享游戏心得、精彩截图、搞笑瞬间，建立游戏文化社区氛围',
        details: '智能推荐算法，热门话题聚合，表情包斗图，好友动态优先'
      },
      {
        icon: Mic,
        title: '语音聊天室',
        description: '支持8人同时在线语音聊天，游戏内外无缝切换沟通场景',
        details: '降噪算法，回声消除，音量均衡，背景音乐混合，录音回放'
      }
    ],
    technical: [
      {
        icon: CodeIcon,
        title: '前端技术栈',
        description: 'React + Next.js，支持SSR和静态生成，保证SEO和首屏性能',
        details: 'TypeScript强类型，模块化架构，组件库统一，代码分割优化'
      },
      {
        icon: Server,
        title: '后端微服务',
        description: 'Node.js + TypeScript，微服务架构，支持高并发和弹性扩容',
        details: 'Docker容器化，Kubernetes编排，服务网格治理，灰度发布'
      },
      {
        icon: Database,
        title: '数据存储方案',
        description: 'PostgreSQL + Redis，关系型数据+缓存层，支持复杂查询和高频访问',
        details: '读写分离，主从复制，分库分表，冷热数据分离，异地容灾'
      },
      {
        icon: Shield,
        title: '安全防护体系',
        description: 'JWT认证 + AES加密 + 防作弊算法，多层防护保障用户数据和游戏公平',
        details: 'DDoS防护，SQL注入防护，XSS过滤，频率限制，行为分析预警'
      }
    ]
  };

  return (
    <>
      <Head>
        <title>产品介绍 - GamDen</title>
        <meta name="description" content="深入了解GamDen的核心功能和技术特色" />
      </Head>

      <main className="pt-20">
        {/* Header */}
        <section className="py-20 bg-space-black-light/30">
          <div className="container-custom text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              产品介绍
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 max-w-3xl mx-auto"
            >
              探索GamDen的核心功能与技术优势，重新定义游戏社交体验
            </motion.p>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="sticky top-0 bg-space-black/80 backdrop-blur-lg z-50 border-b border-gold/20">
          <div className="container-custom">
            <div className="flex justify-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all duration-300 border-b-2 ${activeTab === tab.id ? 'text-gold border-gold' : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'}`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <section className="section-padding">
          <div className="container-custom">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {features[activeTab as keyof typeof features].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="card group"
                  >
                    <div className="flex items-center mb-4">
                      <div className="p-3 rounded-lg bg-gold/10 mr-4">
                        <feature.icon className="w-8 h-8 text-gold" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    </div>
                    <p className="text-gray-300 mb-4">{feature.description}</p>
                    <p className="text-sm text-gray-500 bg-space-black p-3 rounded">{feature.details}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* 技术架构图 */}
        {activeTab === 'technical' && (
          <section className="section-padding bg-space-black-light/30">
            <div className="container-custom">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-12"
              >
                <h2 className="mb-4">技术架构总览</h2>
                <p className="text-xl text-gray-400">现代化技术栈，支撑千万级用户并发</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: 'CDN', desc: '全球内容分发', icon: '🌐' },
                  { name: '负载均衡', desc: '流量分发与故障转移', icon: '⚖️' },
                  { name: '前端集群', desc: 'Next.js SSR/SSG', icon: '⚛️' },
                  { name: 'API网关', desc: '统一接口管理与安全', icon: '🚪' },
                  { name: '用户服务', desc: '身份认证与权限管理', icon: '👤' },
                  { name: '游戏服务', desc: '游戏数据整合与分析', icon: '🎮' },
                  { name: '社交服务', desc: '关系链与消息推送', icon: '💬' },
                  { name: '数据仓库', desc: 'PostgreSQL + Redis', icon: '🗄️' }
                ].map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-space-black p-6 rounded-lg border border-gold/30 text-center"
                  >
                    <div className="text-4xl mb-4">{service.icon}</div>
                    <h4 className="text-lg font-semibold text-gold mb-2">{service.name}</h4>
                    <p className="text-gray-400 text-sm">{service.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default ProductPage;