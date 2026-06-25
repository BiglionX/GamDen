<template>
  <view class="admin-index">
    <view class="header">
      <view class="greet">
        <view class="hello">
          运营后台
        </view>
        <view class="user">
          {{ adminStore.profile?.nickname ?? '未登录' }}
          <text class="role">
            · admin
          </text>
        </view>
      </view>
      <view class="logout" @click="onLogout">
        退出
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats">
      <view class="stat-card">
        <view class="num">
          {{ distribution?.totalUnlocked ?? '-' }}
        </view>
        <view class="label">
          已解锁
        </view>
      </view>
      <view class="stat-card">
        <view class="num">
          {{ funnel?.online ?? '-' }}
        </view>
        <view class="label">
          已上线
        </view>
      </view>
      <view class="stat-card highlight">
        <view class="num">
          {{ conversionText }}%
        </view>
        <view class="label">
          总转化率
        </view>
      </view>
    </view>

    <!-- 状态分布饼图（CSS 柱状） -->
    <view class="card">
      <view class="card-title">
        状态分布
      </view>
      <view v-if="distribution" class="bars">
        <view
          v-for="(count, key) in distribution.distribution"
          :key="key"
          class="bar-row"
        >
          <view class="bar-label">
            <view
              class="dot"
              :style="{ background: STATUS_COLOR[key as MiniProgramStatus] }"
            ></view>
            <text>{{ STATUS_LABEL[key as MiniProgramStatus] }}</text>
          </view>
          <view class="bar-track">
            <view
              class="bar-fill"
              :style="{
                width: `${(count / maxStatusCount) * 100}%`,
                background: STATUS_COLOR[key as MiniProgramStatus],
              }"
            ></view>
          </view>
          <view class="bar-num">
            {{ count }}
          </view>
        </view>
      </view>
      <view v-else class="loading">
        加载中...
      </view>
    </view>

    <!-- 转化漏斗 -->
    <view class="card">
      <view class="card-title">
        转化漏斗
      </view>
      <view v-if="funnel" class="funnel">
        <view
          v-for="(stage, idx) in funnelStages"
          :key="stage.key"
          class="funnel-row"
        >
          <view class="funnel-step">
            <view class="funnel-name">
              {{ stage.name }}
            </view>
            <view class="funnel-value">
              {{ stage.value }}
            </view>
            <view class="funnel-rate">
              {{ idx === 0 ? '基准' : formatRate(stage.rate) + '%' }}
            </view>
          </view>
          <view v-if="idx < funnelStages.length - 1" class="funnel-arrow">
            ↓
          </view>
        </view>
      </view>
      <view v-else class="loading">
        加载中...
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="card">
      <view class="card-title">
        快捷入口
      </view>
      <view class="quick-grid">
        <view class="quick-item" @click="goUserList">
          <view class="quick-icon">
            📋
          </view>
          <text>用户列表</text>
        </view>
        <view class="quick-item" @click="goTutorials">
          <view class="quick-icon">
            📚
          </view>
          <text>教程管理</text>
        </view>
        <view class="quick-item" @click="goFaqs">
          <view class="quick-icon">
            ❓
          </view>
          <text>FAQ 管理</text>
        </view>
        <view class="quick-item" @click="goClubs">
          <view class="quick-icon">
            🏠
          </view>
          <text>俱乐部管理</text>
        </view>
        <view class="quick-item" @click="goClubProposals">
          <view class="quick-icon">
            📝
          </view>
          <text>提议审核</text>
        </view>
        <view class="quick-item" @click="goClubVitality">
          <view class="quick-icon">
            ⚡
          </view>
          <text>活力看板</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAdminStore } from '@/stores/admin';
import { adminApi } from '@/utils/admin-api';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type FunnelVo,
  type StatusDistributionVo,
} from '@/types/admin';
import type { MiniProgramStatus } from '@/types/mini-program';

const adminStore = useAdminStore();

const distribution = ref<StatusDistributionVo | null>(null);
const funnel = ref<FunnelVo | null>(null);
const loading = ref(false);

onMounted(() => {
  if (!adminStore.isAdmin) {
    uni.reLaunch({ url: '/pages/admin/login' });
    return;
  }
  load();
});

onShow(() => {
  if (adminStore.isAdmin) load();
});

