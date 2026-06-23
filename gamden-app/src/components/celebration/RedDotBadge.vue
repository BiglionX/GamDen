<script setup lang="ts">
/**
 * RedDotBadge —— 复用红点徽标
 *
 * 用法：
 *   <view class="tab-icon-wrap">
 *     <text>个人中心</text>
 *     <RedDotBadge :show="showRedDot" :offset-x="20" :offset-y="6" />
 *   </view>
 *
 * 特性：
 *  - 默认右上角定位（relative 父元素 + absolute 自身）
 *  - 支持数字（≥1 时显示数字）
 *  - 最大 99 截断
 *  - 入场：缩放弹跳
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 是否显示 */
    show: boolean;
    /** 数字（可选，未传则只显示红点） */
    count?: number;
    /** 距父元素右边缘偏移（rpx） */
    offsetX?: number;
    /** 距父元素顶部偏移（rpx） */
    offsetY?: number;
  }>(),
  {
    count: 0,
    offsetX: 0,
    offsetY: 0,
  },
);

const displayCount = computed(() => {
  if (!props.count || props.count <= 0) return '';
  if (props.count > 99) return '99+';
  return String(props.count);
});

const style = computed(() => ({
  right: `${props.offsetX}rpx`,
  top: `${props.offsetY}rpx`,
}));
</script>

<template>
  <view v-if="show" class="red-dot" :style="style">
    <text v-if="displayCount" class="red-dot__count">{{ displayCount }}</text>
  </view>
</template>

<style lang="scss" scoped>
.red-dot {
  position: absolute;
  min-width: 16rpx;
  height: 16rpx;
  border-radius: 8rpx;
  background: #e74c3c;
  border: 2rpx solid #1e241f;
  box-shadow: 0 0 8rpx rgba(231, 76, 60, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  animation: red-dot-pulse 1.6s ease-in-out infinite;

  &__count {
    font-size: 18rpx;
    color: #fff;
    font-weight: 700;
    line-height: 1;
  }
}

@keyframes red-dot-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.85;
  }
}
</style>
