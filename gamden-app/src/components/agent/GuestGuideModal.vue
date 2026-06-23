<script setup lang="ts">
/**
 * 游客引导弹窗（全屏蒙层版）
 *
 * 触发场景：
 * - 用户在游客态点击受限操作（点赞/回复/兑换/打招呼/发帖/私聊）
 * - 经 useGuestRestriction() 或 v-guest-restricted 拦截后唤起
 *
 * 设计：
 * - 全屏半透明黑色蒙层（z-index 9500）
 * - 居中卡片：守护灵头像 + 对话气泡 + 文案 + 主次按钮
 * - 主按钮"领取我的领地"→ 跳转 /pages/auth/login
 * - 次按钮"再看看"→ 关闭弹窗
 * - 点击蒙层（卡片外）也视为关闭
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { GUARDIAN_VISUALS, GUEST_GUIDE_SCENE_LABEL } from '@/types/agent';

const agentStore = useAgentStore();
const userStore = useUserStore();
const { guideModalVisible, guideModalScene, guideModalLine } =
  storeToRefs(agentStore);

const visual = computed(() => {
  // 游客态默认走机械师视觉（已注册用户也会进入弹窗，但不会显示）
  const t = userStore.profile?.guardianType ?? 'mechanical';
  return GUARDIAN_VISUALS[t];
});

const sceneLabel = computed(() => GUEST_GUIDE_SCENE_LABEL[guideModalScene.value]);

/** 点击蒙层关闭（卡片内 @tap.stop 阻止冒泡） */
function handleMaskTap() {
  agentStore.dismissGuideModal();
}

/** 主按钮：跳注册页 */
function handlePrimary() {
  agentStore.dismissGuideModal();
  uni.navigateTo({ url: '/pages/auth/login' });
}

/** 次按钮：关闭弹窗 */
function handleSecondary() {
  agentStore.dismissGuideModal();
}
</script>

<template>
  <view v-if="guideModalVisible && guideModalLine" class="guest-guide-modal" @tap="handleMaskTap">
    <!-- 居中卡片 -->
    <view class="guest-guide-modal__card" @tap.stop>
      <!-- 守护灵头像 -->
      <view
        class="guest-guide-modal__avatar"
        :style="{
          borderColor: visual.color,
          background: visual.bgColor,
        }"
      >
        <text class="guest-guide-modal__avatar-icon">{{ visual.icon }}</text>
        <view
          class="guest-guide-modal__avatar-glow"
          :style="{ background: visual.color }"
        />
      </view>

      <!-- 守护灵名字 + 场景标签 -->
      <view class="guest-guide-modal__header">
        <text class="guest-guide-modal__name">{{ visual.name }}</text>
        <text class="guest-guide-modal__scene-tag">{{ sceneLabel }}</text>
      </view>

      <!-- 文案卡片 -->
      <view class="guest-guide-modal__content">
        <text class="guest-guide-modal__title">{{ guideModalLine.title }}</text>
        <text class="guest-guide-modal__text">{{ guideModalLine.text }}</text>
      </view>

      <!-- 按钮区 -->
      <view class="guest-guide-modal__actions">
        <view
          class="guest-guide-modal__btn guest-guide-modal__btn--ghost"
          hover-class="guest-guide-modal__btn--hover"
          :hover-stay-time="50"
          @tap="handleSecondary"
        >
          <text>再看看</text>
        </view>
        <view
          class="guest-guide-modal__btn guest-guide-modal__btn--primary"
          hover-class="guest-guide-modal__btn--hover"
          :hover-stay-time="50"
          @tap="handlePrimary"
        >
          <text>领取我的领地</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.guest-guide-modal {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
  animation: guest-guide-modal-fade-in 0.25s ease-out;

  &__card {
    width: 100%;
    max-width: 600rpx;
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 2rpx solid #c9a87c;
    border-radius: 32rpx;
    padding: 56rpx 48rpx 48rpx;
    box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: guest-guide-modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &__avatar {
    position: relative;
    width: 144rpx;
    height: 144rpx;
    border-radius: 50%;
    border-width: 4rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.45);
    margin-bottom: 24rpx;
  }
  &__avatar-icon {
    font-size: 80rpx;
    line-height: 1;
    z-index: 1;
  }
  &__avatar-glow {
    position: absolute;
    inset: -24rpx;
    border-radius: 50%;
    opacity: 0.18;
    z-index: 0;
    animation: guest-guide-modal-pulse 2.4s ease-in-out infinite;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }
  &__name {
    font-size: 30rpx;
    color: #c9a87c;
    font-weight: 700;
    letter-spacing: 4rpx;
  }
  &__scene-tag {
    font-size: 20rpx;
    color: #a89e85;
    padding: 4rpx 14rpx;
    background: rgba(201, 168, 124, 0.12);
    border-radius: 10rpx;
  }

  &__content {
    width: 100%;
    text-align: center;
    margin-bottom: 40rpx;
  }
  &__title {
    display: block;
    font-size: 34rpx;
    color: #f5f0e6;
    font-weight: 700;
    line-height: 1.4;
    margin-bottom: 16rpx;
  }
  &__text {
    display: block;
    font-size: 28rpx;
    color: #d4c9b0;
    line-height: 1.7;
    font-weight: 400;
  }

  &__actions {
    width: 100%;
    display: flex;
    gap: 20rpx;
  }
  &__btn {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 28rpx;
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
      box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.4);
    }
    &--ghost {
      background: transparent;
      color: #a89e85;
      border: 1rpx solid rgba(201, 168, 124, 0.35);
    }
    &--hover {
      transform: scale(0.97);
    }
  }
}

@keyframes guest-guide-modal-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes guest-guide-modal-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes guest-guide-modal-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.18;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.06;
  }
}
</style>