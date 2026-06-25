<script setup lang="ts">
/**
 * GuardianBubble - 守护灵系统通知气泡
 * ----------------------------------------------------------------------
 * 区别于普通气泡：
 *   - 中央对齐（无头像错位）
 *   - 守护灵头像 + 守护灵名字（按 guardianType 切换）
 *   - 标题 + 副标题 + 内容三段式
 *   - 带左侧细金色边框，呼应"系统公告"语义
 *
 * Props:
 *   - guardianType   机械师 / 精灵 / 占星师
 *   - icon           守护灵图标（默认按 guardianType 取）
 *   - title          标题
 *   - content        正文
 *   - level          可选等级（levelUp 时使用）
 *   - time           发送时间
 */
import { computed } from 'vue';
import {
  GUARDIAN_COLOR,
  GUARDIAN_ICON,
  GUARDIAN_NAME,
  type GuardianType,
} from '@/utils/im-custom-msg';

interface Props {
  guardianType: GuardianType;
  icon?: string;
  title: string;
  content: string;
  level?: number;
  actorName?: string;
  time?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  title: '',
  content: '',
  time: '',
});

const finalIcon = computed(() => props.icon || GUARDIAN_ICON[props.guardianType]);
const finalName = computed(() => GUARDIAN_NAME[props.guardianType]);
const accent = computed(() => GUARDIAN_COLOR[props.guardianType]);
</script>

<template>
  <view class="guardian-bubble" :style="{ borderLeftColor: accent }">
    <!-- 左侧守护灵头像 -->
    <view
      class="guardian-bubble__avatar"
      :style="{ borderColor: accent, background: `linear-gradient(135deg, ${accent}33, ${accent}11)` }"
    >
      <text class="guardian-bubble__icon">
        {{ finalIcon }}
      </text>
      <view class="guardian-bubble__avatar-glow" :style="{ background: accent }" />
    </view>

    <!-- 主体内容 -->
    <view class="guardian-bubble__body">
      <view class="guardian-bubble__header">
        <text class="guardian-bubble__name" :style="{ color: accent }">
          {{ finalName }} · 通告
        </text>
        <text v-if="level" class="guardian-bubble__level" :style="{ background: accent }">
          Lv.{{ level }}
        </text>
      </view>
      <text class="guardian-bubble__title">
        {{ title }}
      </text>
      <text v-if="content" class="guardian-bubble__content">
        {{ content }}
      </text>
      <view v-if="actorName || time" class="guardian-bubble__footer">
        <text v-if="actorName" class="guardian-bubble__actor">
          — {{ actorName }}
        </text>
        <text v-if="time" class="guardian-bubble__time">
          {{ time }}
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.guardian-bubble {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  margin: 16rpx 32rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  border-left-width: 6rpx;
  border-left-style: solid;
  background: linear-gradient(180deg, rgba(201, 168, 124, 0.08) 0%, rgba(201, 168, 124, 0.02) 100%);
  // 古风暗纹
  background-image:
    radial-gradient(circle at 20% 20%, rgba(201, 168, 124, 0.06) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 80%, rgba(201, 168, 124, 0.06) 1rpx, transparent 1rpx);
  background-size: 40rpx 40rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.3);

  &__avatar {
    position: relative;
    width: 80rpx;
    height: 80rpx;
    flex-shrink: 0;
    border-radius: 50%;
    border-width: 3rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  &__icon {
    font-size: 48rpx;
    line-height: 1;
    z-index: 1;
  }
  &__avatar-glow {
    position: absolute;
    inset: -16rpx;
    border-radius: 50%;
    opacity: 0.15;
    z-index: 0;
    animation: guardian-pulse 2.4s ease-in-out infinite;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__name {
    font-size: 24rpx;
    font-weight: 600;
    letter-spacing: 2rpx;
  }

  &__level {
    font-size: 18rpx;
    color: #1E241F;
    padding: 2rpx 10rpx;
    border-radius: 10rpx;
    font-weight: 700;
  }

  &__title {
    font-size: 30rpx;
    color: $u-main-color;
    font-weight: 600;
    margin-top: 4rpx;
  }

  &__content {
    font-size: 26rpx;
    color: $u-content-color;
    line-height: 1.5;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8rpx;
    gap: 12rpx;
  }

  &__actor {
    font-size: 22rpx;
    color: $u-tips-color;
    font-style: italic;
  }
  &__time {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.7;
  }
}

@keyframes guardian-pulse {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.2); opacity: 0.25; }
}
</style>
