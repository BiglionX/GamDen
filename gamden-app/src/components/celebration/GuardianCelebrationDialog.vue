<script setup lang="ts">
/**
 * GuardianCelebrationDialog —— 守护灵庆祝弹窗（可复用）
 *
 * 设计要点：
 *  - 全屏半透明蒙层 + 居中卡片
 *  - 守护灵头像（emoji/图片） + 对话气泡（带小三角）
 *  - 主按钮 + 次按钮
 *  - 入场动画：缩放 + 淡入（200ms 弹性曲线）
 *  - 复用场景：里程碑庆祝 / 功能解锁 / 升级等
 *
 * Props 全部可选，提供开箱即用的默认文案
 */
import { computed } from 'vue';

interface DialogButton {
  /** 按钮文字 */
  text: string;
  /** 是否主按钮（主按钮用金色实心，次按钮用描边） */
  primary?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** 是否可见 */
    visible: boolean;
    /** 守护灵 emoji 或图标（fallback 显示） */
    guardianIcon?: string;
    /** 守护灵名称 */
    guardianName?: string;
    /** 守护灵主色（边框 / 强调色） */
    guardianColor?: string;
    /** 卡片顶部徽标文字（可选） */
    badge?: string;
    /** 标题 */
    title?: string;
    /** 守护灵对话气泡文案 */
    body?: string;
    /** 主按钮 */
    primaryButton?: DialogButton;
    /** 次按钮 */
    secondaryButton?: DialogButton;
  }>(),
  {
    guardianIcon: '🧚',
    guardianName: '巢灵',
    guardianColor: '#C9A87C',
    badge: '🏰 里程碑达成',
    title: '🎉 恭喜解锁！',
    body: '你的领地已经容不下更多邻居了——是时候拥有一个属于自己的「城门口」了！',
    primaryButton: () => ({ text: '去看看', primary: true }),
    secondaryButton: () => ({ text: '稍后再说' }),
  },
);

const emit = defineEmits<{
  /** 点击主按钮 */
  (e: 'primary'): void;
  /** 点击次按钮 */
  (e: 'secondary'): void;
  /** 点击蒙层关闭 */
  (e: 'dismiss'): void;
}>();

const titleText = computed(() => props.title);
const badgeText = computed(() => props.badge);

function onPrimary(): void {
  emit('primary');
}
function onSecondary(): void {
  emit('secondary');
}
function onMask(): void {
  emit('dismiss');
}
/**
 * 阻止冒泡（点击卡片内不触发蒙层关闭）
 */
function stopProp(e: Event): void {
  e.stopPropagation();
}
</script>

<template>
  <view v-if="visible" class="gcd-mask" @tap="onMask">
    <view class="gcd-card" @tap="stopProp">
      <!-- 顶部徽标 -->
      <view class="gcd-badge" :style="{ background: guardianColor }">
        <text class="gcd-badge__text">{{ badgeText }}</text>
      </view>

      <!-- 守护灵头像 -->
      <view
        class="gcd-avatar"
        :style="{
          borderColor: guardianColor,
          background: `linear-gradient(135deg, ${guardianColor}33 0%, ${guardianColor}11 100%)`,
        }"
      >
        <text class="gcd-avatar__icon">{{ guardianIcon }}</text>
        <view
          class="gcd-avatar__glow"
          :style="{ background: guardianColor }"
        />
      </view>

      <!-- 标题 -->
      <text class="gcd-title">{{ titleText }}</text>

      <!-- 对话气泡 -->
      <view class="gcd-bubble">
        <view
          class="gcd-bubble__arrow"
          :style="{ borderBottomColor: guardianColor }"
        />
        <view class="gcd-bubble__header">
          <text
            class="gcd-bubble__name"
            :style="{ color: guardianColor }"
          >{{ guardianName }}</text>
          <text class="gcd-bubble__role">守护灵</text>
        </view>
        <text class="gcd-bubble__text">{{ body }}</text>
      </view>

      <!-- 按钮区 -->
      <view class="gcd-actions">
        <view
          v-if="secondaryButton"
          class="gcd-btn gcd-btn--secondary"
          hover-class="gcd-btn--hover"
          :style="{ borderColor: guardianColor, color: guardianColor }"
          @tap="onSecondary"
        >
          <text>{{ secondaryButton.text }}</text>
        </view>
        <view
          v-if="primaryButton"
          class="gcd-btn gcd-btn--primary"
          hover-class="gcd-btn--hover"
          :style="{
            background: `linear-gradient(135deg, ${guardianColor} 0%, ${guardianColor}cc 100%)`,
          }"
          @tap="onPrimary"
        >
          <text>{{ primaryButton.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.gcd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 20, 16, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  animation: gcd-mask-in 0.25s ease-out;
}

.gcd-card {
  position: relative;
  width: 100%;
  max-width: 600rpx;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 28rpx;
  padding: 80rpx 48rpx 48rpx;
  box-shadow: 0 16rpx 60rpx rgba(0, 0, 0, 0.6);
  animation: gcd-card-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gcd-badge {
  position: absolute;
  top: -24rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 8rpx 24rpx;
  border-radius: 999px;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.5);

  &__text {
    color: #1e241f;
    font-size: 22rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
}

.gcd-avatar {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border-width: 4rpx;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.5);
  overflow: visible;

  &__icon {
    font-size: 96rpx;
    line-height: 1;
    z-index: 1;
  }
  &__glow {
    position: absolute;
    inset: -32rpx;
    border-radius: 50%;
    opacity: 0.15;
    z-index: 0;
    animation: gcd-avatar-pulse 2.4s ease-in-out infinite;
  }
}

.gcd-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #f5dcae;
  text-align: center;
  margin-bottom: 24rpx;
  letter-spacing: 2rpx;
}

.gcd-bubble {
  position: relative;
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1rpx solid rgba(201, 168, 124, 0.4);
  border-radius: 16rpx;
  padding: 24rpx 28rpx 28rpx;
  margin-bottom: 40rpx;

  &__arrow {
    position: absolute;
    top: -16rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom-width: 16rpx;
    border-bottom-style: solid;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 12rpx;
    padding-bottom: 8rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);
  }
  &__name {
    font-size: 26rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
  }
  &__role {
    font-size: 20rpx;
    color: #a89e85;
    padding: 2rpx 12rpx;
    background: rgba(201, 168, 124, 0.12);
    border-radius: 8rpx;
  }
  &__text {
    display: block;
    font-size: 28rpx;
    color: #f5f0e6;
    line-height: 1.7;
    font-weight: 500;
  }
}

.gcd-actions {
  display: flex;
  width: 100%;
  gap: 20rpx;
}

.gcd-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  transition: all 0.15s ease;
  border-width: 2rpx;
  border-style: solid;

  text {
    color: inherit;
  }

  &--primary {
    border-color: transparent;
    color: #1e241f !important;
    box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.35);
  }
  &--secondary {
    background: transparent;
  }
  &--hover {
    transform: scale(0.97);
    opacity: 0.85;
  }
}

@keyframes gcd-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gcd-card-in {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes gcd-avatar-pulse {
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
