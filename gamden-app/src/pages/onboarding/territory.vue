<script setup lang="ts">
/**
 * 领地分配动画页
 *
 * 按需求文档 3.4 节设计：
 * - 全屏地图视图
 * - 光点从屏幕中央落下（1.5秒）
 * - 落地后扩散涟漪效果
 * - 显示领地图标
 * - 轻微震动反馈
 * - 系统Toast："欢迎归巢，你获得了第XXXXX号领地"
 * - 守护灵祝贺消息弹出
 */
import { ref, onMounted, computed } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { track } from '@/utils/track';
import { GUARDIAN_VISUALS, type GuardianType } from '@/types/agent';
import { getAgentLine } from '@/utils/agent-lines';

const agentStore = useAgentStore();
const userStore = useUserStore();

// 从页面参数获取守护灵类型
const guardian = ref<GuardianType>('mechanical');

// 动画状态
const animating = ref(true);
const showTerritory = ref(false);
const showCelebration = ref(false);

// 生成的领地编号
const territoryId = ref('');

const visual = computed(() => GUARDIAN_VISUALS[guardian.value]);
const celebrationLine = computed(() => getAgentLine(guardian.value, 'territoryLanding'));

onMounted(() => {
  // 从页面参数获取守护灵类型
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options;
  if (options?.guardian) {
    guardian.value = options.guardian as GuardianType;
  }

  // 生成领地编号（5位数）
  territoryId.value = String(Math.floor(10000 + Math.random() * 90000));

  // 开始领地落地动画
  startTerritoryAnimation();
});

function startTerritoryAnimation() {
  // 动画时长：1.5秒
  setTimeout(() => {
    showTerritory.value = true;

    // 震动反馈
    uni.vibrateShort?.({ type: 'medium' });

    // 显示系统Toast
    uni.showToast({
      title: `欢迎归巢，你获得了第${territoryId.value}号领地`,
      icon: 'none',
      duration: 3000,
    });

    // 记录埋点
    track('onboarding_territory_landed', {
      guardian_type: guardian.value,
      territory_coord: territoryId.value,
    });

    // 显示守护灵祝贺
    setTimeout(() => {
      showCelebration.value = true;

      // 延迟跳转入驻完成页
      setTimeout(() => {
        uni.redirectTo({
          url: `/pages/onboarding/complete?guardian=${guardian.value}&territory=${territoryId.value}`,
        });
      }, 2500);
    }, 800);
  }, 1500);
}

function handleSkip() {
  // 跳过动画，直接跳转
  uni.redirectTo({
    url: `/pages/onboarding/complete?guardian=${guardian.value}&territory=${territoryId.value}`,
  });
}
</script>

