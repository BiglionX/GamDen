<script setup lang="ts">
/**
 * 俱乐部列表页（pages/club/index）
 * ----------------------------------------------------------------------
 * 功能：
 *   1. 展示所有俱乐部卡片（游戏名称、成员数、今日新帖数）
 *   2. 搜索框：按游戏名称 / 俱乐部名称实时筛选
 *   3. 点击进入俱乐部详情（pages/club/detail）
 *
 * 数据来源：
 *   - 复用 useClubChatStore.searchClubs()（内部 mock，后续接 /clubs/list）
 */
import { computed, ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useClubChatStore } from '@/stores/club-chat';
import type { Club } from '@/types/club';

const chatStore = useClubChatStore();

const keyword = ref('');
const refreshing = ref(false);

// 计算属性：按关键字过滤
const filteredClubs = computed<Club[]>(() => {
  return chatStore.searchClubs(keyword.value);
});

// 搜索回调（兼容 u-search 的 @search）
function handleSearch(kw: string) {
  keyword.value = kw;
}

// 实时输入（u-search v-model 已绑定，额外兜底）
function handleInput(kw: string) {
  keyword.value = kw;
}

// 清空关键字
function clearKeyword() {
  keyword.value = '';
}

// 点击卡片 → 跳详情
function goDetail(club: Club) {
  uni.navigateTo({ url: `/pages/club/detail?id=${club.id}` });
}

// 下拉刷新
async function handleRefresh() {
  refreshing.value = true;
  try {
    // 真实接入后：await http.get('/clubs/list', { keyword: keyword.value })
    await new Promise((r) => setTimeout(r, 400));
    uni.showToast({ title: '已刷新', icon: 'none', duration: 800 });
  } finally {
    refreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

onPullDownRefresh(handleRefresh);
onShow(() => {
  // 每次回到列表时重新拉（保证新帖数等实时）
  // 真实接入后在此调 searchClubs 重新拉
});
</script>

<template>
  <view class="page-club">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <u-search
        :model-value="keyword"
        placeholder="搜索游戏名 / 俱乐部名"
        :show-action="false"
        bg-color="#262D27"
        color="#F5F0E6"
        placeholder-color="#A89E85"
        clearable
        @search="handleSearch"
        @input="handleInput"
        @clear="clearKeyword"
      />
    </view>

    <!-- 结果统计 -->
    <view class="result-bar">
      <text class="result-bar__text">
        {{ keyword ? `匹配到 ${filteredClubs.length} 个俱乐部` : `共 ${filteredClubs.length} 个俱乐部` }}
      </text>
    </view>

    <!-- 俱乐部列表 -->
    <view v-if="filteredClubs.length > 0" class="club-list">
      <view
        v-for="club in filteredClubs"
        :key="club.id"
        class="club-card"
        @tap="goDetail(club)"
      >
        <view class="club-card__icon">{{ club.icon }}</view>
        <view class="club-card__body">
          <view class="club-card__header">
            <text class="club-card__name">{{ club.name }}</text>
            <u-tag :text="club.gameTag" type="warning" size="mini" plain />
          </view>
          <text class="club-card__desc">{{ club.description }}</text>
          <view class="club-card__meta">
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">👥</text>
              {{ club.memberCount.toLocaleString() }} 成员
            </text>
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">📝</text>
              今日 +{{ club.todayNewPosts }}
            </text>
          </view>
        </view>
        <view class="club-card__chevron">
          <text>›</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else class="empty">
      <text class="empty__icon">🛖</text>
      <text class="empty__text">未找到匹配 "{{ keyword }}" 的俱乐部</text>
      <view class="empty__btn" @tap="clearKeyword">
        <text>清空搜索</text>
      </view>
    </view>

    <!-- 下拉刷新指示 -->
    <view v-if="refreshing" class="refresh-tip">
      <text>刷新中...</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-club {
  min-height: 100vh;
  background: $u-bg-color;
  // 巢穴暗纹背景
  background-image:
    radial-gradient(circle at 20% 20%, rgba(201, 168, 124, 0.04) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 80%, rgba(201, 168, 124, 0.04) 1rpx, transparent 1rpx);
  background-size: 64rpx 64rpx;
  padding: 24rpx 32rpx 64rpx;
}

.search-bar {
  margin-bottom: 16rpx;
}

.result-bar {
  padding: 8rpx 4rpx 24rpx;
  &__text {
    font-size: 24rpx;
    color: $u-tips-color;
  }
}

.club-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.club-card {
  display: flex;
  align-items: stretch;
  background: linear-gradient(180deg, $u-bg-color-light 0%, rgba(38, 45, 39, 0.7) 100%);
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 28rpx;
  gap: 24rpx;
  position: relative;
  overflow: hidden;
  // 古风暗纹
  background-image:
    radial-gradient(circle at 0% 0%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx),
    radial-gradient(circle at 100% 100%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx);
  background-size: 32rpx 32rpx;
  transition: transform 0.2s, box-shadow 0.2s;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 0 0 4rpx rgba(201, 168, 124, 0.15);
  }

  // 左侧金色装饰条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 16rpx;
    bottom: 16rpx;
    width: 6rpx;
    background: linear-gradient(180deg, #C9A87C, #A8895F, #C9A87C);
    border-radius: 0 4rpx 4rpx 0;
  }

  &__icon {
    font-size: 64rpx;
    width: 96rpx;
    height: 96rpx;
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.2), rgba(201, 168, 124, 0.05));
    border: 1rpx solid rgba(201, 168, 124, 0.4);
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
    gap: 16rpx;
    flex-wrap: wrap;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $u-main-color;
    letter-spacing: 1rpx;
    max-width: 380rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    font-size: 26rpx;
    color: $u-tips-color;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  &__meta {
    display: flex;
    gap: 32rpx;
    margin-top: 4rpx;
  }

  &__meta-item {
    font-size: 24rpx;
    color: $u-content-color;
    display: flex;
    align-items: center;
    gap: 6rpx;
  }
  &__meta-icon {
    font-size: 22rpx;
  }

  &__chevron {
    width: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text {
      font-size: 40rpx;
      color: $u-tips-color;
      opacity: 0.6;
    }
  }
}

.empty {
  padding: 120rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  &__icon {
    font-size: 96rpx;
    opacity: 0.5;
  }
  &__text {
    font-size: 28rpx;
    color: $u-tips-color;
    text-align: center;
  }
  &__btn {
    margin-top: 16rpx;
    padding: 16rpx 48rpx;
    background: rgba(201, 168, 124, 0.15);
    border: 1rpx solid rgba(201, 168, 124, 0.5);
    border-radius: 32rpx;
    color: #C9A87C;
    font-size: 26rpx;
    &:active {
      background: rgba(201, 168, 124, 0.3);
    }
  }
}

.refresh-tip {
  text-align: center;
  padding: 24rpx 0;
  color: $u-tips-color;
  font-size: 22rpx;
}
</style>
