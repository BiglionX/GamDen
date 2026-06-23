import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody: true 让 NestJS 在所有 POST/PUT/PATCH 请求上保留原始字节到 req.rawBody
  // - OpenIM Webhook 签名校验需要原始字节（HMAC-SHA256 of rawBody）
  // - 启用后 bodyParser 仍然会正常解析 body（req.body 可用）
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigin = config.get<string | string[]>('app.corsOrigin', '*');

  // 安全
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  });

  // 全局路由前缀
  app.setGlobalPrefix(apiPrefix);

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger 文档（仅非生产环境）
  if (config.get<string>('app.env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GamDen Backend API')
      .setDescription('GamDen 游戏巢穴社区业务后台 - V1.0')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port);
  Logger.log(
    `🚀 GamDen backend listening on http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[Bootstrap] Failed to start:', err);
  process.exit(1);
});
