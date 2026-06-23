<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useInviteStore } from '@/stores/invite';
import { useCelebrationStore } from '@/stores/celebration';
import { storeToRefs } from 'pinia';
import RedDotBadge from '@/components/celebration/RedDotBadge.vue';

const userStore = useUserStore();
const inviteStore = useInviteStore();
const celebrationStore = useCelebrationStore();

const { stats, loading } = storeToRefs(inviteStore);
const { profileRedDot } = storeToRefs(celebrationStore);

const refreshing = ref(false);

/**
 * 是否展示"小程序"入口的红点：
 *  - 用户已解锁小程序，但还没点击进入过
 *  - 由 celebration store 维护
 */
const showMiniProgramRedDot = computed(() => {
  if (!inviteStore.miniProgramUnlocked) return false;
  return profileRedDot.value;
});

onMounted(async () => {
  if (!userStore.isGuest) {
    await inviteStore.loadStats();
  }
});

/** 下拉刷新 */
async function handleRefresh() {
  if (userStore.isGuest) return;
  refreshing.value = true;
  try {
    await inviteStore.loadStats();
  } finally {
    refreshing.value = false;
  }
}

/** 复制邀请码 */
async function handleCopyCode() {
  await inviteStore.copyInviteCode();
}

/** 跳到分享海报 */
function handleSharePoster() {
  uni.navigateTo({ url: '/pages/invite/poster' });
}

/** 跳到小程序码（清除红点） */
function handleMiniProgram() {
  celebrationStore.clearProfileRedDot();
  uni.navigateTo({ url: '/pages/invite/mini-program' });
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '退出后需要重新入驻',
    success: (res) => {
      if (res.confirm) {
        userStore.logout();
        inviteStore.reset();
        uni.reLaunch({ url: '/pages/map/index' });
      }
    },
  });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' });
}
</script>

