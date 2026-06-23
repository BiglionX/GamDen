<script setup lang="ts">
/**
 * 无人区迷雾背景层
 * - 纯展示组件，pointer-events: none
 * - 提供四角的径向渐变 + 全屏网格线
 * - 边缘微光动画（脉冲）
 */
interface Props {
  /** 视口缩放（用于调整线条密度感） */
  scale?: number;
}

withDefaults(defineProps<Props>(), { scale: 1 });
</script>

<template>
  <view class="map-fog" :style="{ '--fog-scale': scale }">
    <!-- 四角径向迷雾 -->
    <view class="map-fog__corner map-fog__corner--tl" />
    <view class="map-fog__corner map-fog__corner--tr" />
    <view class="map-fog__corner map-fog__corner--bl" />
    <view class="map-fog__corner map-fog__corner--br" />
    <!-- 中心微光 -->
    <view class="map-fog__center-glow" />
    <!-- 网格背景 -->
    <view class="map-fog__grid" />
  </view>
</template>

<style lang="scss" scoped>
.map-fog {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;

  &__corner {
    position: absolute;
    width: 280px;
    height: 280px;
    pointer-events: none;
    &--tl { top: -60px; left: -60px;   background: radial-gradient(circle, #1e241f 0%, transparent 70%); }
    &--tr { top: -60px; right: -60px;  background: radial-gradient(circle, #1e241f 0%, transparent 70%); }
    &--bl { bottom: -60px; left: -60px;  background: radial-gradient(circle, #1e241f 0%, transparent 70%); }
    &--br { bottom: -60px; right: -60px; background: radial-gradient(circle, #1e241f 0%, transparent 70%); }
  }

  &__center-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 240px;
    height: 240px;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(201, 168, 124, 0.18) 0%, transparent 65%);
    animation: t-center-pulse 3.5s ease-in-out infinite;
  }

  &__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(201, 168, 124, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201, 168, 124, 0.06) 1px, transparent 1px);
    background-size: 64px 64px;
    opacity: 0.55;
  }
}

@keyframes t-center-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
}
</style>
