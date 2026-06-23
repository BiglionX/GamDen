<script setup lang="ts">
/**
 * 游客软引导气泡（30 秒定时触发，15 秒后自动淡出）
 *
 * 触发链路：
 * - App.vue onLaunch → 30 秒后 scheduleGuestGuide → agentStore.showGuestGuide()
 * - 此组件订阅 guestGuideVisible，显示气泡
 * - 点击气泡或主按钮：展开为完整引导弹窗（GuestGuideModal）
 *   - 不直接跳注册，让用户先看到完整引导
 *
 * 频次：
 * - 气泡仅展示一次（GUEST_GUIDE_BUBBLE_KEY 持久化）
 * - 气泡点击触发的弹窗由 agent store 的 30 分钟 2 次限流控制
 */
import { storeToRefs } from 'pinia';
import { useAgentStore } from '@/stores/agent';

const agentStore = useAgentStore();
const { guestGuideVisible } = storeToRefs(agentStore);

/** 点击气泡：展开为完整引导弹窗（不直接跳注册） */
function handleExpand() {
  agentStore.hideGuestGuide();
  agentStore.showGuideModal('default');
}

/** 关闭气泡（不跳注册、不弹弹窗） */
function handleDismiss() {
  agentStore.hideGuestGuide();
}
</script>

<template>
  <view v-if="guestGuideVisible" class="agent-guide-bubble" @tap="handleExpand">
    <view class="agent-guide-bubble__inner">
      <view class="agent-guide-bubble__icon">
        <text>✨</text>
      </view>
      <view class="agent-guide-bubble__content">
        <text class="agent-guide-bubble__title">守护灵低语</text>
        <text class="agent-guide-bubble__text">
          巢穴之门已为你打开，私聊与升级需先入驻
        </text>
      </view>
      <view class="agent-guide-bubble__hint">
        <text>点击展开 →</text>
      </view>
      <view class="agent-guide-bubble__actions">
        <view
          class="agent-guide-bubble__btn agent-guide-bubble__btn--ghost"
          hover-class="agent-guide-bubble__btn--hover"
          :hover-stay-time="50"
          @tap.stop="handleDismiss"
        >
          <text>稍后</text>
        </view>
        <view
          class="agent-guide-bubble__btn agent-guide-bubble__btn--primary"
          hover-class="agent-guide-bubble__btn--hover"
          :hover-stay-time="50"
          @tap.stop="handleExpand"
        >
          <text>查看详情</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.agent-guide-bubble {
  position: fixed;
  bottom: 200rpx;
  left: 32rpx;
  right: 32rpx;
  z-index: 8000;
  animation: agent-guide-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  &__inner {
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 2rpx solid #c9a87c;
    border-radius: 24rpx;
    padding: 32rpx;
    box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(20rpx);
  }

  &__icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20rpx;
    box-shadow: 0 0 24rpx rgba(201, 168, 124, 0.4);
    animation: agent-guide-pulse 2s ease-in-out infinite;

    text {
      font-size: 44rpx;
      line-height: 1;
      color: #1e241f;
    }
  }

  &__content {
    text-align: center;
    margin-bottom: 16rpx;
  }
  &__title {
    display: block;
    font-size: 26rpx;
    color: #c9a87c;
    font-weight: 600;
    margin-bottom: 12rpx;
    letter-spacing: 4rpx;
  }
  &__text {
    display: block;
    font-size: 30rpx;
    color: #f5f0e6;
    line-height: 1.6;
    font-weight: 500;
  }

  &__hint {
    text-align: center;
    margin-bottom: 20rpx;

    text {
      font-size: 22rpx;
      color: #a89e85;
      letter-spacing: 2rpx;
    }
  }

  &__actions {
    display: flex;
    gap: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 72rpx;
    border-radius: 36rpx;
    font-size: 26rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    text {
      color: inherit;
    }

    &--primary {
      background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
      color: #1e241f;
      box-shadow: 0 2rpx 8rpx rgba(201, 168, 124, 0.35);
    }
    &--ghost {
      background: transparent;
      color: #a89e85;
      border: 1rpx solid rgba(201, 168, 124, 0.3);
    }
    &--hover {
      transform: scale(0.96);
    }
  }
}

@keyframes agent-guide-enter {
  from {
    transform: translateY(120rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes agent-guide-pulse {
  0%, 100% {
    box-shadow: 0 0 24rpx rgba(201, 168, 124, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 40rpx rgba(201, 168, 124, 0.7);
    transform: scale(1.08);
  }
}
</style>