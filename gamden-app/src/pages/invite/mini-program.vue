<script setup lang="ts">
/**
 * 我的小程序 —— 中心页
 *
 * 6 种状态展示完全不同的 UI：
 *  1. not_started  → NotStartedView  (尚未申请)
 *  2. certifying   → CertifyingView  (认证中)
 *  3. certified    → CertifiedView   (认证通过, 待部署)
 *  4. deploying    → 过渡态，自动跳转到 reviewing (通常几秒)
 *  5. reviewing    → ReviewingView   (代码审核中)
 *  6. online       → OnlineView      (已上线)
 *
 * 未解锁资格时展示引导卡片（去邀请 3 位好友）。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { useInviteStore } from '@/stores/invite';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';
import type { MiniProgramStatus } from '@/types/mini-program';

import StatusBadge from '@/components/mini-program/StatusBadge.vue';
import NotStartedView from '@/components/mini-program/NotStartedView.vue';
import CertifyingView from '@/components/mini-program/CertifyingView.vue';
import CertifiedView from '@/components/mini-program/CertifiedView.vue';
import ReviewingView from '@/components/mini-program/ReviewingView.vue';
import OnlineView from '@/components/mini-program/OnlineView.vue';
import HelpCenterSheet from '@/components/mini-program/HelpCenterSheet.vue';
import { track, TrackEvent } from '@/utils/track';

const userStore = useUserStore();
const inviteStore = useInviteStore();
const store = useUserMiniProgramStore();

const { record, status, loading, statusDisplay, progressPercent, unlocked } =
  storeToRefs(store);

const statusBarHeight = ref(20);
const navBarHeight = ref(44);
const showAbandon = ref(false);

/** 教程与帮助 sheet 引用（用于从 NotStartedView 的"查看教程"事件中打开） */
const helpSheetRef = ref<InstanceType<typeof HelpCenterSheet> | null>(null);

const currentStatus = computed<MiniProgramStatus>(() => status.value);

/**
 * 部署过渡态（deploying）处理
 * - 用户在 certified 视图提交 AppID 后进入 deploying 状态
 * - 后端会立即推进到 reviewing
 * - 前端轮询最多 5 次，每次 1s
 */
const deployingPollCount = ref(0);
const MAX_DEPLOYING_POLLS = 5;

async function pollDeploying(): Promise<void> {
  if (currentStatus.value !== 'deploying') return;
  if (deployingPollCount.value >= MAX_DEPLOYING_POLLS) return;
  deployingPollCount.value += 1;
  await new Promise((r) => setTimeout(r, 1000));
  if (currentStatus.value === 'deploying') {
    await store.fetchStatus(true);
    if (currentStatus.value === 'deploying') {
      await pollDeploying();
    }
  }
}

watch(currentStatus, (s) => {
  if (s === 'deploying') {
    deployingPollCount.value = 0;
    void pollDeploying();
  }
});

onMounted(async () => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight ?? 20;
  } catch {
    /* ignore */
  }
  // 拉取小程序状态
  await store.fetchStatus();
  // 拉取邀请统计（用于未解锁态的引导）
  if (userStore.profile?.id && !userStore.isGuest) {
    await inviteStore.loadStats().catch(() => {/* 忽略 */});
  }
  // 预加载教程
  void store.fetchTutorials();
});

onShow(async () => {
  // 回到页面时刷新状态（用户在外部操作后回来时更新）
  if (store.unlocked) {
    await store.fetchStatus(true);
  }
});

function handleBack(): void {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) });
}

function handleGoInvite(): void {
  uni.navigateTo({ url: '/pages/invite/poster' });
}

function handleGoCertificationType(): void {
  // 跳转到主体类型选择页；onShow 钩子会在返回时自动拉取最新状态
  uni.navigateTo({ url: '/pages/invite/certification-type' });
}

function handleOpenTutorial(): void {
  // 打开底部 sheet 的"教程"tab
  helpSheetRef.value?.openSheet('tutorial');
  // 埋点：mp_guide_viewed
  track(TrackEvent.MpGuideViewed, { guide_type: 'overview' });
}

function handleAbandon(): void {
  if (currentStatus.value === 'online') {
    uni.showToast({ title: '已上线的小程序无法放弃', icon: 'none' });
    return;
  }
  showAbandon.value = true;
}

function closeAbandon(): void {
  showAbandon.value = false;
}

