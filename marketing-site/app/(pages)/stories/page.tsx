"use client"
import { motion } from 'framer-motion';
import { Users, Castle, Star } from 'lucide-react';

const StoriesPage = () => {
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
              用户故事
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 max-w-3xl mx-auto"
            >
              真实玩家的巢穴建设历程，听听他们与GamDen的故事
            </motion.p>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="section-padding">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="card max-w-2xl mx-auto"
            >
              <Star className="w-16 h-16 text-gold mx-auto mb-6" />
              <h2 className="text-3xl mb-4">精彩内容即将呈现</h2>
              <p className="text-gray-400 text-lg">
                我们正在收集最精彩的玩家故事，包括领地截图、建设心得、
                邀请好友的趣事等。敬请期待这些真实而有趣的游戏社交体验分享！
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default StoriesPage;