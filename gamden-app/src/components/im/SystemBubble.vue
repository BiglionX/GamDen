<script setup lang="ts">
/**
 * SystemBubble - 系统通知消息
 * ----------------------------------------------------------------------
 * 单聊场景下的系统通知（如 "你已添加 XX 为好友"）
 * - 居中展示
 * - 古风分隔线 + 半透明背景
 * - 守护灵消息走 GuardianBubble，不在此处（私聊不展示守护灵）
 */
interface Props {
  text: string;
}

withDefaults(defineProps<Props>(), {
  text: '',
});
</script>

<template>
  <view class="sys-bubble">
    <view class="sys-bubble__line" />
    <view class="sys-bubble__text-wrap">
      <text class="sys-bubble__text">{{ text }}</text>
    </view>
    <view class="sys-bubble__line" />
  </view>
</template>

<style lang="scss" scoped>
.sys-bubble {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  margin: 8rpx 0;

  &__line {
    flex: 1;
    height: 1rpx;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(201, 168, 124, 0.4) 50%,
      transparent 100%
    );
  }

  &__text-wrap {
    padding: 8rpx 20rpx;
    background: rgba(201, 168, 124, 0.1);
    border: 1rpx solid rgba(201, 168, 124, 0.25);
    border-radius: 24rpx;
  }

  &__text {
    font-size: 22rpx;
    color: $u-tips-color;
    letter-spacing: 2rpx;
  }
}
</style>