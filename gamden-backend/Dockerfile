# ============================================
# GamDen Backend - NestJS Dockerfile
# 多阶段构建：builder -> prod-deps -> runtime
# ============================================

# ---------- 阶段 1: 依赖安装 + TypeScript 构建 ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# 安装构建依赖（pg 等 native 模块需要）
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 单独复制 package 文件以利用 Docker 缓存
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.build.json ./
COPY nest-cli.json ./

# 安装全部依赖（含 devDependencies 以支持 nest build）
RUN npm ci

# 复制源码
COPY src ./src

# 构建 TypeScript -> dist/
RUN npm run build

# ---------- 阶段 2: 仅生产依赖 ----------
FROM node:20-bookworm-slim AS prod-deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 阶段 3: 运行时镜像 ----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=api/v1

# 运行时仍需要 python3（pg native module）
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

# 从 prod-deps 复制 node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist
# 复制 package.json（用于版本/启动信息）
COPY package.json ./

EXPOSE 3000

# 健康检查（使用 /api/v1/docs 是否可访问作为存活信号）
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/docs',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

# 启动 NestJS
CMD ["node", "dist/main.js"]
