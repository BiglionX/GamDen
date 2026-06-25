<script setup lang="ts">
/**
 * StatusBadge —— 状态徽章
 * - 5 种色系：gray / yellow / blue / purple / green
 * - 接受 status（MiniProgramStatus）或 display（StatusDisplay）配置
 * - 复用度高，App.vue / 弹窗 / 列表均可使用
 */
import { computed } from 'vue';
import type { MiniProgramStatus } from '@/types/mini-program';
import { STATUS_DISPLAY } from '@/types/mini-program';

const props = withDefaults(
  defineProps<{
    /** 当前状态（自动从 STATUS_DISPLAY 取配置） */
    status?: MiniProgramStatus;
    /** 自定义 label（优先于 status.label） */
    label?: string;
    /** 自定义图标 emoji（可选） */
    icon?: string;
    /** 尺寸 */
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  },
);

const display = computed(() =>
  props.status ? STATUS_DISPLAY[props.status] : null,
);

const finalLabel = computed(() => props.label || display.value?.label || '');
const finalIcon = computed(() => props.icon || defaultIcon(props.status));

function defaultIcon(s?: MiniProgramStatus): string {
  switch (s) {
    case 'not_started':
      return '⏳';
    case 'certifying':
      return '🔄';
    case 'certified':
      return '✅';
    case 'deploying':
      return '🚀';
    case 'reviewing':
      return '🔍';
    case 'online':
      return '🎉';
    default:
      return '•';
  }
}
</script>

<template>
  <view
    class="status-badge"
    :class="[
      `status-badge--${display?.color ?? 'gray'}`,
      `status-badge--${size}`,
    ]"
  >
    <text v-if="finalIcon" class="status-badge__icon">
      {{ finalIcon }}
    </text>
    <text class="status-badge__label">
      {{ finalLabel }}
    </text>
  </view>
</template>

<style lang="scss" scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 1rpx;
  white-space: nowrap;
  line-height: 1;
  border: 1rpx solid transparent;
  transition: all 0.2s ease;

  &__icon {
    font-size: 22rpx;
    line-height: 1;
  }
  &__label {
    font-size: 24rpx;
    line-height: 1.2;
  }

  // ===== 尺寸 =====
  &--sm {
    padding: 4rpx 12rpx;
    &__icon { font-size: 18rpx; }
    &__label { font-size: 20rpx; }
  }
  &--md {
    padding: 6rpx 16rpx;
  }
  &--lg {
    padding: 10rpx 24rpx;
    border-radius: 999px;
    &__icon { font-size: 28rpx; }
    &__label { font-size: 28rpx; }
  }

  // ===== 色系 =====
  &--gray {
    background: rgba(168, 158, 133, 0.15);
    color: #a89e85;
    border-color: rgba(168, 158, 133, 0.3);
  }
  &--yellow {
    background: rgba(241, 196, 15, 0.18);
    color: #d4a017;
    border-color: rgba(241, 196, 15, 0.4);
  }
  &--blue {
    background: rgba(52, 152, 219, 0.18);
    color: #3498db;
    border-color: rgba(52, 152, 219, 0.4);
  }
  &--purple {
    background: rgba(155, 89, 182, 0.18);
    color: #9b59b6;
    border-color: rgba(155, 89, 182, 0.4);
  }
  &--green {
    background: rgba(90, 143, 108, 0.22);
    color: #5a8f6c;
    border-color: rgba(90, 143, 108, 0.5);
  }
}
</style>
