<script setup lang="ts">
import { computed } from 'vue';
import { GUARDIAN_VISUALS, type GuardianType } from '@/types/agent';

const props = withDefaults(defineProps<{
  type?: GuardianType;
  size?: 'sm' | 'md' | 'lg';
}>(), {
  type: 'mechanical',
  size: 'md',
});

const visual = computed(() => GUARDIAN_VISUALS[props.type]);

const sizeMap = {
  sm: { wrapper: '80rpx', icon: '48rpx' },
  md: { wrapper: '112rpx', icon: '64rpx' },
  lg: { wrapper: '160rpx', icon: '96rpx' },
};
</script>

<template>
  <view
    class="agent-avatar"
    :class="`agent-avatar--${size}`"
    :style="{
      width: sizeMap[size].wrapper,
      height: sizeMap[size].wrapper,
      borderColor: visual?.color,
      background: visual?.bgColor,
    }"
  >
    <text class="agent-avatar__icon" :style="{ fontSize: sizeMap[size].icon }">
      {{ visual?.icon }}
    </text>
    <view
      class="agent-avatar__glow"
      :style="{ background: visual?.color }"
    />
  </view>
</template>

<style lang="scss" scoped>
.agent-avatar {
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
  border-width: 4rpx;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.3);
  overflow: hidden;

  &__icon {
    line-height: 1;
    z-index: 1;
  }

  &__glow {
    position: absolute;
    inset: -20rpx;
    border-radius: 50%;
    opacity: 0.15;
    z-index: 0;
    animation: agent-pulse 2.4s ease-in-out infinite;
  }
}

@keyframes agent-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.15;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.05;
  }
}
</style>
