<script setup lang="ts">
/**
 * celebration/index.vue —— 推送/红点点击后的落地页
 *
 * 设计目的：
 *  - 当用户从推送通知 / 个人中心红点进入"我的小程序"时，
 *    落地此页播放撒花 + 弹窗，避免在任意页面弹层破坏用户上下文
 *  - 如果 store 中已经处于 animating/dialog 阶段，则由 store 自行驱动；
 *    此页不重复触发
 */
import { computed, onMounted, ref } from 'vue';
import { useCelebrationStore } from '@/stores/celebration';
import { useUserStore } from '@/stores/user';
import { useInviteStore } from '@/stores/invite';
import ConfettiCanvas from '@/components/celebration/ConfettiCanvas.vue';
import GuardianCelebrationDialog from '@/components/celebration/GuardianCelebrationDialog.vue';

const celebrationStore = useCelebrationStore();
const userStore = useUserStore();
const inviteStore = useInviteStore();

// 仅在 animating 阶段显示 canvas
const showConfetti = computed(() => celebrationStore.phase === 'animating');
// 仅在 dialog 阶段显示弹窗
const showDialog = computed(
  () => celebrationStore.phase === 'dialog' && !!celebrationStore.currentMilestone,
);

// 自定义导航栏高度
const statusBarHeight = ref(20);
const navBarHeight = ref(44);

onMounted(async () => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight ?? 20;
  } catch {
    /* ignore */
  }

  // 刷新邀请统计，确保 store 数据是最新
  await inviteStore.loadStats().catch(() => {/* 忽略 */});

  // 如果 store 中 phase=idle，强制重放一次（让用户从推送进来也能看到动画）
  // 注意：trigger 内部会做幂等检查，避免重复触发
  if (
    celebrationStore.phase === 'idle' &&
    userStore.profile?.id &&
    !userStore.isGuest
  ) {
    await celebrationStore.checkOnAppShow();
  }
});

function onPrimary(): void {
  // 主按钮：去看看我的小程序 → 跳转到小程序中心
  celebrationStore.dismiss();
  uni.redirectTo({
    url: '/pages/invite/mini-program',
    fail: () => {
      uni.switchTab({
        url: '/pages/profile/index',
        fail: () => {
          uni.reLaunch({ url: '/pages/profile/index' });
        },
      });
    },
  });
}

function onSecondary(): void {
  // 次按钮：稍后再说 → 仅关闭弹窗
  celebrationStore.dismiss();
}

function onMaskDismiss(): void {
  // 蒙层点击 → 同次按钮
  onSecondary();
}

function handleBack(): void {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/profile/index' });
    },
  });
}

function handleGoNow(): void {
  // 页面底部"去看看我的小程序"按钮
  onPrimary();
}
</script>

<template>
  <view class="page-celebration">
    <!-- 自定义导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner" :style="{ height: navBarHeight + 'px' }">
        <view class="navbar__back" @tap="handleBack">
          <text>‹</text>
        </view>
        <text class="navbar__title">里程碑解锁</text>
        <view class="navbar__placeholder" />
      </view>
    </view>

    <view class="celebration-body">
      <!-- 装饰底图 -->
      <view class="cele-bg">
        <view class="cele-bg__halo cele-bg__halo--gold" />
        <view class="cele-bg__halo cele-bg__halo--green" />
        <view class="cele-bg__title">🏰 里程碑解锁</view>
        <view class="cele-bg__subtitle">你的城门口已经为你敞开</view>
      </view>

      <view class="cele-card">
        <view class="cele-card__badge">🏆 邀请成就</view>
        <view class="cele-card__title">邀请满 3 位好友</view>
        <view class="cele-card__desc">
          你已成功邀请 3 位巢友加入游戏巢穴。作为奖励，你已解锁了个人专属小程序
          —— 把你的「城门口」分享给更多人吧。
        </view>

        <view class="cele-card__stats">
          <view class="cele-card__stat">
            <text class="cele-card__stat-num">3</text>
            <text class="cele-card__stat-label">已邀请</text>
          </view>
          <view class="cele-card__divider" />
          <view class="cele-card__stat">
            <text class="cele-card__stat-num">∞</text>
            <text class="cele-card__stat-label">可生成小程序码</text>
          </view>
        </view>

        <view class="cele-card__action" hover-class="cele-card__action--hover" @tap="handleGoNow">
          <text>去看看我的小程序</text>
        </view>
      </view>
    </view>

    <!-- Canvas 撒花层 -->
    <ConfettiCanvas
      :visible="showConfetti"
      :duration="2000"
      :particle-count="50"
      @finished="celebrationStore.phase === 'animating' ? (celebrationStore.phase = 'dialog') : undefined"
    />

    <!-- 守护灵弹窗 -->
    <GuardianCelebrationDialog
      :visible="showDialog"
      guardian-icon="🧚"
      guardian-name="巢灵"
      guardian-color="#C9A87C"
      badge="🏰 里程碑达成"
      :title="celebrationStore.currentMilestone?.title ?? '🎉 恭喜解锁！'"
      :body="celebrationStore.currentMilestone?.guardianText ?? ''"
      :primary-button="{ text: '去看看我的小程序', primary: true }"
      :secondary-button="{ text: '稍后再说' }"
      @primary="onPrimary"
      @secondary="onSecondary"
      @dismiss="onMaskDismiss"
    />
  </view>
