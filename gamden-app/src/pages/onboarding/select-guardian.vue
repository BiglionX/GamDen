<script setup lang="ts">
/**
 * 守护灵选择页
 *
 * 按需求文档 3.3 节设计：
 * - 页面标题："你愿意与谁同行？"
 * - 副标题："它将成为你巢穴的守护者，陪你走过GamDen的每一天。"
 * - 六张守护灵卡片（机械师/精灵/占星师/游侠/工匠/使徒）
 * - 卡片内容：图标(60pt) + 性格标签 + 选择台词
 * - 选择后高亮 + 震动反馈
 * - 底部【结盟】按钮（选择后变为可点）
 */
import { ref, computed, onMounted } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { track } from '@/utils/track';
import { GUARDIAN_VISUALS, type GuardianType } from '@/types/agent';
import { getAgentLine } from '@/utils/agent-lines';

const agentStore = useAgentStore();
const userStore = useUserStore();

const selectedGuardian = ref<GuardianType | null>(null);
const confirmAllianceLoading = ref(false);

// 页面标题和副标题
const pageTitle = '你愿意与谁同行？';
const pageSubtitle = '它将成为你巢穴的守护者，陪你走过GamDen的每一天。';

const guardians = computed(() => {
  return Object.values(GUARDIAN_VISUALS).map((g) => ({
    ...g,
    selectLine: getAgentLine(g.type, 'selectGuardian'),
  }));
});

const canConfirm = computed(() => !!selectedGuardian.value && !confirmAllianceLoading.value);

onMounted(() => {
  // 初始化入驻状态
  agentStore.initOnboardingState();
});

function selectGuardian(type: GuardianType) {
  selectedGuardian.value = type;

  // 震动反馈
  uni.vibrateShort?.({ type: 'medium' });

  // 记录埋点
  track('onboarding_guardian_selected', {
    guardian_type: type,
  });
}

function handleAlliance() {
  if (!canConfirm.value || !selectedGuardian.value) return;

  confirmAllianceLoading.value = true;

  // 设置已选择的守护灵
  agentStore.setOnboardingGuardian(selectedGuardian.value);

  // 触发结盟确认话术
  agentStore.publish('alliance');

  // 延迟跳转到领地分配页
  setTimeout(() => {
    uni.redirectTo({
      url: `/pages/onboarding/territory?guardian=${selectedGuardian.value}`,
    });
  }, 1500);
}
</script>