<template>
  <view class="page-profile">
    <!-- 头部用户信息 -->
    <view class="profile-header">
      <view class="profile-header__avatar">
        <text v-if="!userStore.profile?.avatar">{{ userStore.profile?.nickname?.charAt(0) ?? '?' }}</text>
        <text v-else>{{ userStore.profile.avatar }}</text>
      </view>
      <view class="profile-header__info">
        <text class="profile-header__name">{{ userStore.profile?.nickname ?? '未入驻' }}</text>
        <text class="profile-header__role">
          <text v-if="userStore.isGuest">访客模式</text>
          <text v-else-if="userStore.profile?.guardianType === 'mechanical'">机械师领地</text>
          <text v-else-if="userStore.profile?.guardianType === 'elf'">精灵领地</text>
          <text v-else-if="userStore.profile?.guardianType === 'astrologer'">占星师领地</text>
          <text v-else>注册用户</text>
        </text>
      </view>
    </view>

    <!-- 游客模式：入驻入口 -->
    <view v-if="userStore.isGuest" class="entry-card" @tap="goLogin">
      <text class="entry-card__title">立即入驻巢穴</text>
      <text class="entry-card__desc">选择守护灵，开启你的游戏社交圈</text>
      <u-button type="primary" size="small" text="去入驻" />
    </view>

    <!-- 注册用户：领地状态 -->
    <view v-else class="territory-stats">
      <view class="stat-item">
        <text class="stat-item__value">Lv.1</text>
        <text class="stat-item__label">领地等级</text>
      </view>
      <view class="stat-item">
        <text class="stat-item__value">{{ stats?.totalInvited ?? 0 }}</text>
        <text class="stat-item__label">邀请人数</text>
      </view>
      <view class="stat-item">
        <text class="stat-item__value">2580</text>
        <text class="stat-item__label">金币余额</text>
      </view>
    </view>

    <!-- 邀请裂变卡片（注册用户专属） -->
    <view v-if="!userStore.isGuest" class="invite-card">
      <view class="invite-card__header">
        <view class="invite-card__title-row">
          <text class="invite-card__title">🎟️ 邀请巢友</text>
          <view class="invite-card__refresh" @tap="handleRefresh">
            <text class="invite-card__refresh-icon" :class="{ 'is-spinning': refreshing }">⟳</text>
          </view>
        </view>
        <text class="invite-card__sub">邀请 3 位巢友，解锁专属小程序码</text>
      </view>

      <!-- 邀请码 + 复制 -->
      <view class="invite-card__code-row">
        <view class="invite-card__code-box">
          <text class="invite-card__code-label">我的邀请码</text>
          <text class="invite-card__code">{{ stats?.code ?? '————' }}</text>
        </view>
        <view class="invite-card__copy-btn" @tap="handleCopyCode">
          <text>复制</text>
        </view>
      </view>

      <!-- 进度条 -->
      <view class="invite-card__progress">
        <view class="invite-card__progress-info">
          <text class="invite-card__progress-stat">
            {{ stats?.totalInvited ?? 0 }} / {{ stats?.unlockThreshold ?? 3 }}
          </text>
          <text class="invite-card__progress-tip">
            还差 {{ inviteStore.remainingToUnlock }} 位
          </text>
        </view>
        <view class="invite-card__progress-bar">
          <view
            class="invite-card__progress-bar-fill"
            :style="{ width: Math.round(inviteStore.unlockProgress * 100) + '%' }"
          />
        </view>
      </view>

      <!-- 统计：今日/本周 -->
      <view class="invite-card__stats">
        <view class="invite-card__stat-item">
          <text class="invite-card__stat-num">{{ stats?.todayInvited ?? 0 }}</text>
          <text class="invite-card__stat-label">今日</text>
        </view>
        <view class="invite-card__stat-divider" />
        <view class="invite-card__stat-item">
          <text class="invite-card__stat-num">{{ stats?.weekInvited ?? 0 }}</text>
          <text class="invite-card__stat-label">本周</text>
        </view>
        <view class="invite-card__stat-divider" />
        <view class="invite-card__stat-item">
          <text class="invite-card__stat-num">{{ stats?.totalInvited ?? 0 }}</text>
          <text class="invite-card__stat-label">总计</text>
        </view>
      </view>

      <!-- 按钮 -->
      <view class="invite-card__actions">
        <view class="invite-card__btn invite-card__btn--primary" @tap="handleSharePoster">
          <text>🎨 生成海报</text>
        </view>
        <view
          class="invite-card__btn"
          :class="{ 'invite-card__btn--ghost': !inviteStore.miniProgramUnlocked }"
          @tap="handleMiniProgram"
        >
          <text>{{ inviteStore.miniProgramUnlocked ? '📱 我的小程序' : '🔒 小程序（未解锁）' }}</text>
          <RedDotBadge
            v-if="showMiniProgramRedDot"
            :show="true"
            :offset-x="-8"
            :offset-y="-6"
          />
        </view>
      </view>
    </view>

    <!-- 顶部全局红点：未读小程序资格提示（覆盖"我的小程序"入口） -->
    <view v-if="showMiniProgramRedDot" class="profile-reddot-banner" @tap="handleMiniProgram">
      <text class="profile-reddot-banner__icon">🎉</text>
      <view class="profile-reddot-banner__body">
        <text class="profile-reddot-banner__title">你解锁了个人专属小程序！</text>
        <text class="profile-reddot-banner__desc">点击查看你的小程序码</text>
      </view>
      <text class="profile-reddot-banner__arrow">›</text>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item">
        <text class="menu-item__icon">📜</text>
        <text class="menu-item__label">我的帖子</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item">
        <text class="menu-item__icon">🛍️</text>
        <text class="menu-item__label">兑换记录</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item">
        <text class="menu-item__icon">⚙️</text>
        <text class="menu-item__label">设置</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view v-if="!userStore.isGuest" class="menu-item menu-item--danger" @tap="handleLogout">
        <text class="menu-item__icon">🚪</text>
        <text class="menu-item__label">退出登录</text>
        <text class="menu-item__arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-profile {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 24rpx 32rpx 200rpx;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 32rpx;
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  margin-bottom: 32rpx;
  &__avatar {
    width: 128rpx;
    height: 128rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, $u-primary 0%, $u-primary-dark 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    color: $u-bg-color;
    font-weight: 600;
  }
  &__info { flex: 1; }
  &__name { font-size: 40rpx; color: $u-main-color; font-weight: 600; display: block; }
  &__role { font-size: 26rpx; color: $u-tips-color; margin-top: 8rpx; display: block; }
}

.entry-card {
  background: linear-gradient(135deg, rgba(201, 168, 124, 0.15) 0%, rgba(201, 168, 124, 0.05) 100%);
  border: 1rpx dashed $u-primary;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  &__title { font-size: 32rpx; color: $u-primary; font-weight: 600; }
  &__desc { font-size: 24rpx; color: $u-tips-color; }
}

