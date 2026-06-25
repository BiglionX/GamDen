<script setup lang="ts">
/**
 * WelcomeBubble - 入群欢迎消息
 * ----------------------------------------------------------------------
 * 系统通知型气泡，居中显示，弱化头像，强调欢迎语义：
 *   - 顶部一行：新成员头像 + 名字 + "加入巢穴"
 *   - 中部一行：欢迎语（带渐变色高亮）
 *   - 底部：守护灵图标 + 时间
 *
 * Props:
 *   - newMemberName  新成员昵称
 *   - avatar        头像 emoji
 *   - guardianType  守护灵类型（影响底部装饰色）
 *   - greeting      欢迎语
 *   - time          发送时间
 */
import { computed } from 'vue';
import {
  GUARDIAN_COLOR,
  GUARDIAN_ICON,
  GUARDIAN_NAME,
  type GuardianType,
} from '@/utils/im-custom-msg';

interface Props {
  newMemberName: string;
  avatar?: string;
  guardianType: GuardianType;
  greeting: string;
  time?: string;
}

const props = withDefaults(defineProps<Props>(), {
  avatar: '🛖',
  greeting: '欢迎加入巢穴！',
  time: '',
});

const accent = computed(() => GUARDIAN_COLOR[props.guardianType]);
const guardianIcon = computed(() => GUARDIAN_ICON[props.guardianType]);
const guardianName = computed(() => GUARDIAN_NAME[props.guardianType]);
</script>

<template>
  <view class="welcome-bubble">
    <!-- 顶部装饰线 -->
    <view class="welcome-bubble__line" :style="{ background: accent }" />

    <view class="welcome-bubble__inner">
      <!-- 新成员头像 + 名字 -->
      <view class="welcome-bubble__row">
        <view
          class="welcome-bubble__avatar"
          :style="{ borderColor: accent }"
        >
          <text class="welcome-bubble__avatar-icon">
            {{ avatar }}
          </text>
        </view>
        <view class="welcome-bubble__member">
          <text class="welcome-bubble__name">
            {{ newMemberName }}
          </text>
          <text class="welcome-bubble__action" :style="{ color: accent }">
            加入巢穴 ✦
          </text>
        </view>
      </view>

      <!-- 欢迎语 -->
      <text class="welcome-bubble__greeting">
        {{ greeting }}
      </text>

      <!-- 底部守护灵装饰 -->
      <view class="welcome-bubble__footer">
        <text class="welcome-bubble__guardian-icon">
          {{ guardianIcon }}
        </text>
        <text class="welcome-bubble__guardian-name" :style="{ color: accent }">
          {{ guardianName }}守护中
        </text>
        <text v-if="time" class="welcome-bubble__time">
          · {{ time }}
        </text>
      </view>
    </view>

    <!-- 底部装饰线 -->
    <view class="welcome-bubble__line welcome-bubble__line--bottom" :style="{ background: accent }" />
  </view>
</template>

<style lang="scss" scoped>
.welcome-bubble {
  margin: 20rpx 32rpx;
  position: relative;
  padding: 4rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(201, 168, 124, 0.4), rgba(201, 168, 124, 0.1));
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.35);

  &__line {
    height: 2rpx;
    border-radius: 2rpx;
    margin: 0 24rpx;
    opacity: 0.6;
    &--bottom { margin-top: 12rpx; margin-bottom: 0; }
  }

  &__inner {
    padding: 24rpx;
    border-radius: 16rpx;
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    // 巢穴暗纹
    background-image:
      radial-gradient(circle at 25% 25%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx),
      radial-gradient(circle at 75% 75%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx);
    background-size: 40rpx 40rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 16rpx;
  }

  &__avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    border-width: 3rpx;
    border-style: solid;
    background: rgba(201, 168, 124, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.4);
    &-icon { font-size: 40rpx; line-height: 1; }
  }

  &__member {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  &__name {
    font-size: 30rpx;
    color: $u-main-color;
    font-weight: 600;
  }
  &__action {
    font-size: 22rpx;
    font-weight: 500;
    letter-spacing: 2rpx;
  }

  &__greeting {
    display: block;
    font-size: 28rpx;
    line-height: 1.55;
    color: $u-content-color;
    padding: 12rpx 0;
    // 文字渐变
    background: linear-gradient(135deg, #f5f0e6 0%, #c9a87c 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 500;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 12rpx;
    padding-top: 12rpx;
    border-top: 1rpx dashed rgba(201, 168, 124, 0.3);
  }
  &__guardian-icon { font-size: 26rpx; }
  &__guardian-name {
    font-size: 22rpx;
    font-weight: 500;
    letter-spacing: 1rpx;
  }
  &__time {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.7;
  }
}
</style>
