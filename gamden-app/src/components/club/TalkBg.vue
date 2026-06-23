<script setup lang="ts">
/**
 * TalkBg - GamDen 巢穴暗纹聊天背景
 * ----------------------------------------------------------------------
 * 用于 OpenIM 聊天页背景，替代默认 talk_bg.jpeg
 *
 * 实现方式：
 *   - 优先使用 SVG 背景（静态资源）
 *   - 回退到 CSS 渐变（本组件实现）
 *
 * 颜色体系（与 wxo_bubble_customize.json 同步）：
 *   - 巢穴墨基底：#1E241F
 *   - 金色点缀：rgba(201, 168, 124, 0.04)
 *   - 对角线纹理：45° / -45° 细线
 *
 * 用法：
 *   <TalkBg />
 *   <TalkBg mode="simple" />  // 低端设备性能优化
 */
interface Props {
  /** 背景模式：full（完整） / simple（简化，用于低端设备） */
  mode?: 'full' | 'simple';
}

withDefaults(defineProps<Props>(), {
  mode: 'full',
});
</script>

<template>
  <view class="talk-bg" :class="`talk-bg--${mode}`">
    <!-- SVG 背景（优先） -->
    <image
      class="talk-bg__svg"
      src="/static/themes/talk_bg.svg"
      mode="aspectFill"
    />

    <!-- CSS 渐变兜底层（SVG 加载失败时显示） -->
    <view class="talk-bg__fallback" :class="`talk-bg__fallback--${mode}`" />
  </view>
</template>

<style lang="scss" scoped>
.talk-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;

  &__svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 1;
    transition: opacity 0.3s ease;
  }

  &__fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;

    /* 当 SVG 加载失败时，fallback 层可见 */
    .talk-bg__svg:not([src]) + &,
    .talk-bg__svg[src=""] + & {
      opacity: 1;
    }
  }

  /* 完整模式（多层渐变） */
  &__fallback--full {
    background:
      /* 对角线纹理 */
      repeating-linear-gradient(
        45deg,
        rgba(201, 168, 124, 0.015) 0,
        rgba(201, 168, 124, 0.015) 1rpx,
        transparent 1rpx,
        transparent 96rpx
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(201, 168, 124, 0.01) 0,
        rgba(201, 168, 124, 0.01) 1rpx,
        transparent 1rpx,
        transparent 96rpx
      ),
      /* 巢穴点阵（多层） */
      radial-gradient(
        circle at 25% 25%,
        rgba(201, 168, 124, 0.04) 1rpx,
        transparent 1rpx
      ),
      radial-gradient(
        circle at 75% 75%,
        rgba(201, 168, 124, 0.03) 1rpx,
        transparent 1rpx
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(201, 168, 124, 0.02) 2rpx,
        transparent 2rpx
      ),
      /* 纸张纹理 */
      repeating-linear-gradient(
        0deg,
        rgba(245, 240, 230, 0.008) 0,
        rgba(245, 240, 230, 0.008) 1rpx,
        transparent 1rpx,
        transparent 4rpx
      ),
      repeating-linear-gradient(
        90deg,
        rgba(245, 240, 230, 0.005) 0,
        rgba(245, 240, 230, 0.005) 1rpx,
        transparent 1rpx,
        transparent 4rpx
      ),
      /* 基础渐变 */
      linear-gradient(
        180deg,
        #1E241F 0%,
        #1a1f1b 50%,
        #161a15 100%
      );
    background-size: 96rpx 96rpx, 96rpx 96rpx, 48rpx 48rpx, 48rpx 48rpx, 96rpx 96rpx, 4rpx 4rpx, 4rpx 4rpx, 100% 100%;
  }

  /* 简化模式（性能优化） */
  &__fallback--simple {
    background:
      radial-gradient(
        circle at 25% 25%,
        rgba(201, 168, 124, 0.04) 1rpx,
        transparent 1rpx
      ),
      radial-gradient(
        circle at 75% 75%,
        rgba(201, 168, 124, 0.03) 1rpx,
        transparent 1rpx
      ),
      linear-gradient(
        180deg,
        #1E241F 0%,
        #161a15 100%
      );
    background-size: 48rpx 48rpx, 48rpx 48rpx, 100% 100%;
  }
}
</style>
