<script setup lang="ts">
/**
 * 俱乐部管理后台页面
 */
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/utils/admin-api';
import type { ClubUpgrade } from '@/types/club';

const VITALITY_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const loading = ref(false);
const clubs = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 20;

// 筛选
const statusFilter = ref('');
const typeFilter = ref('');

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'dormant', label: '休眠' },
  { value: 'archived', label: '归档' },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'default', label: '默认' },
  { value: 'interest', label: '兴趣' },
  { value: 'game', label: '游戏' },
  { value: 'custom', label: '自定义' },
];

async function loadClubs(reset = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    const params: any = {
      page: page.value,
      limit,
    };
    if (statusFilter.value) params.status = statusFilter.value;
    if (typeFilter.value) params.club_type = typeFilter.value;

    const res = await adminApi.getClubList(params);
    if (reset) {
      clubs.value = res.clubs;
    } else {
      clubs.value = [...clubs.value, ...res.clubs];
    }
    total.value = res.total;
  } catch (e) {
    console.error('加载失败', e);
  } finally {
    loading.value = false;
  }
}

function onRefresh() {
  page.value = 1;
  loadClubs(true);
}

function onReachBottom() {
  if (clubs.value.length < total.value) {
    page.value++;
    loadClubs(false);
  }
}

function onStatusChange() {
  page.value = 1;
  loadClubs(true);
}

function onTypeChange() {
  page.value = 1;
  loadClubs(true);
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/admin/club-detail?id=${id}` });
}

function getVitalityIcon(level: string): string {
  return VITALITY_ICONS[level] || '🥉';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#4CAF50',
    dormant: '#FFC107',
    archived: '#9E9E9E',
  };
  return colors[status] || '#9E9E9E';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    active: '活跃',
    dormant: '休眠',
    archived: '归档',
  };
  return texts[status] || status;
}

onMounted(() => {
  loadClubs(true);
});

onShow(() => {
  if (clubs.value.length === 0) {
    loadClubs(true);
  }
});
</script>

<template>
  <view class="page-clubs">
    <!-- 筛选栏 -->
    <view class="filters">
      <picker :value="statusFilter" :range="STATUS_OPTIONS" range-key="label" @change="(e: any) => { statusFilter = e.detail.value ? STATUS_OPTIONS[e.detail.value].value : ''; onStatusChange(); }">
        <view class="filter-item">
          <text>{{ statusFilter ? STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label : '全部状态' }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
      <picker :value="typeFilter" :range="TYPE_OPTIONS" range-key="label" @change="(e: any) => { typeFilter = e.detail.value ? TYPE_OPTIONS[e.detail.value].value : ''; onTypeChange(); }">
        <view class="filter-item">
          <text>{{ typeFilter ? TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label : '全部类型' }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 统计 -->
    <view class="stats">
      <text>共 {{ total }} 个俱乐部</text>
    </view>

    <!-- 列表 -->
    <scroll-view class="list" scroll-y @scrolltolower="onReachBottom">
      <view v-for="club in clubs" :key="club.id" class="club-item" @tap="goDetail(club.id)">
        <view class="club-item__icon">{{ club.icon }}</view>
        <view class="club-item__body">
          <view class="club-item__header">
            <text class="club-item__name">{{ club.name }}</text>
            <text class="club-item__vitality">{{ getVitalityIcon(club.vitality_level) }}</text>
          </view>
          <view class="club-item__meta">
            <text class="club-item__type">{{ club.club_type }}</text>
            <text class="club-item__status" :style="{ color: getStatusColor(club.status) }">
              {{ getStatusText(club.status) }}
            </text>
            <text>成员 {{ club.member_count }}</text>
            <text>活力 {{ club.vitality }}</text>
          </view>
        </view>
        <text class="club-item__arrow">›</text>
      </view>

      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="clubs.length >= total && total > 0" class="no-more">没有更多了</view>
      <view v-else-if="clubs.length === 0" class="empty">暂无数据</view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page-clubs {
  min-height: 100vh;
  background: $u-bg-color;
}

.filters {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  background: $u-bg-color-light;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: rgba(201, 168, 124, 0.1);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #F5F0E6;

  .arrow {
    font-size: 18rpx;
    color: #A89E85;
  }
}

.stats {
  padding: 0 24rpx 16rpx;
  font-size: 24rpx;
  color: $u-tips-color;
}

.list {
  height: calc(100vh - 200rpx);
  padding: 0 24rpx;
}

.club-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 12rpx;
  margin-bottom: 16rpx;

  &__icon {
    font-size: 48rpx;
    margin-right: 20rpx;
  }

  &__body {
    flex: 1;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: #F5F0E6;
  }

  &__vitality {
    font-size: 24rpx;
  }

  &__meta {
    display: flex;
    gap: 16rpx;
    font-size: 22rpx;
    color: $u-tips-color;
  }

  &__type {
    background: rgba(201, 168, 124, 0.1);
    padding: 2rpx 8rpx;
    border-radius: 8rpx;
  }

  &__arrow {
    font-size: 32rpx;
    color: $u-tips-color;
    opacity: 0.5;
  }
}

.loading,
.no-more,
.empty {
  text-align: center;
  padding: 32rpx;
  color: $u-tips-color;
  font-size: 24rpx;
}
</style>
