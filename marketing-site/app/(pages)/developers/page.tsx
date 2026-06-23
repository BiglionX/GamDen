'use client'
import { motion } from 'framer-motion';
import { Code, BookOpen, Users, Gamepad2, Shield, Zap } from 'lucide-react';

const DevelopersPage = () => {
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
              开发者中心
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 max-w-3xl mx-auto"
            >
              开放的API与SDK，与GamDen共建游戏社交生态
            </motion.p>
          </div>
        </section>

        {/* API开放平台 */}
        <section className="section-padding">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="mb-4">API开放平台</h2>
              <p className="text-xl text-gray-400">完整的数据接口，助力开发者创新</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Code,
                  title: 'RESTful API',
                  description: '用户数据、领地信息、社交关系的完整读写接口',
                  features: ['OAuth 2.0认证', 'JSON格式响应', '分页查询支持', '实时数据同步']
                },
                {
                  icon: Zap,
                  title: 'WebSocket',
                  description: '实时聊天、动态推送、游戏状态同步',
                  features: ['双向通信', '房间管理', '消息广播', '断线重连']
                },
                {
                  icon: Gamepad2,
                  title: '游戏SDK',
                  description: 'Unity、Unreal Engine、Cocos Creator集成',
                  features: ['一键集成', '数据统计', '成就系统', '社交功能']
                }
              ].map((api, index) => (
                <motion.div
                  key={api.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="card"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-3 rounded-lg bg-gold/10 mr-4">
                      <api.icon className="w-8 h-8 text-gold" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{api.title}</h3>
                  </div>
                  <p className="text-gray-300 mb-6">{api.description}</p>
                  <ul className="space-y-2">
                    {api.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm text-gray-400">
                        <Shield className="w-4 h-4 text-pixel-green mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 开发文档入口 */}
        <section className="section-padding bg-gradient-to-r from-gold/5 to-pixel-green/5">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <BookOpen className="w-16 h-16 text-gold mx-auto mb-6" />
              <h2 className="text-3xl mb-4">开发文档</h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                详细的API文档、SDK使用指南、代码示例和最佳实践
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary">
                  查看API文档
                </button>
                <button className="btn-secondary">
                  下载SDK
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default DevelopersPage;