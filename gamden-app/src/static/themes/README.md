# GamDen OpenIM 皮肤资源目录

本目录包含 OpenIM 聊天 UI 的 GamDen 定制皮肤资源。

## 文件清单

| 文件 | 用途 | 平台兼容性 |
|------|------|------------|
| `talk_bg.svg` | 聊天背景（SVG 矢量） | H5 / Web / 小程序 |
| `talk_bg.css` | 聊天背景（CSS 渐变兜底） | 全平台 |

## 配置文件

主配置文件位于 `src/static/` 目录：

- `wxo_bubble_customize.json` - UniApp / Web / 小程序 皮肤配置
- `wxo_bubble_customize.plist` - iOS Native 皮肤配置

## 颜色系统

| 名称 | 色值 | 用途 |
|------|------|------|
| 巢穴墨 | `#1E241F` | 主背景 / 导航栏 |
| 领地金 | `#C9A87C` | 品牌色 / 主按钮 / 右气泡 |
| 宣纸白 | `#F5F0E6` | 主文字 / 标题 |
| 烽火红 | `#C0392B` | 警告 / 未读红点 |
| 生机绿 | `#5A8F6C` | 成功 / 在线状态 |

## 使用方式

### H5 / Web

```scss
// 在 SCSS 中引入背景
@import '@/static/themes/talk_bg.css';

.chat-container {
  background: var(--gamden-talk-bg);
  background-size: var(--gamden-talk-bg-size);
}
```

### 小程序

```vue
<template>
  <view class="chat-bg gamden-talk-bg">
    <!-- 聊天内容 -->
  </view>
</template>

<style>
@import '@/static/themes/talk_bg.css';
</style>
```

### SVG 直接引用

```css
.chat-bg {
  background-image: url('/static/themes/talk_bg.svg');
  background-size: cover;
  background-position: center;
}
```

## 设计说明

### 巢穴暗纹背景

设计灵感来自 GamDen 的"巢穴"概念，通过多层径向点阵和对角线纹理营造洞穴氛围：

1. **基础渐变**：从 `#1E241F`（巢穴墨）到 `#161a15`（深墨）
2. **巢穴点阵**：多层径向圆点（模拟洞穴壁纹理）
3. **金色点缀**：领地金低透明度点缀（增加质感）
4. **对角线纹理**：45° 和 -45° 方向的细微线条

### 气泡边框

古风边框使用 `repeating-linear-gradient` 实现织锦纹理：

```css
border: 6rpx solid;
border-image: repeating-linear-gradient(
  45deg,
  rgba(201, 168, 124, 0.18) 0 2rpx,
  transparent 2rpx 6rpx
);
```

## 更新日志

- **v2 (2026-06-23)**: 用户明确颜色配置（导航栏/输入框/气泡）
- **v1**: 初始版本，基础古风皮肤
