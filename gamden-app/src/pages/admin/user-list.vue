<template>
  <view class="user-list">
    <!-- 筛选条 -->
    <view class="filter-bar">
      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="搜索用户昵称 / userId"
          confirm-type="search"
          @confirm="onSearch"
        />
        <button class="search-btn" @click="onSearch">
          搜索
        </button>
      </view>

      <scroll-view scroll-x class="status-tabs" show-scrollbar="false">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab"
          :class="{ active: query.status === tab.value }"
          @click="onStatusChange(tab.value)"
        >
          {{ tab.label }}
        </view>
      </scroll-view>

      <view class="filter-row">
        <picker
          mode="selector"
          :range="certOptions"
          :value="certIndex"
          @change="onCertChange"
        >
          <view class="picker">
            主体：{{ certOptions[certIndex] ?? '全部' }}
            <text class="arrow">
              ▾
            </text>
          </view>
        </picker>
        <picker
          mode="selector"
          :range="sortOptions"
          :value="sortIndex"
          @change="onSortChange"
        >
          <view class="picker">
            排序：{{ sortOptions[sortIndex] }}
            <text class="arrow">
              ▾
            </text>
          </view>
        </picker>
        <picker
          mode="selector"
          :range="orderOptions"
          :value="order === 'desc' ? 0 : 1"
          @change="onOrderChange"
        >
          <view class="picker">
            {{ order === 'desc' ? '降序' : '升序' }}
            <text class="arrow">
              ▾
            </text>
          </view>
        </picker>
      </view>
    </view>

    <!-- 列表 -->
    <view class="list">
      <view
        v-for="item in list"
        :key="item.userId"
        class="list-item"
        @click="goDetail(item.userId)"
      >
        <view class="row1">
          <view class="nickname">
            {{ item.nickname }}
          </view>
          <view
            class="status-badge"
            :style="{ background: STATUS_COLOR[item.status] }"
          >
            {{ STATUS_LABEL[item.status] }}
          </view>
        </view>
        <view class="row2">
          <text class="phone">
            {{ item.phoneMasked }}
          </text>
          <text v-if="item.certificationType" class="cert">
            · {{ CERT_LABEL[item.certificationType] }}
          </text>
          <text v-if="item.appidMasked" class="appid">
            · {{ item.appidMasked }}
          </text>
        </view>
        <view class="row3">
          <text v-if="item.qualificationUnlockedAt">
            解锁：{{ formatDate(item.qualificationUnlockedAt) }}
          </text>
          <text v-if="item.certSubmittedAt">
            · 认证：{{ formatDate(item.certSubmittedAt) }}
          </text>
          <text v-if="item.onlineAt" class="online">
            · 上线：{{ formatDate(item.onlineAt) }}
          </text>
        </view>
      </view>

      <view v-if="loading && list.length === 0" class="empty">
        加载中...
      </view>
      <view v-else-if="list.length === 0" class="empty">
        暂无数据
      </view>

      <view v-if="list.length > 0" class="pagination">
        <button
          class="page-btn"
          :disabled="page <= 1"
          @click="onPageChange(page - 1)"
        >
          上一页
        </button>
        <text class="page-info">
          {{ page }} / {{ totalPages }} (共 {{ total }})
        </text>
        <button
          class="page-btn"
          :disabled="page >= totalPages"
          @click="onPageChange(page + 1)"
        >
          下一页
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/utils/admin-api';
import { useAdminStore } from '@/stores/admin';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  CERT_LABEL,
  type MiniProgramUserListItem,
  type MiniProgramStatus,
  type CertificationType,
} from '@/types/admin';

const adminStore = useAdminStore();

const keyword = ref('');
const list = ref<MiniProgramUserListItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);

const query = ref<{
  status: MiniProgramStatus | '';
  certificationType: CertificationType | '';
  sortBy: 'createdAt' | 'unlockedAt' | 'onlineAt' | 'updatedAt';
}>({
  status: '',
  certificationType: '',
  sortBy: 'createdAt',
});
const order = ref<'asc' | 'desc'>('desc');

const statusTabs: { value: MiniProgramStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'not_started', label: '未开始' },
  { value: 'certifying', label: '认证中' },
  { value: 'certified', label: '认证通过' },
  { value: 'deploying', label: '待部署' },
  { value: 'reviewing', label: '审核中' },
  { value: 'online', label: '已上线' },
];

const certOptions = ['全部', '个人主体', '企业/个体户'];
const certIndex = computed(() => {
  if (query.value.certificationType === 'individual') return 1;
  if (query.value.certificationType === 'enterprise') return 2;
  return 0;
});

