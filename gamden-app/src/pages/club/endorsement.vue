<script setup lang="ts">
/**
 * 联署页面
 */
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { clubApi } from '@/utils/club-api';
import type { ClubProposal } from '@/types/club';

const proposalId = ref<number>(0);
const proposal = ref<ClubProposal | null>(null);
const loading = ref(false);
const endorsing = ref(false);

const progress = computed(() => {
  if (!proposal.value) return 0;
  return Math.min(100, (proposal.value.endorsement_count / 20) * 100);
});

const remaining = computed(() => {
  if (!proposal.value) return 20;
  return Math.max(0, 20 - proposal.value.endorsement_count);
});

async function loadProposal() {
  loading.value = true;
  try {
    proposal.value = await clubApi.getProposalDetail(proposalId.value);
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function onEndorse() {
  if (endorsing.value) return;
  endorsing.value = true;

  try {
    const res = await clubApi.endorseProposal(proposalId.value);
    proposal.value!.endorsement_count = res.endorsement_count;

    if (res.auto_approved) {
      uni.showToast({ title: '提议已通过！', icon: 'success' });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      uni.showToast({ title: '联署成功', icon: 'success' });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '联署失败', icon: 'none' });
  } finally {
    endorsing.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function share() {
  // 分享功能
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

onLoad((options: any) => {
  if (options.id) {
    proposalId.value = parseInt(options.id);
    loadProposal();
  }
});
</script>

<template>
  <view class="page-endorsement">
    <!-- 标题 -->
    <view class="header">
      <view class="header__back" @tap="goBack">
        <text>‹</text>
      </view>
      <text class="header__title">
        联署提议
      </text>
      <view class="header__share" @tap="share">
        <text>分享</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 内容 -->
    <view v-else-if="proposal" class="content">
      <!-- 提议信息 -->
      <view class="proposal-card">
        <view class="proposal-card__header">
          <text class="proposal-card__name">
            {{ proposal.name }}
          </text>
          <view class="proposal-card__status" :class="`proposal-card__status--${proposal.status}`">
            {{ proposal.status === 'pending' ? '审核中' : proposal.status === 'approved' ? '已通过' : '已驳回' }}
          </view>
        </view>
        <text class="proposal-card__desc">
          {{ proposal.description }}
        </text>
        <view class="proposal-card__meta">
          <text class="proposal-card__type">
            {{ proposal.proposal_type === 'game' ? '🎮' : proposal.proposal_type === 'interest' ? '🎯' : '✨' }}
            {{ proposal.proposal_type === 'game' ? '游戏类' : proposal.proposal_type === 'interest' ? '兴趣类' : '其他' }}
          </text>
          <text class="proposal-card__time">
            {{ proposal.created_at }}
          </text>
        </view>
        <view class="proposal-card__proposer">
          <text>提议人：{{ proposal.proposer_name }}</text>
        </view>
      </view>

      <!-- 联署进度 -->
      <view class="endorsement-progress">
        <view class="endorsement-progress__title">
          联署进度
        </view>
        <view class="endorsement-progress__bar">
          <view class="endorsement-progress__fill" :style="{ width: `${progress}%` }"></view>
        </view>
        <view class="endorsement-progress__info">
          <text class="endorsement-progress__count">
            {{ proposal.endorsement_count }}
          </text>
          <text class="endorsement-progress__target">
            / 20 人
          </text>
        </view>
        <text v-if="remaining > 0" class="endorsement-progress__hint">
          还差 {{ remaining }} 人联署即可自动通过
        </text>
        <text v-else class="endorsement-progress__success">
          已达成20人联署，正在等待系统处理...
        </text>
      </view>

      <!-- 联署按钮 -->
      <view v-if="proposal.status === 'pending'" class="endorse-btn" @tap="onEndorse">
        <text v-if="endorsing">
          联署中...
        </text>
        <text v-else>
          支持此提议
        </text>
      </view>

      <!-- 状态说明 -->
      <view class="notice">
        <view class="notice__title">
          联署说明
        </view>
        <view class="notice__item">
          • 联署后可获得通知
        </view>
        <view class="notice__item">
          • 达到20人联署将自动批准
        </view>
        <view class="notice__item">
          • 提议通过后，所有联署人将收到通知
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-endorsement {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 0 32rpx 64rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;

  &__back {
    width: 80rpx;
    font-size: 48rpx;
    color: #C9A87C;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 600;
    color: #F5F0E6;
  }

  &__share {
    width: 80rpx;
    text-align: right;
    font-size: 28rpx;
    color: #C9A87C;
  }
}

.loading {
  text-align: center;
  padding: 120rpx;
  color: $u-tips-color;
}

.proposal-card {
  background: linear-gradient(180deg, $u-bg-color-light 0%, rgba(38, 45, 39, 0.7) 100%);
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
  }

  &__name {
    font-size: 36rpx;
    font-weight: 600;
    color: #F5F0E6;
  }

  &__status {
    font-size: 22rpx;
    padding: 6rpx 16rpx;
    border-radius: 16rpx;

    &--pending {
      background: rgba(255, 193, 7, 0.2);
      color: #FFC107;
    }

    &--approved {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
    }

    &--rejected {
      background: rgba(244, 67, 54, 0.2);
      color: #F44336;
    }
  }

  &__desc {
    font-size: 28rpx;
    color: $u-tips-color;
    line-height: 1.6;
    margin-bottom: 16rpx;
  }

  &__meta {
    display: flex;
    gap: 24rpx;
    margin-bottom: 12rpx;
  }

  &__type,
  &__time {
    font-size: 24rpx;
    color: $u-content-color;
  }

  &__proposer {
    font-size: 24rpx;
    color: $u-tips-color;
  }
}

.endorsement-progress {
  background: rgba(201, 168, 124, 0.05);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  text-align: center;

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #F5F0E6;
    margin-bottom: 24rpx;
  }

  &__bar {
    height: 24rpx;
    background: rgba(201, 168, 124, 0.1);
    border-radius: 12rpx;
    overflow: hidden;
    margin-bottom: 16rpx;
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, #C9A87C, #FFD700);
    border-radius: 12rpx;
    transition: width 0.3s ease;
  }

  &__info {
    margin-bottom: 12rpx;
  }

  &__count {
    font-size: 48rpx;
    font-weight: 700;
    color: #C9A87C;
  }

  &__target {
    font-size: 28rpx;
    color: $u-tips-color;
  }

  &__hint {
    font-size: 24rpx;
    color: $u-content-color;
  }

  &__success {
    font-size: 24rpx;
    color: #4CAF50;
  }
}

.endorse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx;
  background: linear-gradient(135deg, #C9A87C, #A8895F);
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32rpx;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

.notice {
  background: rgba(201, 168, 124, 0.05);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 12rpx;
  padding: 24rpx;

  &__title {
    font-size: 26rpx;
    font-weight: 600;
    color: #C9A87C;
    margin-bottom: 16rpx;
  }

  &__item {
    font-size: 24rpx;
    color: $u-tips-color;
    line-height: 1.8;
  }
}
</style>