async function confirmAbandon(): Promise<void> {
  showAbandon.value = false;
  try {
    await store.abandon();
    uni.showToast({ title: '已重置申请', icon: 'success' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '操作失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

function onSubmitSuccess(): void {
  // CertifiedView submitAppid 成功后无需额外处理，store 已更新
}
</script>

<template>
  <view class="page-mp">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner" :style="{ height: navBarHeight + 'px' }">
        <view class="navbar__back" @tap="handleBack">
          <text>‹</text>
        </view>
        <text class="navbar__title">🏠 我的小程序</text>
        <view class="navbar__placeholder" />
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && !record" class="mp-loading">
      <text>加载中...</text>
    </view>

    <!-- 未解锁资格：引导去邀请 -->
    <view v-else-if="!unlocked" class="mp-locked">
      <view class="mp-locked__icon">
        <text>🔒</text>
      </view>
      <text class="mp-locked__title">尚未获得小程序部署资格</text>
      <text class="mp-locked__desc">
        邀请 {{ inviteStore.stats?.unlockThreshold ?? 3 }} 位好友入驻巢穴
        （已邀请 {{ inviteStore.stats?.totalInvited ?? 0 }} 位），即可解锁个人专属小程序
      </text>
      <view class="mp-locked__progress">
        <view
          class="mp-locked__progress-fill"
          :style="{ width: Math.round(inviteStore.unlockProgress * 100) + '%' }"
        />
      </view>
      <view
        class="mp-locked__btn"
        hover-class="mp-locked__btn--hover"
        @tap="handleGoInvite"
      >
        <text>🎨 去生成邀请海报</text>
      </view>
    </view>

    <!-- 已解锁：根据状态分发 -->
    <view v-else class="mp-body">
      <!-- 状态头部 -->
      <view class="mp-header">
        <view class="mp-header__row">
          <StatusBadge :status="currentStatus" size="lg" />
          <text class="mp-header__step">第 {{ statusDisplay.step }} 步 / 共 4 步</text>
        </view>
        <text class="mp-header__desc">{{ statusDisplay.description }}</text>
        <view class="mp-header__bar">
          <view
            class="mp-header__bar-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </view>
      </view>

      <!-- 状态分发 -->
      <NotStartedView
        v-if="currentStatus === 'not_started'"
        @open-tutorial="handleOpenTutorial"
        @navigate-to-type="handleGoCertificationType"
      />
      <CertifyingView v-else-if="currentStatus === 'certifying'" />
      <CertifiedView
        v-else-if="currentStatus === 'certified'"
        @submit-success="onSubmitSuccess"
      />
      <ReviewingView v-else-if="currentStatus === 'reviewing'" />
      <OnlineView v-else-if="currentStatus === 'online'" />

      <!-- deploying 过渡态：提示正在部署 + 自动轮询 -->
      <view v-else-if="currentStatus === 'deploying'" class="mp-deploying">
        <view class="mp-deploying__spinner">
          <text>🚀</text>
        </view>
        <text class="mp-deploying__title">正在部署代码...</text>
        <text class="mp-deploying__desc">
          平台正在把你的小程序代码部署到微信服务器，稍后进入代码审核阶段。
        </text>
      </view>

      <!-- 放弃申请入口（非 online 状态可见） -->
      <view
        v-if="currentStatus !== 'online'"
        class="mp-abandon"
        hover-class="mp-abandon--hover"
        @tap="handleAbandon"
      >
        <text>🗑 放弃并重新申请</text>
      </view>
    </view>

    <!-- 教程与帮助 sheet（底部固定入口 + 半屏弹窗） -->
    <HelpCenterSheet ref="helpSheetRef" />

    <!-- 放弃确认弹窗 -->
    <view v-if="showAbandon" class="mp-modal-mask" @tap="closeAbandon">
      <view class="mp-modal mp-modal--small" @tap.stop>
        <text class="mp-modal__title">放弃申请？</text>
        <text class="mp-modal__desc">
          放弃后所有申请数据（认证主体、AppID、时间戳）将被清空，资格保留。
          您可以稍后重新申请。
        </text>
        <view class="mp-modal__actions">
          <view
            class="mp-modal__btn mp-modal__btn--cancel"
            hover-class="mp-modal__btn--hover"
            @tap="closeAbandon"
          >
            <text>再想想</text>
          </view>
          <view
            class="mp-modal__btn mp-modal__btn--danger"
            hover-class="mp-modal__btn--hover"
            @tap="confirmAbandon"
          >
            <text>确认放弃</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-mp {
  min-height: 100vh;
  background: linear-gradient(180deg, #1e241f 0%, #15191b 100%);
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx; /* 客服入口预留空间 */
}

/* ===== 导航 ===== */
.navbar {
  background: rgba(30, 36, 31, 0.95);
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.15);
  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx;
  }
  &__back {
    width: 64rpx;
    height: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c9a87c;
    font-size: 56rpx;
    line-height: 1;
  }
  &__title {
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
  &__placeholder {
    width: 64rpx;
  }
}

/* ===== 加载态 ===== */
.mp-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a89e85;
  font-size: 28rpx;
}

/* ===== 未解锁 ===== */
.mp-locked {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 64rpx;
  text-align: center;
  &__icon {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.1);
    border: 2rpx dashed rgba(201, 168, 124, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 100rpx;
    margin-bottom: 32rpx;
  }
  &__title {
    color: #f5dcae;
    font-size: 36rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    margin-bottom: 16rpx;
  }
  &__desc {
    color: #a89e85;
    font-size: 26rpx;
    line-height: 1.7;
    margin-bottom: 40rpx;
  }
  &__progress {
    width: 100%;
    height: 16rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 8rpx;
    overflow: hidden;
    margin-bottom: 40rpx;
  }
  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c 0%, #5a8f6c 100%);
    border-radius: 8rpx;
    transition: width 0.4s ease;
  }
  &__btn {
    height: 96rpx;
    padding: 0 48rpx;
    border-radius: 48rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 30rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.35);
    transition: all 0.15s ease;
    &--hover { transform: scale(0.98); opacity: 0.92; }
  }
}

/* ===== 已解锁 Body ===== */
.mp-body {
  flex: 1;
  padding: 32rpx 32rpx 48rpx;
}

.mp-header {
  margin-bottom: 32rpx;
  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }
  &__step {
    color: #a89e85;
    font-size: 24rpx;
  }
  &__desc {
    display: block;
    color: #f5f0e6;
    font-size: 28rpx;
    line-height: 1.6;
    margin-bottom: 16rpx;
  }
  &__bar {
    height: 8rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 4rpx;
    overflow: hidden;
  }
  &__bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c 0%, #5a8f6c 100%);
    border-radius: 4rpx;
    transition: width 0.5s ease;
  }
}

