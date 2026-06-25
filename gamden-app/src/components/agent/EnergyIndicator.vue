<template>
  <view class="energy-indicator" @click="handleClick">
    <!-- 能量图标 -->
    <view class="energy-icon-wrapper">
      <text class="energy-icon">
        {{ getEnergyIcon() }}
      </text>
    </view>

    <!-- 能量信息 -->
    <view class="energy-info">
      <view class="energy-header">
        <text class="energy-label">
          {{ getEnergyLabel() }}
        </text>
        <text class="energy-percentage">
          {{ percentage }}%
        </text>
      </view>
      
      <!-- 进度条 -->
      <view class="energy-progress">
        <view 
          class="energy-progress-fill" 
          :style="{ width: percentage + '%' }"
        ></view>
      </view>
      
      <!-- 详细数值 -->
      <view class="energy-detail">
        <text class="detail-text">
          已用 {{ used.toLocaleString() }} / {{ total.toLocaleString() }}
        </text>
      </view>
    </view>

    <!-- 充值提示 -->
    <view v-if="level === 'depleted'" class="topup-hint">
      <text class="hint-text">
        点击充能
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  percentage: number;
  level: 'abundant' | 'low' | 'depleted';
  used: number;
  total: number;
  purchasedBalance?: number;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

// 获取能量图标
const getEnergyIcon = () => {
  const icons: Record<string, string> = {
    abundant: '⚡',
    low: '🪫',
    depleted: '🔋'
  };
  return icons[props.level] || '⚡';
};

// 获取能量标签
const getEnergyLabel = () => {
  const labels: Record<string, string> = {
    abundant: '充沛',
    low: '低能量',
    depleted: '已休息'
  };
  return labels[props.level] || '充沛';
};

// 获取能量颜色
const getEnergyColor = () => {
  const colors: Record<string, string> = {
    abundant: '#52c41a',
    low: '#faad14',
    depleted: '#f5222d'
  };
  return colors[props.level] || '#52c41a';
};

// 点击事件
const handleClick = () => {
  emit('click');
};
</script>

<style scoped lang="scss">
.energy-indicator {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  border: 1px solid rgba(255, 215, 0, 0.1);
}

.energy-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 215, 0, 0.1);
  border-radius: 50%;
  margin-right: 20rpx;
}

.energy-icon {
  font-size: 36rpx;
}

.energy-info {
  flex: 1;
}

.energy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.energy-label {
  font-size: 26rpx;
  color: #888;
}

.energy-percentage {
  font-size: 28rpx;
  font-weight: bold;
  color: #ffd700;
}

.energy-progress {
  height: 8rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.energy-progress-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.3s ease;
  background: linear-gradient(90deg, #52c41a, #73d13d);
}

.energy-progress-fill[style*="faad14"] {
  background: linear-gradient(90deg, #faad14, #ffc53d);
}

.energy-progress-fill[style*="f5222d"] {
  background: linear-gradient(90deg, #f5222d, #ff7875);
}

.energy-detail {
  display: flex;
  align-items: center;
}

.detail-text {
  font-size: 22rpx;
  color: #666;
}

.topup-hint {
  margin-left: 20rpx;
  padding: 10rpx 20rpx;
  background-color: rgba(245, 34, 45, 0.2);
  border-radius: 20rpx;
}

.hint-text {
  font-size: 22rpx;
  color: #f5222d;
}
</style>