</template>

<style lang="scss" scoped>
.page-celebration {
  min-height: 100vh;
  background: linear-gradient(180deg, #1e241f 0%, #15191b 100%);
  display: flex;
  flex-direction: column;
}

.navbar {
  background: transparent;

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

.celebration-body {
  flex: 1;
  padding: 32rpx 48rpx 96rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cele-bg {
  position: relative;
  width: 100%;
  height: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  overflow: hidden;

  &__halo {
    position: absolute;
    width: 480rpx;
    height: 480rpx;
    border-radius: 50%;
    filter: blur(40rpx);
    opacity: 0.45;
  }
  &__halo--gold {
    top: -160rpx;
    left: -120rpx;
    background: radial-gradient(circle, #c9a87c 0%, transparent 70%);
    animation: cele-pulse 4.5s ease-in-out infinite;
  }
  &__halo--green {
    bottom: -160rpx;
    right: -120rpx;
    background: radial-gradient(circle, #5a8f6c 0%, transparent 70%);
    animation: cele-pulse 4.5s ease-in-out infinite 1.2s;
  }
  &__title {
    color: #f5dcae;
    font-size: 56rpx;
    font-weight: 800;
    letter-spacing: 6rpx;
    text-shadow: 0 4rpx 20rpx rgba(201, 168, 124, 0.5);
    z-index: 1;
  }
  &__subtitle {
    color: #a89e85;
    font-size: 26rpx;
    margin-top: 12rpx;
    letter-spacing: 2rpx;
    z-index: 1;
  }
}

.cele-card {
  width: 100%;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid rgba(201, 168, 124, 0.4);
  border-radius: 24rpx;
  padding: 64rpx 48rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: relative;
  box-shadow: 0 16rpx 60rpx rgba(0, 0, 0, 0.4);

  &__badge {
    position: absolute;
    top: -24rpx;
    left: 50%;
    transform: translateX(-50%);
    background: #c9a87c;
    color: #1e241f;
    padding: 8rpx 24rpx;
    border-radius: 999px;
    font-size: 22rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.5);
  }
  &__title {
    color: #f5dcae;
    font-size: 40rpx;
    font-weight: 800;
    text-align: center;
    letter-spacing: 2rpx;
    margin-bottom: 24rpx;
  }
  &__desc {
    color: #f5f0e6;
    font-size: 28rpx;
    line-height: 1.7;
    text-align: center;
    margin-bottom: 40rpx;
  }
  &__stats {
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: rgba(0, 0, 0, 0.25);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 16rpx;
    padding: 32rpx 24rpx;
    margin-bottom: 40rpx;
  }
  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    &-num {
      color: #c9a87c;
      font-size: 56rpx;
      font-weight: 800;
      line-height: 1.1;
    }
    &-label {
      color: #a89e85;
      font-size: 22rpx;
      margin-top: 8rpx;
      letter-spacing: 1rpx;
    }
  }
  &__divider {
    width: 2rpx;
    height: 64rpx;
    background: rgba(201, 168, 124, 0.3);
    margin: 0 24rpx;
  }
  &__action {
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    height: 96rpx;
    border-radius: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    box-shadow: 0 6rpx 20rpx rgba(201, 168, 124, 0.35);
    transition: all 0.15s ease;
  }
  &__action--hover {
    transform: scale(0.97);
    opacity: 0.85;
  }
}

@keyframes cele-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.25;
  }
}
</style>
