<script setup lang="ts">
/**
 * ChatBubble - 通用文本/表情气泡
 * ----------------------------------------------------------------------
 * 古风边框纹理（CSS 实现，零图片依赖）
 *   - 通过 repeating-linear-gradient 模拟回字纹边框
 *   - 通过 box-shadow 内嵌 / 外发光 模拟金属浮雕
 *
 * 颜色体系（与 wxo_bubble_customize.json 同步）：
 *   - 左气泡（他人）：浅灰渐变 #4A5250 → #3D4544
 *   - 右气泡（自己）：领地金渐变 #C9A87C → #A8895F
 *   - 古风边框：机械师色 #8B7355 / 金色 #D8BE95
 *
 * Props:
 *   - isSelf    是否自己发送（右对齐 + 金色背景）
 *   - text      文本消息
 *   - emoji     表情消息（unicode 大字）
 *   - avatar    头像 emoji
 *   - name      发送者昵称
 *   - time      发送时间（已格式化字符串）
 */
import { computed } from 'vue';

interface Props {
  isSelf?: boolean;
  text?: string;
  emoji?: string;
  avatar?: string;
  name?: string;
  time?: string;
  /** 发送状态：sending / success / failed */
  status?: 'sending' | 'success' | 'failed';
}

const props = withDefaults(defineProps<Props>(), {
  isSelf: false,
  text: '',
  emoji: '',
  avatar: '🛖',
  name: '',
  time: '',
  status: 'success',
});

const hasText = computed(() => !!props.text);
const hasEmoji = computed(() => !!props.emoji);
const showStatus = computed(() => props.isSelf && props.status && props.status !== 'success');
</script>

<template>
  <view class="chat-bubble" :class="{ 'chat-bubble--self': isSelf }">
    <!-- 头像（仅他人消息左侧显示） -->
    <view v-if="!isSelf" class="chat-bubble__avatar">
      <text class="chat-bubble__avatar-icon">{{ avatar }}</text>
    </view>

    <!-- 主内容 -->
    <view class="chat-bubble__main">
      <!-- 昵称 -->
      <text v-if="!isSelf && name" class="chat-bubble__name">{{ name }}</text>

      <!-- 气泡 -->
      <view class="chat-bubble__body">
        <!-- 古风边框纹理（4 层叠加） -->
        <view class="chat-bubble__border-outer" />
        <view class="chat-bubble__border-inner" />
        <view class="chat-bubble__body-inner">
          <text v-if="hasText" class="chat-bubble__text" :selectable="true" :user-select="true">
            {{ text }}
          </text>
          <text v-else-if="hasEmoji" class="chat-bubble__emoji">{{ emoji }}</text>
        </view>
      </view>

      <!-- 时间 + 发送状态（自己消息） -->
      <view v-if="time || showStatus" class="chat-bubble__footer">
        <text v-if="showStatus" class="chat-bubble__status" :class="`chat-bubble__status--${status}`">
          {{ status === 'sending' ? '发送中...' : '发送失败' }}
        </text>
        <text v-if="time" class="chat-bubble__time">{{ time }}</text>
      </view>
    </view>

    <!-- 自己消息右侧的头像 -->
    <view v-if="isSelf" class="chat-bubble__avatar chat-bubble__avatar--self">
      <text class="chat-bubble__avatar-icon">{{ avatar }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.chat-bubble {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 24rpx;
  width: 100%;

  &__avatar {
    flex-shrink: 0;
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    border: 2rpx solid rgba(201, 168, 124, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.35);
    &-icon { font-size: 40rpx; line-height: 1; }
  }

  &__main {
    display: flex;
    flex-direction: column;
    max-width: 70%;
    min-width: 0;
  }

  &__name {
    font-size: 22rpx;
    color: $u-tips-color;
    margin-bottom: 6rpx;
    padding-left: 16rpx;
  }

  &__body {
    position: relative;
    padding: 6rpx;
    border-radius: 18rpx;
    // 古风边框外层（深色描边）
    background: linear-gradient(135deg, #8B7355 0%, #6B5840 50%, #8B7355 100%);
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.4);
  }

  &__border-outer {
    position: absolute;
    inset: 0;
    border-radius: 18rpx;
    background-image:
      repeating-linear-gradient(
        45deg,
        rgba(201, 168, 124, 0.18) 0,
        rgba(201, 168, 124, 0.18) 2rpx,
        transparent 2rpx,
        transparent 6rpx
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(201, 168, 124, 0.12) 0,
        rgba(201, 168, 124, 0.12) 2rpx,
        transparent 2rpx,
        transparent 6rpx
      );
    pointer-events: none;
  }

  &__border-inner {
    position: absolute;
    inset: 4rpx;
    border-radius: 14rpx;
    border: 2rpx solid rgba(245, 240, 230, 0.25);
    pointer-events: none;
  }

  &__body-inner {
    position: relative;
    padding: 20rpx 28rpx;
    border-radius: 14rpx;
    // 左气泡（他人）：浅灰渐变（与 wxo_bubble_customize.json 同步）
    background: linear-gradient(180deg, #4A5250 0%, #3D4544 100%);
    // 古风暗纹（细微点阵）
    background-image:
      radial-gradient(circle at 20% 30%, rgba(201, 168, 124, 0.05) 1rpx, transparent 1rpx),
      radial-gradient(circle at 80% 70%, rgba(201, 168, 124, 0.04) 1rpx, transparent 1rpx);
    background-size: 32rpx 32rpx;
    min-height: 48rpx;
  }

  &__text {
    font-size: 30rpx;
    line-height: 1.55;
    color: $u-main-color;
    word-break: break-word;
    white-space: pre-wrap;
  }

  &__emoji {
    font-size: 80rpx;
    line-height: 1;
  }

  &__time {
    font-size: 20rpx;
    color: $u-tips-color;
    margin-top: 8rpx;
    padding: 0 16rpx;
    opacity: 0.7;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 8rpx;
    padding: 0 16rpx;
  }

  &__status {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.7;
    &--sending {
      color: #c9a87c;
      opacity: 0.8;
    }
    &--failed {
      color: $u-warning;
      opacity: 1;
      font-weight: 600;
    }
  }

  // === 自己消息（右对齐 + 领地金主题） ===
  &--self {
    flex-direction: row-reverse;
    .chat-bubble__main {
      align-items: flex-end;
    }
    .chat-bubble__name { display: none; }
    .chat-bubble__body {
      // 古风边框外层（金色高亮）
      background: linear-gradient(135deg, #D8BE95 0%, #C9A87C 50%, #D8BE95 100%);
    }
    .chat-bubble__body-inner {
      // 右气泡（自己）：领地金渐变（与 wxo_bubble_customize.json 同步）
      background: linear-gradient(135deg, #C9A87C 0%, #A8895F 100%);
      background-image:
        radial-gradient(circle at 30% 30%, rgba(255, 245, 220, 0.22) 1rpx, transparent 1rpx),
        radial-gradient(circle at 70% 80%, rgba(255, 245, 220, 0.16) 1rpx, transparent 1rpx);
      background-size: 32rpx 32rpx;
    }
    .chat-bubble__text {
      color: #1E241F;
      font-weight: 500;
    }
    .chat-bubble__border-inner {
      border-color: rgba(245, 240, 230, 0.35);
    }
    .chat-bubble__avatar--self {
      border-color: rgba(216, 190, 149, 0.7);
    }
    .chat-bubble__time {
      text-align: right;
    }
    .chat-bubble__footer {
      justify-content: flex-end;
    }
  }
}
</style>
