import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to GamDen
        </h1>
        <p className="text-center text-lg mb-12">
          游戏巢穴社区 - 一个独立于算法的游戏社交平台
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🏠 领地系统</h2>
            <p className="text-gray-600">
              注册获得专属领地，邀请好友扩张版图
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🤖 AI守护灵</h2>
            <p className="text-gray-600">
              选择你的守护灵，获得个性化引导
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">👥 社交圈</h2>
            <p className="text-gray-600">
              加入俱乐部，与志同道合的玩家交流
            </p>
          </Card>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Link href="/auth/login">
            <Button variant="primary" size="lg">
              登录
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="outline" size="lg">
              注册
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