.mp-deploying {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx;
  background: linear-gradient(180deg, rgba(155, 89, 182, 0.1) 0%, rgba(155, 89, 182, 0.02) 100%);
  border: 1rpx solid rgba(155, 89, 182, 0.3);
  border-radius: 20rpx;
  text-align: center;
  &__spinner {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: rgba(155, 89, 182, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
    margin-bottom: 24rpx;
    animation: mp-deploy-spin 2s ease-in-out infinite;
  }
  &__title {
    color: #9b59b6;
    font-size: 32rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }
  &__desc {
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
  }
}

.mp-abandon {
  margin-top: 32rpx;
  text-align: center;
  padding: 24rpx;
  color: #a89e85;
  font-size: 24rpx;
  transition: all 0.15s ease;
  &--hover { opacity: 0.7; }
}

/* ===== 客服入口（固定底部） ===== */
.mp-customer-service {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: 32rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: rgba(30, 36, 31, 0.95);
  border: 1rpx solid rgba(201, 168, 124, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10rpx);
  transition: all 0.15s ease;
  z-index: 100;
  &:active { transform: scale(0.98); }
  &__icon { font-size: 32rpx; }
  &__text {
    color: #c9a87c;
    font-size: 28rpx;
    font-weight: 600;
  }
}

/* ===== 弹窗 ===== */
.mp-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(15, 20, 16, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  animation: mp-mask-in 0.25s ease-out;
}
.mp-modal {
  width: 100%;
  max-width: 640rpx;
  max-height: 80vh;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  animation: mp-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &--small {
    max-width: 560rpx;
  }
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
  }
  &__title {
    color: #f5dcae;
    font-size: 30rpx;
    font-weight: 700;
    text-align: center;
    flex: 1;
  }
  &__close {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    color: #c9a87c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
    line-height: 1;
  }
  &__desc {
    display: block;
    color: #f5f0e6;
    font-size: 26rpx;
    line-height: 1.7;
    margin-bottom: 32rpx;
    text-align: center;
  }
  &__list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    max-height: 60vh;
    overflow-y: auto;
  }
  &__actions {
    display: flex;
    gap: 16rpx;
    margin-top: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 600;
    transition: all 0.15s ease;
    &--hover { transform: scale(0.98); }
    &--cancel {
      background: transparent;
      border: 1rpx solid rgba(201, 168, 124, 0.4);
      color: #c9a87c;
    }
    &--danger {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: #fff;
    }
  }
}

.mp-tutorial {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12rpx;
  padding: 20rpx;
  &__icon { font-size: 40rpx; }
  &__body { flex: 1; min-width: 0; }
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 4rpx;
  }
  &__summary {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
    line-height: 1.5;
  }
  &__arrow {
    color: #c9a87c;
    font-size: 36rpx;
    line-height: 1;
  }
}

@keyframes mp-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mp-modal-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes mp-deploy-spin {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}
</style>
