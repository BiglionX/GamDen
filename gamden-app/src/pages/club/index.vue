<script setup lang="ts">
/**
 * 俱乐部列表页（pages/club/index）
 * ----------------------------------------------------------------------
 * 功能：
 *   1. 俱乐部分类Tab（全部/默认/兴趣/游戏/提议）
 *   2. 热门标签筛选
 *   3. 活力值徽章展示
 *   4. 搜索功能
 *   5. 提议入口按钮
 */
import { computed, ref, onMounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { clubApi } from '@/utils/club-api';
import type { ClubUpgrade, ClubType, VITALITY_LEVEL_CONFIG } from '@/types/club';

const VITALITY_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const CLUB_TYPE_TABS = [
  { key: 'all', name: '全部', icon: '🏠' },
  { key: 'default', name: '默认', icon: '🍵' },
  { key: 'interest', name: '兴趣', icon: '🎯' },
  { key: 'game', name: '游戏', icon: '🎮' },
  { key: 'custom', name: '提议', icon: '✨' },
];

const HOT_TAGS = ['PVP', '竞技', '休闲', '社交', '剧情', 'RPG', '建造', '技术'];

// 状态
const activeTab = ref<string>('all');
const activeTag = ref<string>('');
const keyword = ref('');
const refreshing = ref(false);
const loading = ref(false);
const clubs = ref<ClubUpgrade[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 20;

// 过滤后的俱乐部
const filteredClubs = computed(() => {
  return clubs.value;
});

// Tab切换
function onTabChange(tab: string) {
  activeTab.value = tab;
  activeTag.value = '';
  page.value = 1;
  loadClubs(true);
}

// 标签筛选
function onTagSelect(tag: string) {
  activeTag.value = activeTag.value === tag ? '' : tag;
  page.value = 1;
  loadClubs(true);
}

// 搜索
function onSearch() {
  page.value = 1;
  loadClubs(true);
}

// 加载俱乐部
async function loadClubs(reset = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    const params: any = {
      page: page.value,
      limit,
      sort_by: 'vitality',
      sort_order: 'desc',
    };

    if (activeTab.value !== 'all') {
      params.club_type = activeTab.value;
    }

    if (activeTag.value) {
      params.tags = [activeTag.value];
    }

    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim();
    }

    const res = await clubApi.getClubList(params);

    if (reset) {
      clubs.value = res.clubs;
    } else {
      clubs.value = [...clubs.value, ...res.clubs];
    }
    total.value = res.total;
  } catch (e) {
    console.error('加载俱乐部失败', e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    refreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

// 下拉刷新
async function onRefresh() {
  refreshing.value = true;
  page.value = 1;
  await loadClubs(true);
}

// 触底加载
function onReachBottom() {
  if (clubs.value.length < total.value) {
    page.value++;
    loadClubs(false);
  }
}

// 跳转到详情
function goDetail(club: ClubUpgrade) {
  uni.navigateTo({ url: `/pages/club/detail?id=${club.id}` });
}

// 跳转到提议页
function goProposal() {
  uni.navigateTo({ url: '/pages/club/proposal' });
}

// 搜索
function handleSearch() {
  onSearch();
}

// 清空搜索
function clearKeyword() {
  keyword.value = '';
  onSearch();
}

// 输入处理
function handleInput(val: string) {
  keyword.value = val;
}

// 获取活力值图标
function getVitalityIcon(level: string): string {
  return VITALITY_ICONS[level] || '🥉';
}

onMounted(() => {
  loadClubs(true);
});

onPullDownRefresh(onRefresh);

onShow(() => {
  // 每次回到列表时重新加载
  if (clubs.value.length === 0) {
    loadClubs(true);
  }
});
</script>

<template>
  <view class="page-club">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <u-search
        v-model="keyword"
        placeholder="搜索俱乐部名称"
        :show-action="true"
        bg-color="#262D27"
        color="#F5F0E6"
        placeholder-color="#A89E85"
        clearable
        @search="onSearch"
        @custom="onSearch"
      />
    </view>

    <!-- 分类Tab -->
    <view class="tabs">
      <view
        v-for="tab in CLUB_TYPE_TABS"
        :key="tab.key"
        class="tabs__item"
        :class="{ 'tabs__item--active': activeTab === tab.key }"
        @tap="onTabChange(tab.key)"
      >
        <text class="tabs__icon">
          {{ tab.icon }}
        </text>
        <text class="tabs__name">
          {{ tab.name }}
        </text>
      </view>
    </view>

    <!-- 热门标签 -->
    <view v-if="activeTab === 'all' || activeTab === 'interest' || activeTab === 'game'" class="tags">
      <view class="tags__scroll">
        <view
          v-for="tag in HOT_TAGS"
          :key="tag"
          class="tags__item"
          :class="{ 'tags__item--active': activeTag === tag }"
          @tap="onTagSelect(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- 结果统计 -->
    <view class="result-bar">
      <text class="result-bar__text">
        {{ keyword || activeTag ? `匹配到 ${total} 个俱乐部` : `共 ${total} 个俱乐部` }}
      </text>
      <view class="result-bar__proposal" @tap="goProposal">
        <text>提议新茶摊</text>
        <text class="arrow">
          ›
        </text>
      </view>
    </view>

    <!-- 俱乐部列表 -->
    <scroll-view
      class="club-list"
      scroll-y
      @scrolltolower="onReachBottom"
    >
      <view
        v-for="club in filteredClubs"
        :key="club.id"
        class="club-card"
        @tap="goDetail(club)"
      >
        <view class="club-card__icon">
          {{ club.icon }}
        </view>
        <view class="club-card__body">
          <view class="club-card__header">
            <text class="club-card__name">
              {{ club.name }}
            </text>
            <text class="club-card__vitality">
              {{ getVitalityIcon(club.vitality_level) }}
            </text>
          </view>
          <view v-if="club.tags && club.tags.length > 0" class="club-card__tags">
            <text v-for="tag in club.tags.slice(0, 3)" :key="tag" class="club-card__tag">
              {{ tag }}
            </text>
          </view>
          <text class="club-card__desc">
            {{ club.description }}
          </text>
          <view class="club-card__meta">
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">
                👥
              </text>
              {{ club.member_count.toLocaleString() }} 成员
            </text>
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">
                ⚡
              </text>
              活力 {{ club.vitality }}
            </text>
          </view>
        </view>
        <view class="club-card__chevron">
          <text>›</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">
        <text>加载中...</text>
      </view>

      <!-- 没有更多 -->
      <view v-else-if="filteredClubs.length >= total && total > 0" class="no-more">
        <text>没有更多了</text>
      </view>

      <!-- 空态 -->
      <view v-if="!loading && filteredClubs.length === 0" class="empty">
        <text class="empty__icon">
          🛖
        </text>
        <text class="empty__text">
          未找到匹配的俱乐部
        </text>
        <view class="empty__btn" @tap="goProposal">
          <text>发起提议</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

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
            <text class="club-card__vitality">{{ getVitalityIcon(club.vitality_level) }}</text>
          </view>
          <view class="club-card__tags" v-if="club.tags && club.tags.length > 0">
            <text v-for="tag in club.tags.slice(0, 3)" :key="tag" class="club-card__tag">{{ tag }}</text>
          </view>
          <text class="club-card__desc">{{ club.description }}</text>
          <view class="club-card__meta">
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">👥</text>
              {{ club.member_count.toLocaleString() }} 成员
            </text>
            <text class="club-card__meta-item">
              <text class="club-card__meta-icon">⚡</text>
              活力 {{ club.vitality }}
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
  background-image:
    radial-gradient(circle at 20% 20%, rgba(201, 168, 124, 0.04) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 80%, rgba(201, 168, 124, 0.04) 1rpx, transparent 1rpx);
  background-size: 64rpx 64rpx;
}

.search-bar {
  padding: 24rpx 32rpx 16rpx;
}

.tabs {
  display: flex;
  padding: 0 24rpx 16rpx;
  gap: 16rpx;
  overflow-x: auto;

  &__item {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    background: rgba(201, 168, 124, 0.1);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 32rpx;
    white-space: nowrap;
    transition: all 0.2s;

    &--active {
      background: rgba(201, 168, 124, 0.25);
      border-color: #C9A87C;
    }
  }

  &__icon {
    font-size: 24rpx;
  }

  &__name {
    font-size: 26rpx;
    color: #F5F0E6;
  }
}

.tags {
  padding: 0 24rpx 16rpx;

  &__scroll {
    display: flex;
    gap: 16rpx;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__item {
    padding: 8rpx 20rpx;
    background: rgba(201, 168, 124, 0.08);
    border: 1rpx solid rgba(201, 168, 124, 0.2);
    border-radius: 24rpx;
    font-size: 24rpx;
    color: #A89E85;
    white-space: nowrap;

    &--active {
      background: rgba(201, 168, 124, 0.2);
      border-color: #C9A87C;
      color: #C9A87C;
    }
  }
}

.result-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 32rpx 16rpx;

  &__text {
    font-size: 24rpx;
    color: $u-tips-color;
  }

  &__proposal {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 26rpx;
    color: #C9A87C;
    padding: 8rpx 16rpx;
    background: rgba(201, 168, 124, 0.1);
    border-radius: 20rpx;

    .arrow {
      font-size: 32rpx;
    }
  }
}

.club-list {
  height: calc(100vh - 400rpx);
  padding: 0 32rpx 64rpx;
}

.club-card {
  display: flex;
  align-items: stretch;
  background: linear-gradient(180deg, $u-bg-color-light 0%, rgba(38, 45, 39, 0.7) 100%);
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 28rpx;
  gap: 24rpx;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
  background-image:
    radial-gradient(circle at 0% 0%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx),
    radial-gradient(circle at 100% 100%, rgba(201, 168, 124, 0.08) 1rpx, transparent 1rpx);
  background-size: 32rpx 32rpx;

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
    gap: 12rpx;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $u-main-color;
    letter-spacing: 1rpx;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__vitality {
    font-size: 32rpx;
  }

  &__tags {
    display: flex;
    gap: 12rpx;
    flex-wrap: wrap;
  }

  &__tag {
    font-size: 20rpx;
    color: #C9A87C;
    background: rgba(201, 168, 124, 0.1);
    padding: 4rpx 12rpx;
    border-radius: 12rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: $u-tips-color;
    line-height: 1.4;
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
  }
}

.loading-more,
.no-more {
  text-align: center;
  padding: 32rpx;
  color: $u-tips-color;
  font-size: 24rpx;
}
</style>

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
