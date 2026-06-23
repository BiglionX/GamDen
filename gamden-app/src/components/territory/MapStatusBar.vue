<script setup lang="ts">
import { computed } from 'vue';
import type { Territory } from '@/types/territory';
import type { User } from '@/types/user';

interface Props {
  /** 当前用户领地（游客态可为空） */
  territory: Territory | null;
  /** 当前用户（含金币、未读消息） */
  user: User | null;
  /** 缩放级别（用于在状态栏显示缩放百分比） */
  scale: number;
  /** 加载中 */
  loading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'messages'): void;
  (e: 'profile'): void;
  (e: 'refresh'): void;
}>();

const level = computed(() => props.territory?.level ?? 1);
const exp = computed(() => props.territory?.exp ?? 0);
const nextLevelExp = computed(() => props.territory?.nextLevelExp ?? 100);

const expPercent = computed(() => {
  if (!nextLevelExp.value || nextLevelExp.value <= 0) return 0;
  return Math.min(100, Math.floor((exp.value / nextLevelExp.value) * 100));
});

const coinBalance = computed(() => props.user?.coinBalance ?? 0);
const unreadCount = computed(() => props.user?.unreadCount ?? 0);

const scalePercent = computed(() => `${Math.round(props.scale * 100)}%`);

const unreadText = computed(() => {
  if (unreadCount.value <= 0) return '';
  if (unreadCount.value > 99) return '99+';
  return String(unreadCount.value);
});
</script>

<template>
  <view class="map-status">
    <!-- 领地等级 + 经验条 -->
    <view class="map-status__level">
      <view class="map-status__level-row">
        <text class="map-status__level-num">Lv.{{ level }}</text>
        <text class="map-status__exp-text">{{ exp }}/{{ nextLevelExp }} EXP</text>
      </view>
      <view class="map-status__exp-bar">
        <view class="map-status__exp-bar-fill" :style="{ width: expPercent + '%' }" />
      </view>
    </view>

    <!-- 右侧操作区 -->
    <view class="map-status__actions">
      <!-- 金币 -->
      <view class="map-status__coin">
        <text class="map-status__coin-icon">🪙</text>
        <text class="map-status__coin-num">{{ coinBalance }}</text>
      </view>

      <!-- 消息（带未读红点） -->
      <view class="map-status__icon-btn" @tap="emit('messages')">
        <text class="map-status__icon">💬</text>
        <view v-if="unreadCount > 0" class="map-status__badge">
          <text class="map-status__badge-text">{{ unreadText }}</text>
        </view>
      </view>

      <!-- 个人中心 -->
      <view class="map-status__icon-btn" @tap="emit('profile')">
        <text class="map-status__icon">👤</text>
      </view>

      <!-- 刷新 -->
      <view class="map-status__icon-btn" @tap="emit('refresh')">
        <text class="map-status__icon" :class="{ 'map-status__icon--spin': loading }">⟳</text>
      </view>

      <!-- 缩放指示 -->
      <view class="map-status__scale">
        <text>{{ scalePercent }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.map-status {
  display: flex;
  align-items: center;
  background: rgba(30, 36, 31, 0.92);
  border: 1rpx solid rgba(201, 168, 124, 0.25);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  backdrop-filter: blur(12rpx);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);

  &__level { flex: 1; min-width: 0; }
  &__level-row {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }
  &__level-num {
    font-size: 30rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 1rpx;
  }
  &__exp-text {
    font-size: 20rpx;
    color: #a89e85;
  }
  &__exp-bar {
    height: 8rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 4rpx;
    overflow: hidden;
  }
  &__exp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c 0%, #5a8f6c 100%);
    border-radius: 4rpx;
    transition: width 0.4s ease;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-left: 16rpx;
  }

  &__coin {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 6rpx 16rpx;
    background: rgba(201, 168, 124, 0.12);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 24rpx;
  }
  &__coin-icon { font-size: 24rpx; }
  &__coin-num {
    font-size: 24rpx;
    color: #f5f0e6;
    font-weight: 600;
  }

  &__icon-btn {
    position: relative;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.08);
    transition: transform 0.15s;
    &:active { transform: scale(0.9); }
  }
  &__icon {
    font-size: 32rpx;
    color: #c9a87c;
    &--spin { animation: t-spin 1s linear infinite; }
  }

  &__badge {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    min-width: 28rpx;
    height: 28rpx;
    padding: 0 6rpx;
    background: #c0392b;
    border-radius: 14rpx;
    border: 2rpx solid #1e241f;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__badge-text {
    font-size: 18rpx;
    color: #fff;
    font-weight: 700;
    line-height: 1;
  }

  &__scale {
    margin-left: 8rpx;
    padding: 4rpx 12rpx;
    font-size: 20rpx;
    color: #a89e85;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6rpx;
  }
}

@keyframes t-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
