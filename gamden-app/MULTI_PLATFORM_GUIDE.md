# GamDen UniApp 多端编译配置指南

## HBuilderX 配置

### 1. HBuilderX 安装路径
```
F:\HBuilderX\
```

### 2. 方式一：使用 HBuilderX 图形界面（推荐新手）

1. 打开 HBuilderX：双击 `F:\HBuilderX\HBuilderX.exe`
2. 导入项目：`文件` → `导入` → `从本地目录导入` → 选择 `d:\GamDen\gamden-app`
3. 运行项目：
   - **H5**: `运行` → `运行到浏览器` → `Chrome`
   - **微信小程序**: `运行` → `运行到小程序模拟器` → `微信开发者工具`
   - **Android**: `运行` → `运行到手机或模拟器` → `运行到 Android App 基座`

### 3. 方式二：使用命令行编译

#### 使用构建脚本（推荐）
```powershell
# 双击运行或命令行执行
d:\GamDen\gamden-app\build.bat
```

#### 使用 npm 命令
```powershell
cd d:\GamDen\gamden-app

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# Android App 开发
npm run dev:app-android
```

#### 使用 HBuilderX CLI 直接编译
```powershell
# 设置 CLI 路径
$env:HX_CLI = "F:\HBuilderX\cli.exe"

# 查看设备列表
& "F:\HBuilderX\cli.exe" devices list --platform android

# 运行到 Android
& "F:\HBuilderX\cli.exe" launch app-android --project "d:\GamDen\gamden-app"

# 打开 HBuilderX
& "F:\HBuilderX\cli.exe" open --project "d:\GamDen\gamden-app"
```

---

## 平台特定配置

### 微信小程序配置

1. **获取 AppID**:
   - 访问 [微信公众平台](https://mp.weixin.qq.com)
   - 登录后进入 `开发` → `开发管理` → `开发设置`
   - 复制 AppID

2. **配置 AppID**:
   ```env
   # .env.development 或 .env.production
   VITE_WX_APPID=你的AppID
   ```

3. **manifest.json 配置**:
   ```json
   {
     "mp-weixin": {
       "appid": "你的AppID"
     }
   }
   ```

4. **微信开发者工具**:
   - 下载：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 编译后用微信开发者工具打开 `dist/dev/mp-weixin` 或 `dist/build/mp-weixin`

### Android App 配置

1. **生成签名证书**:
   ```powershell
   keytool -genkey -v -keystore gamden-release.keystore -alias gamden -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **在 HBuilderX 中配置证书**:
   - 打开 HBuilderX
   - `manifest.json` → `App常用其它设置` → `Android设置`
   - 配置证书路径、别名、密码

3. **云端打包** (无需本地环境):
   - HBuilderX → `发行` → `原生App-云打包`
   - 选择 Android 平台
   - 使用自有证书或测试证书

4. **本地打包** (需要 Android Studio):
   - 安装 Android Studio 和 SDK
   - HBuilderX → `发行` → `原生App-本地打包`

### iOS App 配置

1. **需要 Mac 电脑和 Apple 开发者账号**
2. **在 HBuilderX 中配置**:
   - `manifest.json` → `App常用其它设置` → `iOS设置`
   - 配置 Bundle ID、证书等

---

## 条件编译使用

### Vue 模板中使用
```vue
<template>
  <!-- H5 专属 -->
  <!-- #ifdef H5 -->
  <view class="h5-only">H5 专属内容</view>
  <!-- #endif -->

  <!-- 微信小程序专属 -->
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="share">转发给好友</button>
  <!-- #endif -->

  <!-- App 专属 -->
  <!-- #ifdef APP-PLUS -->
  <view class="app-only">App 专属内容</view>
  <!-- #endif -->
</template>
```

### TypeScript/JavaScript 中使用
```ts
import { isH5, isMpWeixin, isApp } from '@/utils/platform';

if (isH5) {
  // H5 逻辑
  console.log('当前是 H5 平台');
}

if (isMpWeixin) {
  // 微信小程序逻辑
  console.log('当前是微信小程序');
}

if (isApp) {
  // App 逻辑
  console.log('当前是 App');
}
```

### 样式中使用
```scss
/* H5 专属样式 */
/* #ifdef H5 */
.h5-container {
  max-width: 750px;
  margin: 0 auto;
}
/* #endif */

/* 小程序安全区适配 */
/* #ifdef MP-WEIXIN */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
/* #endif */
```

---

## 常见问题

### 1. HBuilderX CLI 找不到设备
- 确保手机已开启 USB 调试
- 安装手机驱动程序
- 尝试重新插拔 USB 线

### 2. 微信小程序编译失败
- 检查 AppID 是否正确配置
- 确保微信开发者工具已安装并开启服务端口

### 3. 包体积超过 2MB
- 使用分包加载（subPackages）
- 压缩图片资源
- 移除未使用的代码

### 4. H5 跨域问题
- 开发环境已配置代理，使用 `/api` 前缀
- 生产环境需要 Nginx 配置 CORS
