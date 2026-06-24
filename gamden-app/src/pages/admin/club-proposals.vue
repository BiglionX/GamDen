<script setup lang="ts">
/**
 * 提议审核页面
 */
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/utils/admin-api';

const loading = ref(false);
const proposals = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const statusFilter = ref('pending');

const STATUS_OPTIONS = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
];

async function loadProposals(reset = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    const res = await adminApi.getProposalReviewList({
      page: page.value,
      limit,
      status: statusFilter.value || undefined,
    });
    if (reset) {
      proposals.value = res.proposals;
    } else {
      proposals.value = [...proposals.value, ...res.proposals];
    }
    total.value = res.total;
  } catch (e) {
    console.error('加载失败', e);
  } finally {
    loading.value = false;
  }
}

function onStatusChange(e: any) {
  statusFilter.value = STATUS_OPTIONS[e.detail.value]?.value || '';
  page.value = 1;
  loadProposals(true);
}

function onRefresh() {
  page.value = 1;
  loadProposals(true);
}

function onReachBottom() {
  if (proposals.value.length < total.value) {
    page.value++;
    loadProposals(false);
  }
}

async function onApprove(id: number) {
  uni.showModal({
    title: '确认批准',
    content: '确定要批准这个俱乐部提议吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.reviewProposal(id, 'approve');
          uni.showToast({ title: '已批准', icon: 'success' });
          loadProposals(true);
        } catch (e: any) {
          uni.showToast({ title: e.message || '操作失败', icon: 'none' });
        }
      }
    },
  });
}

async function onReject(id: number) {
  uni.showModal({
    title: '确认驳回',
    content: '确定要驳回这个俱乐部提议吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.reviewProposal(id, 'reject');
          uni.showToast({ title: '已驳回', icon: 'success' });
          loadProposals(true);
        } catch (e: any) {
          uni.showToast({ title: e.message || '操作失败', icon: 'none' });
        }
      }
    },
  });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#FFC107',
    approved: '#4CAF50',
    rejected: '#F44336',
  };
  return colors[status] || '#9E9E9E';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  };
  return texts[status] || status;
}

function formatTime(time: string): string {
  if (!time) return '';
  return time.slice(0, 10);
}

onMounted(() => {
  loadProposals(true);
});

onShow(() => {
  if (proposals.value.length === 0) {
    loadProposals(true);
  }
});
</script>

<template>
  <view class="page-proposals">
    <!-- 状态筛选 -->
    <view class="filter-bar">
      <picker :value="STATUS_OPTIONS.findIndex((s) => s.value === statusFilter)" :range="STATUS_OPTIONS" range-key="label" @change="onStatusChange">
        <view class="filter-item">
          <text>{{ STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || '全部' }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 统计 -->
    <view class="stats">
      <text>共 {{ total }} 条提议</text>
    </view>

    <!-- 列表 -->
    <scroll-view class="list" scroll-y @scrolltolower="onReachBottom">
      <view v-for="proposal in proposals" :key="proposal.id" class="proposal-item">
        <view class="proposal-item__header">
          <text class="proposal-item__name">{{ proposal.name }}</text>
          <view class="proposal-item__status" :style="{ color: getStatusColor(proposal.status) }">
            {{ getStatusText(proposal.status) }}
          </view>
        </view>
        <text class="proposal-item__desc">{{ proposal.description }}</text>
        <view class="proposal-item__meta">
          <text>提议人：{{ proposal.proposer_name }}</text>
          <text>联署：{{ proposal.endorsement_count }}人</text>
          <text>{{ formatTime(proposal.created_at) }}</text>
        </view>
        <view class="proposal-item__actions" v-if="proposal.status === 'pending'">
          <view class="btn btn--reject" @tap="onReject(proposal.id)">
            <text>驳回</text>
          </view>
          <view class="btn btn--approve" @tap="onApprove(proposal.id)">
            <text>批准</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="proposals.length >= total && total > 0" class="no-more">没有更多了</view>
      <view v-else-if="proposals.length === 0" class="empty">暂无数据</view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page-proposals {
  min-height: 100vh;
  background: $u-bg-color;
}

.filter-bar {
  padding: 24rpx;
}

.filter-item {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: rgba(201, 168, 124, 0.1);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #F5F0E6;

  .arrow {
    font-size: 18rpx;
    color: #A89E85;
  }
}

.stats {
  padding: 0 24rpx 16rpx;
  font-size: 24rpx;
  color: $u-tips-color;
}

.list {
  height: calc(100vh - 160rpx);
  padding: 0 24rpx;
}

.proposal-item {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: #F5F0E6;
  }

  &__status {
    font-size: 22rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: $u-tips-color;
    line-height: 1.5;
    margin-bottom: 12rpx;
  }

  &__meta {
    display: flex;
    gap: 24rpx;
    font-size: 22rpx;
    color: $u-content-color;
    margin-bottom: 16rpx;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
    justify-content: flex-end;
  }
}

.btn {
  padding: 12rpx 32rpx;
  border-radius: 24rpx;
  font-size: 24rpx;

  &--approve {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
  }

  &--reject {
    background: rgba(244, 67, 54, 0.2);
    color: #F44336;
  }
}

.loading,
.no-more,
.empty {
  text-align: center;
  padding: 32rpx;
  color: $u-tips-color;
  font-size: 24rpx;
}
</style>
