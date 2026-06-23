import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 读取 webhook 请求的原始字节流到 req.rawBody
 *
 * 背景：
 * - NestJS 默认用 bodyParser 解析 JSON 后，原始字节流就被丢弃
 * - 但 OpenIM Webhook 签名是对**原始字节流**计算的（HMAC-SHA256(secret, rawBody)）
 * - 如果在 bodyParser 之后验证签名，原始 body 已经被解析/格式化，无法保证字节一致
 *
 * 解决方案：
 * - 在 bodyParser 之前通过中间件先消费一次 stream，把 Buffer 缓存到 req.rawBody
 * - 然后放行让 bodyParser 正常解析（这样 Controller 还能用 @Body() 拿到对象）
 *
 * 注意：
 * - 此中间件必须在 bodyParser.json() 之前注册
 * - nest 默认 main.ts 中通过 app.use(json({ limit: '...'})) 注册，
 *   如果启用本中间件，需要改成在 NestFactory.create 之后立即 app.use(rawBodyMiddleware)
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RawBodyMiddleware.name);

  use(req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction): void {
    // 仅对 webhook 路径生效（性能考虑，避免所有 POST 都缓存）
    if (!req.path.includes('/webhook/openim')) {
      return next();
    }

    // 仅缓存有 body 的方法（POST/PUT/PATCH）
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const chunks: Buffer[] = [];
    let totalLength = 0;
    const MAX_RAW_BODY_BYTES = 1024 * 1024; // 1 MB 上限，防止恶意大包

    req.on('data', (chunk: Buffer) => {
      totalLength += chunk.length;
      if (totalLength > MAX_RAW_BODY_BYTES) {
        this.logger.warn(
          `Webhook raw body too large (>${MAX_RAW_BODY_BYTES} bytes), dropping`,
        );
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length > 0) {
        req.rawBody = Buffer.concat(chunks);
      }
      // 重要：必须调 next()，否则 bodyParser 不会运行
      next();
    });

    req.on('error', (err) => {
      this.logger.error(`Raw body read error: ${err.message}`);
      next(err);
    });
  }
}