<template>
  <view class="page-territory">
    <!-- 背景地图 -->
    <view class="page-territory__map">
      <!-- 地图网格 -->
      <view class="page-territory__grid">
        <view v-for="i in 20" :key="i" class="page-territory__grid-line" />
      </view>

      <!-- 迷雾效果 -->
      <view class="page-territory__fog" />
    </view>

    <!-- 领地种子光点 -->
    <view class="page-territory__seed" :class="{ 'page-territory__seed--fall': animating }">
      <view class="page-territory__seed-core" />
      <view class="page-territory__seed-glow" />
    </view>

    <!-- 领地落地效果 -->
    <view v-if="showTerritory" class="page-territory__landing">
      <!-- 涟漪 -->
      <view class="page-territory__ripple" />
      <view class="page-territory__ripple page-territory__ripple--delay" />

      <!-- 领地图标 -->
      <view class="page-territory__territory-icon">
        <text class="page-territory__territory-text">
          🏰
        </text>
      </view>

      <!-- 领地编号 -->
      <view class="page-territory__territory-info">
        <text class="page-territory__territory-label">
          你的领地
        </text>
        <text class="page-territory__territory-id">
          #{{ territoryId }}
        </text>
      </view>
    </view>

    <!-- 守护灵祝贺 -->
    <view v-if="showCelebration" class="page-territory__celebration">
      <view class="page-territory__celebration-card">
        <!-- 守护灵头像 -->
        <view
          class="page-territory__celebration-avatar"
          :style="{
            borderColor: visual.color,
            background: `linear-gradient(135deg, ${visual.color}22 0%, ${visual.color}11 100%)`,
          }"
        >
          <text class="page-territory__celebration-icon">
            {{ visual.icon }}
          </text>
        </view>

        <!-- 祝贺台词 -->
        <view class="page-territory__celebration-bubble">
          <text class="page-territory__celebration-name" :style="{ color: visual.color }">
            {{ visual.name }}
          </text>
          <text class="page-territory__celebration-text">
            {{ celebrationLine?.text }}
          </text>
        </view>
      </view>
    </view>

    <!-- 跳过按钮 -->
    <view class="page-territory__skip" @tap="handleSkip">
      <text>跳过</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-territory {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #0d1014 0%, #1a1f1c 100%);
  overflow: hidden;

  &__map {
    position: absolute;
    inset: 0;
  }

  &__grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(4, 1fr);

    &-line {
      border: 1rpx solid rgba(201, 168, 124, 0.08);
    }
  }

  &__fog {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(13, 16, 20, 0.6) 70%,
      rgba(13, 16, 20, 0.95) 100%
    );
  }

  // 种子光点
  &__seed {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;

    &--fall {
      animation: seed-fall 1.5s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
    }
  }

  &__seed-core {
    width: 24rpx;
    height: 24rpx;
    border-radius: 50%;
    background: #c9a87c;
    box-shadow: 0 0 40rpx rgba(201, 168, 124, 0.8), 0 0 80rpx rgba(201, 168, 124, 0.4);
  }

  &__seed-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(201, 168, 124, 0.4) 0%, transparent 70%);
    animation: seed-pulse 0.8s ease-in-out infinite;
  }

  // 领地落地
  &__landing {
    position: absolute;
    top: 60%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: territory-appear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    z-index: 20;
  }

  &__ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    border: 4rpx solid #c9a87c;
    animation: ripple-expand 1.5s ease-out forwards;
    opacity: 0;

    &--delay {
      animation-delay: 0.3s;
    }
  }

  &__territory-icon {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 4rpx solid #c9a87c;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.5), 0 0 60rpx rgba(201, 168, 124, 0.3);
    z-index: 1;
  }

  &__territory-text {
    font-size: 80rpx;
    line-height: 1;
  }

  &__territory-info {
    margin-top: 32rpx;
    text-align: center;
  }

  &__territory-label {
    display: block;
    font-size: 24rpx;
    color: #a89e85;
    margin-bottom: 8rpx;
  }

  &__territory-id {
    display: block;
    font-size: 48rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 4rpx;
  }

  // 守护灵祝贺
  &__celebration {
    position: fixed;
    top: 180rpx;
    left: 32rpx;
    right: 32rpx;
    z-index: 30;
    animation: celebration-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  &__celebration-card {
    display: flex;
    align-items: flex-start;
    gap: 24rpx;
    background: linear-gradient(180deg, rgba(42, 49, 40, 0.95) 0%, rgba(30, 36, 31, 0.98) 100%);
    border: 2rpx solid rgba(201, 168, 124, 0.5);
    border-radius: 20rpx;
    padding: 28rpx;
    backdrop-filter: blur(20rpx);
  }

  &__celebration-avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    border-width: 3rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.4);
  }

  &__celebration-icon {
    font-size: 56rpx;
    line-height: 1;
  }

  &__celebration-bubble {
    flex: 1;
    min-width: 0;
  }

  &__celebration-name {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    margin-bottom: 12rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);
  }

  &__celebration-text {
    display: block;
    font-size: 30rpx;
    color: #f5f0e6;
    line-height: 1.6;
    font-weight: 500;
  }

  // 跳过按钮
  &__skip {
    position: fixed;
    top: 60rpx;
    right: 32rpx;
    z-index: 40;
    padding: 12rpx 24rpx;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 24rpx;

    text {
      font-size: 24rpx;
      color: #a89e85;
    }
  }
}

// 动画
@keyframes seed-fall {
  0% {
    top: 40%;
    opacity: 1;
  }
  80% {
    top: 58%;
    opacity: 1;
  }
  100% {
    top: 60%;
    opacity: 0;
  }
}

@keyframes seed-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.7;
  }
}

@keyframes territory-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes ripple-expand {
  0% {
    width: 100rpx;
    height: 100rpx;
    opacity: 0.8;
  }
  100% {
    width: 400rpx;
    height: 400rpx;
    opacity: 0;
  }
}

@keyframes celebration-enter {
  0% {
    opacity: 0;
    transform: translateY(-30rpx);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
