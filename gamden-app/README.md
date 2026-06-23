# GamDen App - UniApp 移动端

基于 **UniApp + Vue 3 + TypeScript + Vite** 的 GamDen 游戏巢穴社区移动客户端。
一套代码，可同时编译输出 iOS App / Android App / 微信小程序 / H5。

> 完整产品/技术方案见 [`docs/GamDen App V1.0 技术架构与产品需求说明书.md`](../docs/GamDen%20App%20V1.0%20技术架构与产品需求说明书.md)

---

## 快速开始

### 环境要求
- Node.js ≥ 18
- HBuilderX ≥ 4.34（推荐，可视化编译/调试）
- 或直接使用 CLI：`@dcloudio/uvm` 管理 UniApp 工具链

### 安装依赖
```bash
cd gamden-app
npm install
```

### 开发
```bash
npm run dev:h5            # H5 调试（默认 http://localhost:9000）
npm run dev:mp-weixin     # 微信小程序编译，产物在 dist/dev/mp-weixin
npm run dev:app           # App 真机调试（需 HBuilderX 配合）
```

### 构建
```bash
npm run build:h5
npm run build:mp-weixin
```

### 类型检查
```bash
npm run type-check
```

---

## 目录结构

```
gamden-app/
├── src/
│   ├── pages/                  # 页面（pages.json 引用）
│   │   ├── map/index.vue        # 领地地图（首页）
│   │   ├── club/                # 俱乐部列表 + 详情
│   │   ├── market/index.vue     # 集市（虚拟道具）
│   │   ├── profile/index.vue    # 个人中心
│   │   └── auth/login.vue       # 入驻巢穴（邀请码 + 守护灵选择）
│   ├── components/             # 业务组件（待扩展）
│   ├── stores/
│   │   └── user.ts              # Pinia 全局状态 - 用户/游客/登录
│   ├── utils/
│   │   ├── request.ts           # 统一请求封装（uni.request）
│   │   └── storage.ts           # 本地存储（含 gamden_ 前缀）
│   ├── types/
│   │   ├── api.ts               # 通用响应结构
│   │   ├── user.ts              # User / GuardianType
│   │   └── territory.ts         # 领地 / 邻居 / 地图视口
│   ├── static/                 # 静态资源
│   ├── App.vue                  # 应用入口（生命周期 + 全局样式）
│   ├── main.ts                  # createApp + Pinia
│   ├── manifest.json            # 应用配置（AppID/权限/SDK）
│   ├── pages.json               # 页面路由 + tabBar + easycom
│   └── uni.scss                 # uview-plus 主题变量
├── vite.config.ts              # Vite 配置（含 @ 别名）
├── tsconfig.json
├── package.json
└── index.html
```

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 跨端框架 | UniApp（Vue 3 + Vite） |
| 渲染 | UniApp 原生渲染（非 WebView） |
| 编程语言 | TypeScript |
| 状态管理 | Pinia |
| UI 组件库 | [uview-plus](https://uiadmin.net/uview-plus/) 3.x |
| 即时通讯 | OpenIM（待接入：`openim-uniapp-polyfill`） |
| 网络请求 | 基于 `uni.request` 统一封装 |

---

## 主题与设计规范

颜色对齐 [PRD 第 5.1 节](../docs/GamDen%20App%20V1.0%20技术架构与产品需求说明书.md)：

| 名称 | 色值 | 用途 |
|------|------|------|
| 巢穴墨 | `#1E241F` | 主背景 |
| 领地金 | `#C9A87C` | 品牌色/主按钮 |
| 宣纸白 | `#F5F0E6` | 主文字 |
| 烽火红 | `#C0392B` | 警告/未读 |
| 生机绿 | `#5A8F6C` | 成功/升级 |

uview-plus 的主题变量在 `src/uni.scss` 中声明。

---

## 待办与扩展点

- [ ] 接入真实后端 API（替换 `utils/request.ts` 中的 `BASE_URL` 与 `userStore.login` 的 mock 实现）
- [ ] 集成 OpenIM（`openim-uniapp-polyfill` + `@openim/client-sdk`）
- [ ] 地图交互升级：拖拽、迷雾渐变、邻居气泡动画
- [ ] 守护灵话术模板（V1.0 固定话术 + 条件触发）
- [ ] 邀请码生成 + 个人小程序码
- [ ] 真实图片素材替换占位 emoji

---

## 注意事项

1. **微信小程序 AppID**：当前在 `manifest.json` 中留空，上线前需替换为真实 AppID。
2. **后端 API**：H5 端默认走 `/api`（由 `vite.config.ts` proxy 到 `http://localhost:3000`），小程序/App 端走 `https://api.gamden.matux.tech/api`。
3. **TabBar 图标**：当前 pages.json 的 tabBar 未配置图标，正式上线前需补充 4 组 PNG 到 `static/tabbar/`。
4. **uview-plus SCSS**：主题变量必须在 `uni.scss` 中用 `@import 'uview-plus/theme.scss';` 注入后再被页面引用。

---

## License

MIT
