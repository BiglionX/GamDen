<script setup lang="ts">
/**
 * 活力值看板页面
 */
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/utils/admin-api';

const VITALITY_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const loading = ref(false);
const stats = ref<any>(null);
const topClubs = ref<any[]>([]);
const trend = ref<any[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const [statsRes, topRes, trendRes] = await Promise.all([
      adminApi.getVitalityStats(),
      adminApi.getVitalityTopClubs(10),
      adminApi.getVitalityTrend(7),
    ]);
    stats.value = statsRes;
    topClubs.value = topRes;
    trend.value = trendRes || [];
  } catch (e) {
    console.error('加载失败', e);
  } finally {
    loading.value = false;
  }
}

function getVitalityIcon(level: string): string {
  return VITALITY_ICONS[level] || '🥉';
}

onMounted(() => {
  loadData();
});

onShow(() => {
  if (!stats.value) {
    loadData();
  }
});
</script>

<template>
  <view class="page-vitality">
    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 内容 -->
    <view v-else-if="stats" class="content">
      <!-- 统计卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <view class="stat-card__value">
            {{ stats.total_clubs || 0 }}
          </view>
          <view class="stat-card__label">
            总俱乐部
          </view>
        </view>
        <view class="stat-card stat-card--highlight">
          <view class="stat-card__value">
            {{ stats.active_clubs || 0 }}
          </view>
          <view class="stat-card__label">
            活跃俱乐部
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-card__value">
            {{ stats.total_members || 0 }}
          </view>
          <view class="stat-card__label">
            总成员
          </view>
        </view>
        <view class="stat-card">
          <view class="stat-card__value">
            {{ stats.avg_vitality || 0 }}
          </view>
          <view class="stat-card__label">
            平均活力
          </view>
        </view>
      </view>

      <!-- 等级分布 -->
      <view class="section">
        <view class="section__title">
          等级分布
        </view>
        <view class="level-bars">
          <view class="level-bar">
            <text class="level-bar__icon">
              {{ VITALITY_ICONS.diamond }}
            </text>
            <view class="level-bar__track">
              <view class="level-bar__fill level-bar__fill--diamond" :style="{ width: `${(stats.diamond_clubs / stats.total_clubs * 100) || 0}%` }"></view>
            </view>
            <text class="level-bar__count">
              {{ stats.diamond_clubs || 0 }}
            </text>
          </view>
          <view class="level-bar">
            <text class="level-bar__icon">
              {{ VITALITY_ICONS.gold }}
            </text>
            <view class="level-bar__track">
              <view class="level-bar__fill level-bar__fill--gold" :style="{ width: `${(stats.gold_clubs / stats.total_clubs * 100) || 0}%` }"></view>
            </view>
            <text class="level-bar__count">
              {{ stats.gold_clubs || 0 }}
            </text>
          </view>
          <view class="level-bar">
            <text class="level-bar__icon">
              {{ VITALITY_ICONS.silver }}
            </text>
            <view class="level-bar__track">
              <view class="level-bar__fill level-bar__fill--silver" :style="{ width: `${(stats.silver_clubs / stats.total_clubs * 100) || 0}%` }"></view>
            </view>
            <text class="level-bar__count">
              {{ stats.silver_clubs || 0 }}
            </text>
          </view>
          <view class="level-bar">
            <text class="level-bar__icon">
              {{ VITALITY_ICONS.bronze }}
            </text>
            <view class="level-bar__track">
              <view class="level-bar__fill level-bar__fill--bronze" :style="{ width: `${(stats.bronze_clubs / stats.total_clubs * 100) || 0}%` }"></view>
            </view>
            <text class="level-bar__count">
              {{ stats.bronze_clubs || 0 }}
            </text>
          </view>
        </view>
      </view>

      <!-- TOP10 排行榜 -->
      <view class="section">
        <view class="section__title">
          活力值 TOP 10
        </view>
        <view class="ranking-list">
          <view v-for="(club, index) in topClubs" :key="club.id" class="ranking-item">
            <view class="ranking-item__rank" :class="`ranking-item__rank--${index + 1}`">
              {{ index + 1 }}
            </view>
            <text class="ranking-item__icon">
              {{ club.icon }}
            </text>
            <view class="ranking-item__info">
              <text class="ranking-item__name">
                {{ club.name }}
              </text>
              <text class="ranking-item__meta">
                {{ club.member_count }}成员
              </text>
            </view>
            <view class="ranking-item__vitality">
              <text>{{ getVitalityIcon(club.vitality_level) }}</text>
              <text>{{ club.vitality }}</text>
            </view>
          </view>
          <view v-if="topClubs.length === 0" class="empty">
            暂无数据
          </view>
        </view>
      </view>

      <!-- 趋势图（简化版） -->
      <view class="section">
        <view class="section__title">
          7天活力变化趋势
        </view>
        <view class="trend-chart">
          <view v-for="(day, index) in trend" :key="index" class="trend-bar">
            <view class="trend-bar__value">
              {{ day.total_delta > 0 ? '+' : '' }}{{ day.total_delta || 0 }}
            </view>
            <view class="trend-bar__track">
              <view
                class="trend-bar__fill"
                :style="{
                  height: `${Math.min(100, Math.abs(day.total_delta || 0) / 100 * 100)}%`,
                  background: day.total_delta >= 0 ? '#4CAF50' : '#F44336'
                }"
              ></view>
            </view>
            <text class="trend-bar__date">
              {{ day.date?.slice(5) || '' }}
            </text>
          </view>
          <view v-if="trend.length === 0" class="empty">
            暂无趋势数据
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-vitality {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 24rpx;
}