async function load(): Promise<void> {
  try {
    loading.value = true;
    const [d, f] = await Promise.all([
      adminApi.getStatusDistribution(),
      adminApi.getFunnel(),
    ]);
    distribution.value = d;
    funnel.value = f;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const maxStatusCount = computed(() => {
  if (!distribution.value) return 1;
  const vals = Object.values(distribution.value.distribution);
  return Math.max(1, ...vals);
});

const conversionText = computed(() => {
  if (!funnel.value) return '0';
  return funnel.value.conversion.unlockedToOnline.toFixed(1);
});

interface FunnelStageItem {
  key: string;
  name: string;
  value: number;
  rate: number;
}

const funnelStages = computed<FunnelStageItem[]>(() => {
  if (!funnel.value) return [];
  const f = funnel.value;
  return [
    { key: 'unlocked', name: '已解锁', value: f.unlocked, rate: 0 },
    {
      key: 'apply',
      name: '开始申请',
      value: f.startedApply,
      rate: f.conversion.unlockedToApply,
    },
    {
      key: 'certified',
      name: '认证通过',
      value: f.certified,
      rate: f.conversion.applyToCertified,
    },
    {
      key: 'deploying',
      name: '提交部署',
      value: f.deploying,
      rate: f.conversion.certifiedToDeploying,
    },
    {
      key: 'reviewing',
      name: '代码审核',
      value: f.reviewing,
      rate: f.conversion.deployingToReviewing,
    },
    { key: 'online', name: '已上线', value: f.online, rate: f.conversion.reviewingToOnline },
  ];
});

function formatRate(rate: number): string {
  return Number.isFinite(rate) ? rate.toFixed(1) : '0.0';
}

function goUserList(): void {
  uni.navigateTo({ url: '/pages/admin/user-list' });
}
function goTutorials(): void {
  uni.navigateTo({ url: '/pages/admin/tutorials' });
}
function goFaqs(): void {
  uni.navigateTo({ url: '/pages/admin/faqs' });
}
function goClubs(): void {
  uni.navigateTo({ url: '/pages/admin/clubs' });
}
function goClubProposals(): void {
  uni.navigateTo({ url: '/pages/admin/club-proposals' });
}
function goClubVitality(): void {
  uni.navigateTo({ url: '/pages/admin/club-vitality' });
}

async function onLogout(): Promise<void> {
  await adminStore.logout();
  uni.reLaunch({ url: '/pages/admin/login' });
}
</script>

<style lang="scss" scoped>
.admin-index {
  min-height: 100vh;
  padding: 32rpx 24rpx 80rpx;
  background: #0f120e;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 12rpx 32rpx;

  .greet {
    .hello {
      color: #a89e85;
      font-size: 24rpx;
    }
    .user {
      margin-top: 6rpx;
      color: #e8d9b8;
      font-size: 36rpx;
      font-weight: 600;
      .role {
        margin-left: 8rpx;
        color: #c9a87c;
        font-size: 24rpx;
        font-weight: 400;
      }
    }
  }
  .logout {
    padding: 12rpx 24rpx;
    background: rgba(200, 168, 124, 0.12);
    color: #c9a87c;
    border-radius: 12rpx;
    font-size: 24rpx;
  }
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;

  .stat-card {
    padding: 24rpx 20rpx;
    background: rgba(30, 36, 31, 0.6);
    border: 1rpx solid rgba(200, 168, 124, 0.18);
    border-radius: 16rpx;
    text-align: center;
    &.highlight {
      background: linear-gradient(135deg, rgba(201, 168, 124, 0.16), rgba(168, 132, 90, 0.08));
      border-color: rgba(201, 168, 124, 0.4);
    }
    .num {
      color: #e8d9b8;
      font-size: 40rpx;
      font-weight: 700;
    }
    .label {
      margin-top: 4rpx;
      color: #a89e85;
      font-size: 22rpx;
    }
  }
}

.card {
  margin-bottom: 24rpx;
  padding: 28rpx 24rpx;
  background: rgba(30, 36, 31, 0.6);
  border: 1rpx solid rgba(200, 168, 124, 0.18);
  border-radius: 16rpx;

  .card-title {
    margin-bottom: 20rpx;
    color: #c9a87c;
    font-size: 28rpx;
    font-weight: 600;
  }
}

.bars {
  .bar-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 14rpx;
    .bar-label {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8rpx;
      width: 180rpx;
      color: #e8d9b8;
      font-size: 24rpx;
      .dot {
        width: 14rpx;
        height: 14rpx;
        border-radius: 50%;
      }
    }
    .bar-track {
      flex: 1;
      height: 18rpx;
      background: rgba(200, 168, 124, 0.08);
      border-radius: 9rpx;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 9rpx;
      transition: width 0.6s ease;
    }
    .bar-num {
      width: 60rpx;
      text-align: right;
      color: #a89e85;
      font-size: 24rpx;
    }
  }
}

.funnel {
  .funnel-row {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .funnel-step {
    width: 100%;
    padding: 20rpx 24rpx;
    background: rgba(200, 168, 124, 0.08);
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .funnel-name {
      color: #e8d9b8;
      font-size: 26rpx;
    }
    .funnel-value {
      color: #c9a87c;
      font-size: 32rpx;
      font-weight: 700;
    }
    .funnel-rate {
      color: #a89e85;
      font-size: 22rpx;
    }
  }
  .funnel-arrow {
    color: #c9a87c;
    font-size: 28rpx;
    line-height: 1;
    padding: 4rpx 0;
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  .quick-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 12rpx;
    background: rgba(200, 168, 124, 0.06);
    border: 1rpx solid rgba(200, 168, 124, 0.12);
    border-radius: 12rpx;
    color: #e8d9b8;
    font-size: 24rpx;
    .quick-icon {
      font-size: 44rpx;
      margin-bottom: 8rpx;
    }
  }
}

.loading {
  padding: 40rpx 0;
  text-align: center;
  color: #8a8472;
  font-size: 24rpx;
}
</style>
