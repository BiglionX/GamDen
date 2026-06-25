<script setup lang="ts">
/**
 * 入驻完成页
 *
 * 按需求文档 3.4-3.5 节设计：
 * - 守护灵结盟确认台词展示
 * - 领地分配结果
 * - 【进入巢穴】主按钮
 * - 动画过渡到地图页
 */
import { ref, onMounted, computed } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { track } from '@/utils/track';
import { GUARDIAN_VISUALS, type GuardianType } from '@/types/agent';
import { getAgentLine } from '@/utils/agent-lines';

const agentStore = useAgentStore();
const userStore = useUserStore();

// 从页面参数获取守护灵类型和领地编号
const guardian = ref<GuardianType>('mechanical');
const territoryId = ref('');

const visual = computed(() => GUARDIAN_VISUALS[guardian.value]);
const allianceLine = computed(() => getAgentLine(guardian.value, 'alliance'));

onMounted(() => {
  // 从页面参数获取数据
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options;
  if (options?.guardian) {
    guardian.value = options.guardian as GuardianType;
  }
  if (options?.territory) {
    territoryId.value = options.territory;
  }

  // 标记入驻完成
  agentStore.completeOnboarding();

  // 记录埋点
  track('onboarding_completed', {
    guardian_type: guardian.value,
    territory_coord: territoryId.value,
  });

  // 触发领地落地话术
  setTimeout(() => {
    agentStore.publish('territoryLanding');
  }, 500);
});

function handleEnterNest() {
  // 跳转到地图页
  uni.reLaunch({
    url: '/pages/map/index',
  });
}
</script>

<template>
  <view class="page-complete">
    <!-- 背景装饰 -->
    <view class="page-complete__bg">
      <!-- 粒子效果 -->
      <view class="page-complete__particles">
        <view v-for="i in 30" :key="i" class="page-complete__particle" :style="{ '--delay': `${i * 0.1}s`, '--x': `${Math.random() * 100}%` }" />
      </view>
    </view>

    <!-- 主要内容 -->
    <view class="page-complete__content">
      <!-- 结盟徽章 -->
      <view class="page-complete__badge">
        <view class="page-complete__badge-ring" />
        <view
          class="page-complete__badge-icon"
          :style="{
            borderColor: visual.color,
            background: `linear-gradient(135deg, ${visual.color}22 0%, ${visual.color}11 100%)`,
          }"
        >
          <text class="page-complete__badge-emoji">
            {{ visual.icon }}
          </text>
        </view>
        <text class="page-complete__badge-text">
          结盟成功
        </text>
      </view>

      <!-- 守护灵信息 -->
      <view class="page-complete__guardian">
        <text class="page-complete__guardian-name" :style="{ color: visual.color }">
          {{ visual.name }}
        </text>
        <text class="page-complete__guardian-subtitle">
          你的专属守护灵
        </text>
      </view>

      <!-- 结盟确认台词 -->
      <view class="page-complete__dialogue">
        <view
          class="page-complete__dialogue-bubble"
          :style="{ borderColor: visual.color }"
        >
          <text class="page-complete__dialogue-text">
            {{ allianceLine?.text }}
          </text>
        </view>
      </view>

      <!-- 领地信息 -->
      <view class="page-complete__territory">
        <view class="page-complete__territory-card">
          <text class="page-complete__territory-icon">
            🏰
          </text>
          <view class="page-complete__territory-info">
            <text class="page-complete__territory-label">
              你的领地
            </text>
            <text class="page-complete__territory-id">
              #{{ territoryId || '-----' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 进入巢穴按钮 -->
    <view class="page-complete__actions">
      <view class="page-complete__btn" @tap="handleEnterNest">
        <text>进入巢穴</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-complete {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d1014 0%, #1a1f1c 50%, #1e241f 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__particles {
    position: absolute;
    inset: 0;
  }

  &__particle {
    position: absolute;
    bottom: -20rpx;
    left: var(--x);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
    opacity: 0;
    animation: particle-rise 3s ease-out var(--delay) infinite;
  }

  // 主要内容
  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 160rpx 48rpx 200rpx;
    position: relative;
    z-index: 1;
  }

  // 结盟徽章
  &__badge {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 48rpx;
    animation: badge-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  &__badge-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 280rpx;
    height: 280rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(201, 168, 124, 0.3);
    animation: ring-pulse 2s ease-in-out infinite;
  }

  &__badge-icon {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    border-width: 4rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 60rpx rgba(201, 168, 124, 0.4);
  }

  &__badge-emoji {
    font-size: 112rpx;
    line-height: 1;
  }

  &__badge-text {
    margin-top: 24rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 6rpx;
  }

  // 守护灵信息
  &__guardian {
    text-align: center;
    margin-bottom: 40rpx;
    animation: guardian-enter 0.6s ease-out 0.2s backwards;
  }

  &__guardian-name {
    display: block;
    font-size: 48rpx;
    font-weight: 700;
    letter-spacing: 4rpx;
    margin-bottom: 8rpx;
  }

  &__guardian-subtitle {
    display: block;
    font-size: 26rpx;
    color: #a89e85;
  }

  // 对话语气泡
  &__dialogue {
    width: 100%;
    margin-bottom: 48rpx;
    animation: dialogue-enter 0.6s ease-out 0.4s backwards;
  }

  &__dialogue-bubble {
    background: linear-gradient(180deg, rgba(42, 49, 40, 0.9) 0%, rgba(30, 36, 31, 0.95) 100%);
    border: 2rpx solid rgba(201, 168, 124, 0.4);
    border-radius: 20rpx;
    padding: 32rpx;
    text-align: center;
  }

  &__dialogue-text {
    font-size: 30rpx;
    color: #f5f0e6;
    line-height: 1.7;
    font-weight: 500;
  }

  // 领地信息
  &__territory {
    width: 100%;
    animation: territory-enter 0.6s ease-out 0.6s backwards;
  }

  &__territory-card {
    display: flex;
    align-items: center;
    gap: 24rpx;
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.15) 0%, rgba(201, 168, 124, 0.05) 100%);
    border: 2rpx solid rgba(201, 168, 124, 0.4);
    border-radius: 20rpx;
    padding: 32rpx;
  }

  &__territory-icon {
    font-size: 64rpx;
    line-height: 1;
  }

  &__territory-info {
    flex: 1;
  }

  &__territory-label {
    display: block;
    font-size: 24rpx;
    color: #a89e85;
    margin-bottom: 8rpx;
  }

  &__territory-id {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 4rpx;
  }

  // 按钮
  &__actions {
    position: fixed;
    bottom: 80rpx;
    left: 32rpx;
    right: 32rpx;
    z-index: 10;
    animation: actions-enter 0.6s ease-out 0.8s backwards;
  }

  &__btn {
    height: 96rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
    border-radius: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: 700;
    color: #1e241f;
    letter-spacing: 6rpx;
    box-shadow: 0 8rpx 32rpx rgba(201, 168, 124, 0.4);

    &:active {
      transform: scale(0.97);
    }
  }
}

// 动画
@keyframes badge-enter {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ring-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.6;
  }
}

@keyframes guardian-enter {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dialogue-enter {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes territory-enter {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes actions-enter {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes particle-rise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(1);
  }
  20% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(-100vh) scale(0.5);
  }
}
</style>