const sortOptions = ['创建时间', '解锁时间', '上线时间', '更新时间'];
const sortMap: Array<'createdAt' | 'unlockedAt' | 'onlineAt' | 'updatedAt'> = [
  'createdAt',
  'unlockedAt',
  'onlineAt',
  'updatedAt',
];
const sortIndex = computed(() => sortMap.indexOf(query.value.sortBy));

const orderOptions = ['降序', '升序'];

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

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
    const res = await adminApi.listUsers({
      page: page.value,
      pageSize,
      status: query.value.status || undefined,
      certificationType: query.value.certificationType || undefined,
      keyword: keyword.value.trim() || undefined,
      sortBy: query.value.sortBy,
      order: order.value,
    });
    list.value = res.list;
    total.value = res.total;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  page.value = 1;
  load();
}

function onStatusChange(v: MiniProgramStatus | ''): void {
  query.value.status = v;
  page.value = 1;
  load();
}

function onCertChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  query.value.certificationType = idx === 1 ? 'individual' : idx === 2 ? 'enterprise' : '';
  page.value = 1;
  load();
}

function onSortChange(e: { detail: { value: number } }): void {
  query.value.sortBy = sortMap[e.detail.value] ?? 'createdAt';
  page.value = 1;
  load();
}

function onOrderChange(e: { detail: { value: number } }): void {
  order.value = e.detail.value === 0 ? 'desc' : 'asc';
  page.value = 1;
  load();
}

function onPageChange(p: number): void {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  load();
}

function goDetail(userId: string): void {
  uni.navigateTo({ url: `/pages/admin/user-detail?id=${userId}` });
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
</script>

<style lang="scss" scoped>
.user-list {
  min-height: 100vh;
  background: #0f120e;
}

.filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 20rpx 24rpx 12rpx;
  background: #1e241f;
  border-bottom: 1rpx solid rgba(200, 168, 124, 0.18);
}

.search-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  .search-input {
    flex: 1;
    height: 72rpx;
    padding: 0 20rpx;
    background: rgba(0, 0, 0, 0.3);
    border: 1rpx solid rgba(200, 168, 124, 0.2);
    border-radius: 12rpx;
    color: #e8d9b8;
    font-size: 26rpx;
  }
  .search-btn {
    flex-shrink: 0;
    height: 72rpx;
    line-height: 72rpx;
    padding: 0 24rpx;
    background: rgba(200, 168, 124, 0.2);
    color: #c9a87c;
    border-radius: 12rpx;
    font-size: 24rpx;
  }
}

.status-tabs {
  white-space: nowrap;
  margin-bottom: 12rpx;
  .tab {
    display: inline-block;
    margin-right: 12rpx;
    padding: 12rpx 24rpx;
    background: rgba(200, 168, 124, 0.08);
    color: #a89e85;
    border-radius: 24rpx;
    font-size: 24rpx;
    &.active {
      background: #c9a87c;
      color: #1e241f;
      font-weight: 600;
    }
  }
}

.filter-row {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  .picker {
    padding: 10rpx 20rpx;
    background: rgba(0, 0, 0, 0.3);
    color: #c9a87c;
    border: 1rpx solid rgba(200, 168, 124, 0.2);
    border-radius: 12rpx;
    font-size: 24rpx;
    .arrow {
      margin-left: 4rpx;
    }
  }
}

.list {
  padding: 16rpx 24rpx 80rpx;
}

.list-item {
  padding: 24rpx 24rpx;
  margin-bottom: 16rpx;
  background: rgba(30, 36, 31, 0.6);
  border: 1rpx solid rgba(200, 168, 124, 0.18);
  border-radius: 16rpx;
  .row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
    .nickname {
      color: #e8d9b8;
      font-size: 30rpx;
      font-weight: 600;
    }
    .status-badge {
      padding: 4rpx 16rpx;
      color: #1e241f;
      border-radius: 16rpx;
      font-size: 22rpx;
      font-weight: 600;
    }
  }
  .row2 {
    margin-bottom: 6rpx;
    color: #a89e85;
    font-size: 24rpx;
    .cert {
      color: #c9a87c;
    }
    .appid {
      color: #7CB6E0;
    }
  }
  .row3 {
    color: #8a8472;
    font-size: 22rpx;
    .online {
      color: #7CC97C;
    }
  }
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #8a8472;
  font-size: 26rpx;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 24rpx 0;
  .page-btn {
    padding: 12rpx 24rpx;
    background: rgba(200, 168, 124, 0.18);
    color: #c9a87c;
    border-radius: 12rpx;
    font-size: 24rpx;
  }
  .page-btn[disabled] {
    opacity: 0.4;
  }
  .page-info {
    color: #a89e85;
    font-size: 24rpx;
  }
}
</style>
