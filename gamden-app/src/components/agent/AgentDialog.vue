<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAgentStore } from '@/stores/agent';
import { GUARDIAN_VISUALS } from '@/types/agent';

const agentStore = useAgentStore();
const { current } = storeToRefs(agentStore);

const visual = computed(() => {
  if (!current.value) return null;
  return GUARDIAN_VISUALS[current.value.guardian];
});

const sceneLabel = computed(() => {
  if (!current.value) return '';
  const map: Record<string, string> = {
    welcome: '问候',
    upgrade: '升级',
    invite: '盟友',
    guestGuide: '引导',
    territory: '消息',
  };
  return map[current.value.scene] ?? '';
});

function handleDismiss() {
  agentStore.dismiss();
}
</script>

<template>
  <view v-if="current && visual" class="agent-dialog" @tap="handleDismiss">
    <!-- 守护灵头像 -->
    <view
      class="agent-dialog__avatar"
      :style="{ borderColor: visual.color, background: visual.bgColor }"
    >
      <text class="agent-dialog__avatar-icon">{{ visual.icon }}</text>
      <view class="agent-dialog__avatar-glow" :style="{ background: visual.color }" />
    </view>

    <!-- 对话气泡 -->
    <view class="agent-dialog__bubble">
      <view class="agent-dialog__bubble-arrow" />
      <view class="agent-dialog__header">
        <text class="agent-dialog__name">{{ visual.name }}</text>
        <text class="agent-dialog__scene-tag">{{ sceneLabel }}</text>
      </view>
      <text class="agent-dialog__text">{{ current.text }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.agent-dialog {
  position: fixed;
  top: 280rpx;
  left: 32rpx;
  right: 32rpx;
  z-index: 9000;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  animation: agent-dialog-enter 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;

  &__avatar {
    position: relative;
    width: 112rpx;
    height: 112rpx;
    flex-shrink: 0;
    border-radius: 50%;
    border-width: 4rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }
  &__avatar-icon {
    font-size: 64rpx;
    line-height: 1;
    z-index: 1;
  }
  &__avatar-glow {
    position: absolute;
    inset: -20rpx;
    border-radius: 50%;
    opacity: 0.15;
    z-index: 0;
    animation: agent-pulse 2.4s ease-in-out infinite;
  }

  &__bubble {
    flex: 1;
    min-width: 0;
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 2rpx solid #c9a87c;
    border-radius: 20rpx;
    padding: 24rpx 28rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.45);
    position: relative;
  }
  &__bubble-arrow {
    position: absolute;
    left: -16rpx;
    top: 40rpx;
    width: 0;
    height: 0;
    border-top: 16rpx solid transparent;
    border-bottom: 16rpx solid transparent;
    border-right: 16rpx solid #c9a87c;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 12rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);
  }
  &__name {
    font-size: 28rpx;
    color: #c9a87c;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
  &__scene-tag {
    font-size: 20rpx;
    color: #a89e85;
    padding: 2rpx 12rpx;
    background: rgba(201, 168, 124, 0.12);
    border-radius: 8rpx;
  }

  &__text {
    font-size: 30rpx;
    color: #f5f0e6;
    line-height: 1.6;
    font-weight: 500;
  }
}

@keyframes agent-dialog-enter {
  from {
    transform: translateY(-40rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
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
