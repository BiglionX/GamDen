<template>
  <view class="memories-page">
    <!-- 顶部导航 -->
    <view class="page-header">
      <view class="header-left" @click="goBack">
        <text class="icon-back">
          &#8592;
        </text>
      </view>
      <view class="header-title">
        <text class="title-text">
          守护灵记忆
        </text>
      </view>
      <view class="header-right">
        <!-- 占位 -->
      </view>
    </view>

    <!-- 记忆统计 -->
    <view class="stats-section">
      <view class="stats-card">
        <view class="stats-item">
          <text class="stats-number">
            {{ totalMemories }}
          </text>
          <text class="stats-label">
            记忆总数
          </text>
        </view>
        <view class="stats-divider"></view>
        <view class="stats-item">
          <text class="stats-number">
            {{ gamePreferenceCount }}
          </text>
          <text class="stats-label">
            游戏偏好
          </text>
        </view>
        <view class="stats-divider"></view>
        <view class="stats-item">
          <text class="stats-number">
            {{ emotionCount }}
          </text>
          <text class="stats-label">
            情感状态
          </text>
        </view>
      </view>
    </view>

    <!-- 记忆列表 -->
    <scroll-view class="memory-list" scroll-y>
      <!-- 空状态 -->
      <view v-if="memories.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">
          📖
        </text>
        <text class="empty-text">
          守护灵还在了解你
        </text>
        <text class="empty-hint">
          多和守护灵聊天，它会记住关于你的事情
        </text>
      </view>

      <!-- 记忆分组 -->
      <view v-for="group in groupedMemories" :key="group.type" class="memory-group">
        <view class="group-header">
          <text class="group-icon">
            {{ getTypeIcon(group.type) }}
          </text>
          <text class="group-title">
            {{ getTypeName(group.type) }}
          </text>
          <text class="group-count">
            {{ group.items.length }} 条
          </text>
        </view>
        <view class="group-items">
          <view v-for="item in group.items" :key="item.id" class="memory-item">
            <view class="memory-content">
              <text class="memory-text">
                {{ item.content }}
              </text>
            </view>
            <view class="memory-meta">
              <view class="importance-stars">
                <text v-for="i in 5" :key="i" class="star" :class="{ active: i <= item.importance }">
                  {{ i <= item.importance ? '★' : '☆' }}
                </text>
              </view>
              <text class="memory-date">
                {{ formatDate(item.created_at) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-spinner"></view>
      <text class="loading-text">
        加载中...
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { MEMORY_TYPE_LABELS } from '@/types/agent';

const agentStore = useAgentStore();

// 页面状态
const loading = ref(false);

// 记忆数据
const memories = computed(() => agentStore.memories);

// 统计数据
const totalMemories = computed(() => memories.value.length);
const gamePreferenceCount = computed(() => 
  memories.value.filter(m => m.memory_type === 'game_preference').length
);
const emotionCount = computed(() => 
  memories.value.filter(m => m.memory_type === 'emotion').length
);

// 分组记忆
const groupedMemories = computed(() => {
  const groups: Record<string, typeof memories.value> = {};
  
  memories.value.forEach(memory => {
    const type = memory.memory_type || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(memory);
  });
  
  // 按重要性排序
  const result = Object.entries(groups).map(([type, items]) => ({
    type,
    items: items.sort((a, b) => b.importance - a.importance)
  }));
  
  // 优先显示重要类型
  const typeOrder = ['game_preference', 'emotion', 'habit', 'relationship', 'other'];
  result.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
  
  return result;
});

// 获取类型图标
const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    game_preference: '🎮',
    emotion: '💭',
    habit: '📝',
    relationship: '💕',
    other: '📌'
  };
  return icons[type] || '📌';
};

// 获取类型名称
const getTypeName = (type: string) => {
  return MEMORY_TYPE_LABELS[type] || '其他';
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

// 初始化
onMounted(async () => {
  loading.value = true;
  try {
    await agentStore.fetchMemories();
  } finally {
    loading.value = false;
  }
});

// 返回
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped lang="scss">
.memories-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1a2e;
}

/* 顶部导航 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #16213e;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.header-left,
.header-right {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-back {
  font-size: 40rpx;
  color: #ffd700;
}

.header-title {
  flex: 1;
  text-align: center;
}

.title-text {
  font-size: 32rpx;
  color: #ffd700;
  font-weight: bold;
}

/* 统计区域 */
.stats-section {
  padding: 30rpx;
}

.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 30rpx;
  background-color: #2a2a4e;
  border-radius: 16rpx;
  border: 1px solid rgba(255, 215, 0, 0.1);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-number {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffd700;
}

.stats-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

.stats-divider {
  width: 1rpx;
  height: 60rpx;
  background-color: rgba(255, 255, 255, 0.1);
}

/* 记忆列表 */
.memory-list {
  flex: 1;
  padding: 0 30rpx 30rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 32rpx;
  color: #ffd700;
  margin-bottom: 20rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #666;
  text-align: center;
  padding: 0 60rpx;
}

/* 记忆分组 */
.memory-group {
  margin-bottom: 40rpx;
}

.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.group-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.group-title {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: bold;
}

.group-count {
  font-size: 24rpx;
  color: #666;
  margin-left: auto;
}

/* 记忆项 */
.group-items {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.memory-item {
  padding: 24rpx;
  background-color: #2a2a4e;
  border-radius: 12rpx;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.memory-content {
  margin-bottom: 16rpx;
}

.memory-text {
  font-size: 28rpx;
  color: #fff;
  line-height: 1.6;
}

.memory-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.importance-stars {
  display: flex;
}

.star {
  font-size: 24rpx;
  color: #555;
  margin-right: 4rpx;
}

.star.active {
  color: #ffd700;
}

.memory-date {
  font-size: 22rpx;
  color: #666;
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(255, 215, 0, 0.3);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #fff;
}
</style>