<template>
  <view class="page-select-guardian">
    <!-- 背景装饰 -->
    <view class="page-select-guardian__bg">
      <view class="page-select-guardian__stars" />
    </view>

    <!-- 页面标题 -->
    <view class="page-select-guardian__header">
      <text class="page-select-guardian__title">
        {{ pageTitle }}
      </text>
      <text class="page-select-guardian__subtitle">
        {{ pageSubtitle }}
      </text>
    </view>

    <!-- 守护灵卡片列表 -->
    <view class="page-select-guardian__cards">
      <view
        v-for="guardian in guardians"
        :key="guardian.type"
        class="guardian-card"
        :class="{
          'guardian-card--active': selectedGuardian === guardian.type,
        }"
        :style="{ '--guardian-color': guardian.color }"
        @tap="selectGuardian(guardian.type)"
      >
        <!-- 守护灵头像 -->
        <view class="guardian-card__avatar">
          <text class="guardian-card__icon">
            {{ guardian.icon }}
          </text>
          <view
            class="guardian-card__avatar-glow"
            :style="{ background: guardian.color }"
          />
        </view>

        <!-- 守护灵名称 -->
        <text class="guardian-card__name">
          {{ guardian.name }}
        </text>

        <!-- 性格标签 -->
        <view class="guardian-card__tags">
          <text v-if="guardian.type === 'mechanical'" class="guardian-card__tag">
            理性
          </text>
          <text v-if="guardian.type === 'mechanical'" class="guardian-card__tag">
            可靠
          </text>
          <text v-if="guardian.type === 'mechanical'" class="guardian-card__tag">
            冷静
          </text>

          <text v-if="guardian.type === 'elf'" class="guardian-card__tag">
            温暖
          </text>
          <text v-if="guardian.type === 'elf'" class="guardian-card__tag">
            感性
          </text>
          <text v-if="guardian.type === 'elf'" class="guardian-card__tag">
            陪伴
          </text>

          <text v-if="guardian.type === 'astrologer'" class="guardian-card__tag">
            深邃
          </text>
          <text v-if="guardian.type === 'astrologer'" class="guardian-card__tag">
            智慧
          </text>
          <text v-if="guardian.type === 'astrologer'" class="guardian-card__tag">
            指引
          </text>
        </view>

        <!-- 选择台词 -->
        <text class="guardian-card__quote">
          "{{ guardian.selectLine?.text }}"
        </text>

        <!-- 选中指示器 -->
        <view v-if="selectedGuardian === guardian.type" class="guardian-card__check">
          <text>✓</text>
        </view>
      </view>
    </view>

    <!-- 结盟按钮 -->
    <view class="page-select-guardian__actions">
      <view
        class="page-select-guardian__btn"
        :class="{ 'page-select-guardian__btn--disabled': !selectedGuardian }"
        @tap="handleAlliance"
      >
        <text>{{ confirmAllianceLoading ? '结盟中...' : '结盟' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-select-guardian {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d1014 0%, #1a1f1c 50%, #1e241f 100%);
  padding: 120rpx 32rpx 80rpx;
  position: relative;
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__stars {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 600rpx;
    background-image: radial-gradient(2rpx 2rpx at 100rpx 50rpx, rgba(255, 255, 255, 0.3) 0%, transparent 100%),
      radial-gradient(2rpx 2rpx at 200rpx 150rpx, rgba(255, 255, 255, 0.2) 0%, transparent 100%),
      radial-gradient(1rpx 1rpx at 300rpx 80rpx, rgba(255, 255, 255, 0.25) 0%, transparent 100%),
      radial-gradient(2rpx 2rpx at 400rpx 200rpx, rgba(255, 255, 255, 0.15) 0%, transparent 100%),
      radial-gradient(1rpx 1rpx at 500rpx 100rpx, rgba(255, 255, 255, 0.2) 0%, transparent 100%),
      radial-gradient(2rpx 2rpx at 600rpx 180rpx, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
    background-size: 100% 100%;
    animation: stars-twinkle 4s ease-in-out infinite;
  }

  // 页面标题
  &__header {
    text-align: center;
    margin-bottom: 64rpx;
    position: relative;
    z-index: 1;
  }

  &__title {
    display: block;
    font-size: 48rpx;
    font-weight: 700;
    color: #f5dcae;
    letter-spacing: 4rpx;
    margin-bottom: 20rpx;
  }

  &__subtitle {
    display: block;
    font-size: 28rpx;
    color: #a89e85;
    line-height: 1.6;
  }

  // 卡片列表
  &__cards {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 32rpx;
  }

  // 结盟按钮
  &__actions {
    position: fixed;
    bottom: 80rpx;
    left: 32rpx;
    right: 32rpx;
    z-index: 10;
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
    transition: all 0.2s;

    &--disabled {
      background: rgba(201, 168, 124, 0.2);
      color: #a89e85;
      box-shadow: none;
    }

    &:active:not(&--disabled) {
      transform: scale(0.97);
    }
  }
}

// 守护灵卡片
.guardian-card {
  position: relative;
  background: linear-gradient(180deg, rgba(42, 49, 40, 0.9) 0%, rgba(30, 36, 31, 0.95) 100%);
  border: 2rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
  animation: card-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  @for $i from 1 through 3 {
    &:nth-child(#{$i}) {
      animation-delay: #{($i - 1) * 0.1}s;
    }
  }

  &--active {
    border-color: var(--guardian-color);
    box-shadow: 0 0 0 4rpx var(--guardian-color),
      0 0 40rpx rgba(201, 168, 124, 0.3);
    transform: translateY(-4rpx);
  }

  &__avatar {
    position: relative;
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    border: 3rpx solid var(--guardian-color);
    background: linear-gradient(135deg, rgba(245, 240, 230, 0.08) 0%, rgba(245, 240, 230, 0.02) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24rpx;
  }

  &__icon {
    font-size: 64rpx;
    line-height: 1;
    z-index: 1;
  }

  &__avatar-glow {
    position: absolute;
    inset: -24rpx;
    border-radius: 50%;
    opacity: 0.15;
    z-index: 0;
    animation: card-glow 2.4s ease-in-out infinite;
  }

  &__name {
    font-size: 36rpx;
    font-weight: 700;
    color: #f5f0e6;
    letter-spacing: 4rpx;
    margin-bottom: 16rpx;
  }

  &__tags {
    display: flex;
    gap: 12rpx;
    margin-bottom: 20rpx;
  }

  &__tag {
    font-size: 22rpx;
    color: var(--guardian-color);
    padding: 6rpx 16rpx;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 16rpx;
    border: 1rpx solid rgba(201, 168, 124, 0.2);
  }

  &__quote {
    font-size: 26rpx;
    color: #d4c9b0;
    line-height: 1.6;
    text-align: center;
    font-style: italic;
    max-width: 500rpx;
  }

  &__check {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: var(--guardian-color);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

    text {
      font-size: 28rpx;
      color: #1e241f;
      font-weight: 700;
    }
  }
}

// 动画
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes card-glow {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(1);
  }
  50% {
    opacity: 0.25;
    transform: scale(1.1);
  }
}

@keyframes check-pop {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes stars-twinkle {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