.territory-stats {
  display: flex;
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 32rpx 16rpx;
  margin-bottom: 32rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  &__value { font-size: 36rpx; color: $u-primary; font-weight: 600; }
  &__label { font-size: 22rpx; color: $u-tips-color; margin-top: 8rpx; }
}

/* ===== 邀请卡片 ===== */
.invite-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid rgba(201, 168, 124, 0.4);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);

  &__header { margin-bottom: 24rpx; }
  &__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
  }
  &__title {
    font-size: 32rpx;
    color: $u-main-color;
    font-weight: 700;
  }
  &__refresh {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    &:active { transform: scale(0.9); }
  }
  &__refresh-icon {
    font-size: 32rpx;
    color: $u-primary;
    &.is-spinning { animation: refresh-spin 1s linear infinite; }
  }
  &__sub {
    font-size: 22rpx;
    color: $u-tips-color;
  }

  &__code-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12rpx;
    padding: 20rpx 24rpx;
    margin-bottom: 24rpx;
  }
  &__code-box { flex: 1; min-width: 0; }
  &__code-label {
    display: block;
    font-size: 20rpx;
    color: $u-tips-color;
    margin-bottom: 6rpx;
  }
  &__code {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: $u-primary;
    font-family: 'Courier New', monospace;
    letter-spacing: 4rpx;
  }
  &__copy-btn {
    padding: 14rpx 28rpx;
    background: linear-gradient(135deg, $u-primary 0%, $u-primary-dark 100%);
    color: $u-bg-color;
    border-radius: 28rpx;
    font-size: 24rpx;
    font-weight: 600;
    transition: transform 0.15s;
    &:active { transform: scale(0.94); }
  }

  &__progress { margin-bottom: 24rpx; }
  &__progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }
  &__progress-stat {
    font-size: 28rpx;
    font-weight: 700;
    color: $u-primary;
  }
  &__progress-tip {
    font-size: 22rpx;
    color: $u-tips-color;
  }
  &__progress-bar {
    height: 12rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 6rpx;
    overflow: hidden;
  }
  &__progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, $u-primary 0%, #5a8f6c 100%);
    border-radius: 6rpx;
    transition: width 0.4s ease;
  }

  &__stats {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12rpx;
    padding: 20rpx 16rpx;
    margin-bottom: 24rpx;
  }
  &__stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  &__stat-num {
    font-size: 32rpx;
    font-weight: 700;
    color: $u-main-color;
  }
  &__stat-label {
    font-size: 20rpx;
    color: $u-tips-color;
    margin-top: 4rpx;
  }
  &__stat-divider {
    width: 1rpx;
    height: 48rpx;
    background: rgba(201, 168, 124, 0.2);
    margin: 0 8rpx;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 26rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;

    &--primary {
      background: linear-gradient(135deg, $u-primary 0%, $u-primary-dark 100%);
      color: $u-bg-color;
      box-shadow: 0 2rpx 8rpx rgba(201, 168, 124, 0.35);
    }
    &--ghost {
      background: transparent;
      color: $u-tips-color;
      border: 1rpx solid rgba(201, 168, 124, 0.3);
    }
    &:active { transform: scale(0.96); }
  }
}

@keyframes refresh-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.menu-list {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid $u-border-color;
  &:last-child { border-bottom: none; }
  &__icon { font-size: 36rpx; width: 48rpx; text-align: center; }
  &__label { flex: 1; font-size: 30rpx; color: $u-main-color; }
  &__arrow { font-size: 36rpx; color: $u-tips-color; }
  &--danger &__label { color: $u-warning; }
}

/* ===== 解锁未读红点 banner ===== */
.profile-reddot-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, rgba(201, 168, 124, 0.18) 0%, rgba(90, 143, 108, 0.12) 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.5);
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.18);
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
    opacity: 0.92;
  }

  &__icon {
    font-size: 48rpx;
    line-height: 1;
  }
  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  &__title {
    color: $u-primary;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
  }
  &__desc {
    color: $u-tips-color;
    font-size: 22rpx;
    margin-top: 6rpx;
  }
  &__arrow {
    color: $u-primary;
    font-size: 40rpx;
    line-height: 1;
  }
}
</style>
