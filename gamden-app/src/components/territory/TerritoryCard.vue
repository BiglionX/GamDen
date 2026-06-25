<script setup lang="ts">
import { computed } from 'vue';
import type { NeighborNode } from '@/types/territory';
import type { GuardianType } from '@/types/user';

interface Props {
  neighbor: NeighborNode;
  isGuest: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'chat', neighbor: NeighborNode): void;
  (e: 'visit', neighbor: NeighborNode): void;
}>();

const GUARDIAN_LABELS: Record<GuardianType, string> = {
  mechanical: '机械师',
  elf: '精灵',
  astrologer: '占星师',
  ranger: '游侠',
  artisan: '工匠',
  apostle: '使徒',
};

const GUARDIAN_ICON: Record<GuardianType, string> = {
  mechanical: '⚙️',
  elf: '🌿',
  astrologer: '🔮',
  ranger: '🏹',
  artisan: '🔨',
  apostle: '🛡️',
};

const guardianLabel = computed(() => GUARDIAN_LABELS[props.neighbor.guardianType]);
const guardianIcon = computed(() => GUARDIAN_ICON[props.neighbor.guardianType]);
const games = computed(() => props.neighbor.gameTags ?? []);
</script>

<template>
  <view class="t-card-mask" @tap="emit('close')">
    <view class="t-card" @tap.stop>
      <!-- 顶部装饰 -->
      <view class="t-card__deco">
        <text class="t-card__deco-line"></text>
        <text class="t-card__deco-text">
          {{ guardianLabel }}领地
        </text>
        <text class="t-card__deco-line"></text>
      </view>

      <!-- 头像 + 昵称 + 等级 -->
      <view class="t-card__header">
        <view class="t-card__avatar">
          <text class="t-card__avatar-icon">
            {{ guardianIcon }}
          </text>
        </view>
        <view class="t-card__info">
          <text class="t-card__nickname">
            {{ neighbor.nickname }}
          </text>
          <view class="t-card__meta">
            <text class="t-card__level">
              Lv.{{ neighbor.level }}
            </text>
            <text class="t-card__dot">
              ·
            </text>
            <text class="t-card__coord">
              ({{ neighbor.coordX }}, {{ neighbor.coordY }})
            </text>
          </view>
        </view>
      </view>

      <!-- 游戏标签 -->
      <view v-if="games.length" class="t-card__games">
        <text class="t-card__games-label">
          最近常玩：
        </text>
        <view class="t-card__tags">
          <text v-for="g in games" :key="g" class="t-card__tag">
            {{ g }}
          </text>
        </view>
      </view>

      <!-- 守护灵说明 -->
      <view class="t-card__guardian">
        <text class="t-card__guardian-label">
          守护灵
        </text>
        <text class="t-card__guardian-value">
          {{ guardianLabel }}
        </text>
      </view>

      <!-- 按钮 -->
      <view class="t-card__actions">
        <button
          v-if="isGuest"
          class="t-card__btn t-card__btn--primary"
          @tap="emit('visit', neighbor)"
        >
          拜访 TA 的巢穴 →
        </button>
        <template v-else>
          <button class="t-card__btn t-card__btn--primary" @tap="emit('chat', neighbor)">
            打个招呼
          </button>
          <button class="t-card__btn t-card__btn--ghost" @tap="emit('close')">
            关闭
          </button>
        </template>
      </view>

      <!-- 游客提示 -->
      <view v-if="isGuest" class="t-card__guest-hint">
        <text>💡 入驻巢穴后即可私聊与升级</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.t-card-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: t-fade-in 0.2s ease;
}

.t-card {
  width: 78%;
  max-width: 640rpx;
  background: linear-gradient(180deg, #262d27 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.6);
  animation: t-pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

  &__deco {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 32rpx;
    justify-content: center;
  }
  &__deco-line {
    flex: 1;
    height: 1rpx;
    background: linear-gradient(90deg, transparent 0%, #c9a87c 50%, transparent 100%);
  }
  &__deco-text {
    font-size: 22rpx;
    color: #c9a87c;
    letter-spacing: 4rpx;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin-bottom: 32rpx;
  }
  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #f5dcae;
    box-shadow: 0 0 16rpx rgba(201, 168, 124, 0.4);
  }
  &__avatar-icon { font-size: 56rpx; }
  &__info { flex: 1; min-width: 0; }
  &__nickname {
    font-size: 36rpx;
    color: #f5f0e6;
    font-weight: 600;
    display: block;
    margin-bottom: 8rpx;
  }
  &__meta { display: flex; align-items: center; gap: 8rpx; }
  &__level {
    font-size: 24rpx;
    color: #c9a87c;
    background: rgba(201, 168, 124, 0.15);
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
  }
  &__dot { color: #8a7f63; font-size: 20rpx; }
  &__coord { font-size: 22rpx; color: #a89e85; }

  &__games {
    margin-bottom: 24rpx;
    padding: 16rpx 20rpx;
    background: rgba(201, 168, 124, 0.06);
    border-radius: 12rpx;
  }
  &__games-label {
    font-size: 22rpx;
    color: #a89e85;
    display: block;
    margin-bottom: 12rpx;
  }
  &__tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
  &__tag {
    font-size: 22rpx;
    color: #f5f0e6;
    padding: 4rpx 14rpx;
    background: rgba(201, 168, 124, 0.18);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 6rpx;
  }

  &__guardian {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 20rpx;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12rpx;
    margin-bottom: 32rpx;
  }
  &__guardian-label { font-size: 24rpx; color: #a89e85; }
  &__guardian-value { font-size: 24rpx; color: #c9a87c; font-weight: 600; }

  &__actions {
    display: flex;
    gap: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 600;
    border: none;
    line-height: 80rpx;
    text-align: center;
    transition: transform 0.15s;

    &--primary {
      background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
      color: #1e241f;
      box-shadow: 0 4rpx 12rpx rgba(201, 168, 124, 0.35);
    }
    &--ghost {
      background: transparent;
      color: #a89e85;
      border: 1rpx solid rgba(201, 168, 124, 0.3);
    }
    &:active { transform: scale(0.96); }
  }

  &__guest-hint {
    margin-top: 24rpx;
    padding: 12rpx 16rpx;
    background: rgba(90, 143, 108, 0.1);
    border-left: 4rpx solid #5a8f6c;
    border-radius: 6rpx;
    font-size: 22rpx;
    color: #a89e85;
    text-align: center;
  }
}

@keyframes t-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes t-pop-in {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
</style>