.loading {
  text-align: center;
  padding: 120rpx;
  color: $u-tips-color;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.stat-card {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;

  &--highlight {
    border-color: #C9A87C;
  }

  &__value {
    font-size: 48rpx;
    font-weight: 700;
    color: #F5F0E6;
  }

  &__label {
    font-size: 24rpx;
    color: $u-tips-color;
    margin-top: 8rpx;
  }
}

.section {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #F5F0E6;
    margin-bottom: 20rpx;
  }
}

.level-bars {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.level-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;

  &__icon {
    font-size: 32rpx;
    width: 48rpx;
    text-align: center;
  }

  &__track {
    flex: 1;
    height: 16rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8rpx;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 8rpx;
    transition: width 0.3s;

    &--diamond { background: #B9F2FF; }
    &--gold { background: #FFD700; }
    &--silver { background: #C0C0C0; }
    &--bronze { background: #CD7F32; }
  }

  &__count {
    font-size: 24rpx;
    color: $u-tips-color;
    width: 48rpx;
    text-align: right;
  }
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: rgba(201, 168, 124, 0.05);
  border-radius: 8rpx;

  &__rank {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22rpx;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.1);
    color: $u-tips-color;

    &--1 { background: #FFD700; color: #1a1a1a; }
    &--2 { background: #C0C0C0; color: #1a1a1a; }
    &--3 { background: #CD7F32; color: #1a1a1a; }
  }

  &__icon {
    font-size: 36rpx;
    margin-left: 16rpx;
  }

  &__info {
    flex: 1;
    margin-left: 16rpx;
  }

  &__name {
    font-size: 26rpx;
    color: #F5F0E6;
    display: block;
  }

  &__meta {
    font-size: 22rpx;
    color: $u-tips-color;
  }

  &__vitality {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #F5F0E6;
  }
}

.trend-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200rpx;
  padding-top: 20rpx;
}

.trend-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  &__value {
    font-size: 20rpx;
    color: $u-tips-color;
  }

  &__track {
    width: 40rpx;
    height: 120rpx;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4rpx;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &__fill {
    width: 100%;
    border-radius: 4rpx;
    transition: height 0.3s;
  }

  &__date {
    font-size: 18rpx;
    color: $u-tips-color;
  }
}

.empty {
  text-align: center;
  padding: 32rpx;
  color: $u-tips-color;
  font-size: 24rpx;
}
</style>
