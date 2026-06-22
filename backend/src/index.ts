import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// 加载环境变量
dotenv.config();

const app: Express = express();
const PORT = process.env.SERVER_PORT || 3000;

// 中间件
app.use(helmet()); // 安全头
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'GamDen API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// 注册API路由
import authRoutes from './routes/authRoutes';
import territoryRoutes from './routes/territoryRoutes';
import inviteRoutes from './routes/inviteRoutes';
import clubRoutes from './routes/clubRoutes';
import shopRoutes from './routes/shopRoutes';
import agentRoutes from './routes/agentRoutes';
import webhookRoutes from './routes/webhookRoutes';

app.use('/api/auth', authRoutes);
app.use('/api', territoryRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/agent', agentRoutes);
app.use('/webhook', webhookRoutes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    path: req.path
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`GamDen后端服务启动成功`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
  console.log(`🚀 GamDen后端服务运行在 http://localhost:${PORT}`);
});

// 优雅退出
process.on('SIGTERM', () => {
  logger.info('SIGTERM信号接收，准备关闭服务器');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT信号接收，准备关闭服务器');
  process.exit(0);
});
