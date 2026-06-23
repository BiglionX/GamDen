<template>
  <view class="user-detail">
    <view v-if="loading && !detail" class="loading">加载中...</view>

    <template v-else-if="detail">
      <!-- 基础信息 -->
      <view class="card">
        <view class="card-title">基础信息</view>
        <view class="kv">
          <text class="k">用户ID</text>
          <text class="v mono">{{ detail.userId }}</text>
        </view>
        <view class="kv">
          <text class="k">昵称</text>
          <text class="v">{{ detail.nickname }}</text>
        </view>
        <view class="kv">
          <text class="k">手机号</text>
          <text class="v">{{ detail.phoneMasked }}</text>
        </view>
        <view class="kv">
          <text class="k">邀请人数</text>
          <text class="v">{{ detail.invitedCount }}</text>
        </view>
        <view class="kv">
          <text class="k">最后登录</text>
          <text class="v">{{ formatDate(detail.lastLoginAt) }}</text>
        </view>
      </view>

      <!-- 状态信息 -->
      <view class="card">
        <view class="card-title">申请状态</view>
        <view class="status-bar">
          <view
            class="status-pill"
            :style="{ background: STATUS_COLOR[detail.status] }"
          >
            {{ STATUS_LABEL[detail.status] }}
          </view>
          <text class="status-step">{{ statusStep }}</text>
        </view>

        <view class="kv">
          <text class="k">主体类型</text>
          <text class="v">
            {{ detail.certificationType ? CERT_LABEL[detail.certificationType] : '未提交' }}
          </text>
        </view>
        <view class="kv">
          <text class="k">AppID</text>
          <text class="v mono">{{ detail.appidMasked ?? '未提交' }}</text>
        </view>
        <view class="kv">
          <text class="k">自定义名称</text>
          <text class="v">{{ detail.customName ?? '-' }}</text>
        </view>
        <view class="kv">
          <text class="k">获得资格</text>
          <text class="v">{{ formatDate(detail.qualificationUnlockedAt) }}</text>
        </view>
        <view class="kv">
          <text class="k">认证提交</text>
          <text class="v">{{ formatDate(detail.certSubmittedAt) }}</text>
        </view>
        <view class="kv">
          <text class="k">AppID 提交</text>
          <text class="v">{{ formatDate(detail.appidSubmittedAt) }}</text>
        </view>
        <view class="kv">
          <text class="k">代码提交审核</text>
          <text class="v">{{ formatDate(detail.codeSubmittedAt) }}</text>
        </view>
        <view class="kv">
          <text class="k">上线时间</text>
          <text class="v">{{ formatDate(detail.onlineAt) }}</text>
        </view>
      </view>

      <!-- 操作：推进状态 -->
      <view class="card">
        <view class="card-title">手动推进状态</view>
        <view class="kv">
          <text class="k">目标状态</text>
          <picker
            mode="selector"
            :range="targetStatusOptions"
            :value="targetStatusIndex"
            @change="onTargetStatusChange"
          >
            <view class="picker">
              {{ targetStatusOptions[targetStatusIndex] }}
              <text class="arrow">▾</text>
            </view>
          </picker>
        </view>
        <view v-if="needCertType" class="kv">
          <text class="k">认证主体</text>
          <picker
            mode="selector"
            :range="certTypeOptions"
            :value="certTypeIndex"
            @change="onCertTypeChange"
          >
            <view class="picker">
              {{ certTypeOptions[certTypeIndex] }}
              <text class="arrow">▾</text>
            </view>
          </picker>
        </view>
        <view class="kv">
          <text class="k">备注</text>
          <input
            v-model="advanceRemark"
            class="input"
            placeholder="（可选）操作原因"
          />
        </view>
        <view class="kv">
          <text class="k">强制覆盖</text>
          <switch :checked="advanceForce" @change="onForceChange" color="#c9a87c" />
        </view>
        <button
          class="primary-btn"
          :disabled="advancing || !targetStatus"
          @click="onAdvance"
        >
          {{ advancing ? '处理中...' : '推进状态' }}
        </button>
      </view>

      <!-- 操作：发送提醒 -->
      <view class="card">
        <view class="card-title">发送提醒推送</view>
        <view class="kv">
          <text class="k">推送场景</text>
          <picker
            mode="selector"
            :range="reminderSceneOptions"
            :value="reminderSceneIndex"
            @change="onReminderSceneChange"
          >
            <view class="picker">
              {{ reminderSceneOptions[reminderSceneIndex] }}
              <text class="arrow">▾</text>
            </view>
          </picker>
        </view>
        <view v-if="reminderScene === 'custom'" class="form-block">
          <view class="kv">
            <text class="k">自定义标题</text>
            <input v-model="reminderTitle" class="input" placeholder="推送标题" />
          </view>
          <view class="kv">
            <text class="k">自定义内容</text>
            <textarea
              v-model="reminderContent"
              class="textarea"
              placeholder="推送内容"
            />
          </view>
        </view>
        <view class="kv">
          <text class="k">备注</text>
          <input v-model="reminderRemark" class="input" placeholder="（可选）运营备注" />
        </view>
        <button
          class="secondary-btn"
          :disabled="sending || (reminderScene === 'custom' && (!reminderTitle || !reminderContent))"
          @click="onSendReminder"
        >
          {{ sending ? '发送中...' : '发送提醒' }}
        </button>
      </view>

      <!-- 操作日志 -->
      <view class="card">
        <view class="card-title">操作日志</view>
        <view v-if="logs.length === 0" class="empty-mini">暂无日志</view>
        <view v-for="log in logs" :key="log.id" class="log-item">
          <view class="log-row1">
            <text class="log-action">{{ log.actionLabel }}</text>
            <text class="log-time">{{ formatDate(log.createdAt) }}</text>
          </view>
          <view v-if="log.fromStatus || log.toStatus" class="log-row2">
            {{ log.fromStatus ? STATUS_LABEL[log.fromStatus] : '-' }}
            → {{ log.toStatus ? STATUS_LABEL[log.toStatus] : '-' }}
          </view>
          <view v-if="log.actorName || log.actorId" class="log-row3">
            操作人：{{ log.actorName ?? log.actorId }}
          </view>
          <view v-if="log.remark" class="log-row4">备注：{{ log.remark }}</view>
        </view>
        <view v-if="logsTotal > logs.length" class="log-more" @click="loadMoreLogs">
          点击加载更多 ({{ logs.length }} / {{ logsTotal }})
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { adminApi } from '@/utils/admin-api';
import { useAdminStore } from '@/stores/admin';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  CERT_LABEL,
  type MiniProgramUserDetail,
  type MiniProgramLogItem,
  type MiniProgramStatus,
  type CertificationType,
  type ReminderScene,
} from '@/types/admin';

const adminStore = useAdminStore();

const userId = ref('');
const detail = ref<MiniProgramUserDetail | null>(null);
const logs = ref<(MiniProgramLogItem & { actionLabel: string })[]>([]);
const logsTotal = ref(0);
const logsPage = ref(1);
const loading = ref(false);
const advancing = ref(false);
const sending = ref(false);

const targetStatus = ref<MiniProgramStatus | ''>('');
const targetCertType = ref<CertificationType | ''>('');
const advanceRemark = ref('');
const advanceForce = ref(false);

const reminderScene = ref<ReminderScene>('mini_program_stale');
const reminderTitle = ref('');
const reminderContent = ref('');
const reminderRemark = ref('');

const allStatuses: MiniProgramStatus[] = [
  'not_started',
  'certifying',
  'certified',
  'deploying',
  'reviewing',
  'online',
];
const targetStatusOptions = allStatuses.map((s) => STATUS_LABEL[s]);
const targetStatusIndex = computed(() =>
  targetStatus.value ? allStatuses.indexOf(targetStatus.value) : 0,
);

const certTypeOptions = ['个人主体', '企业/个体户'];
const certTypeIndex = computed(() =>
  targetCertType.value === 'individual' ? 0 : targetCertType.value === 'enterprise' ? 1 : 0,
);

const reminderSceneOptions = [
  '邀请达标',
  '认证通过',
  '已上线',
  '长期未推进',
  '自定义',
];
const reminderSceneMap: ReminderScene[] = [
  'mini_program_unlocked',
  'mini_program_certified',
  'mini_program_online',
  'mini_program_stale',
  'custom',
];
const reminderSceneIndex = computed(() =>
  reminderSceneMap.indexOf(reminderScene.value),
);

const needCertType = computed(
  () => targetStatus.value === 'certifying' || targetStatus.value === 'certified',
);

const statusStep = computed(() => {
  if (!detail.value) return '';
  const i = allStatuses.indexOf(detail.value.status);
  return `阶段 ${i + 1} / ${allStatuses.length}`;
});

const actionLabels: Record<string, string> = {
  manual_advance: '手动推进',
  send_reminder: '发送提醒',
  admin_reset: '强制重置',
  admin_view_detail: '查看详情',
};

onLoad((options) => {
  if (!adminStore.isAdmin) {
    uni.reLaunch({ url: '/pages/admin/login' });
    return;
  }
  if (options?.id) {
    userId.value = String(options.id);
    loadAll();
  }
});

onMounted(() => {
  if (userId.value) loadAll();
});

async function loadAll(): Promise<void> {
  await Promise.all([loadDetail(), loadLogs(true)]);
}

async function loadDetail(): Promise<void> {
  try {
    loading.value = true;
    detail.value = await adminApi.getUserDetail(userId.value);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function loadLogs(reset = false): Promise<void> {
  try {
    if (reset) {
      logsPage.value = 1;
    }
    const res = await adminApi.listUserLogs(userId.value, logsPage.value, 20);
    const items = res.list.map((l) => ({
      ...l,
      actionLabel: actionLabels[l.action] ?? l.action,
    }));
    logs.value = reset ? items : [...logs.value, ...items];
    logsTotal.value = res.total;
  } catch {
    // ignore
  }
}

function loadMoreLogs(): void {
  logsPage.value += 1;
  loadLogs(false);
}

function onTargetStatusChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  targetStatus.value = allStatuses[idx] ?? '';
}

function onCertTypeChange(e: { detail: { value: number } }): void {
  targetCertType.value = e.detail.value === 0 ? 'individual' : 'enterprise';
}

function onForceChange(e: { detail: { value: boolean } } | unknown): void {
  const detail = (e as { detail: { value: boolean } }).detail;
  advanceForce.value = !!detail.value;
}

function onReminderSceneChange(e: { detail: { value: number } }): void {
  reminderScene.value = reminderSceneMap[e.detail.value] ?? 'mini_program_stale';
  if (reminderScene.value !== 'custom') {
    reminderTitle.value = '';
    reminderContent.value = '';
  }
}

async function onAdvance(): Promise<void> {
  if (!targetStatus.value || !detail.value) return;
  try {
    advancing.value = true;
    const updated = await adminApi.manualAdvance(userId.value, {
      toStatus: targetStatus.value,
      certificationType: needCertType.value
        ? (targetCertType.value || detail.value.certificationType || 'individual')
        : undefined,
      remark: advanceRemark.value.trim() || undefined,
      force: advanceForce.value,
    });
    detail.value = updated;
    advanceRemark.value = '';
    advanceForce.value = false;
    targetStatus.value = '';
    uni.showToast({ title: '已推进', icon: 'success' });
    loadLogs(true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '推进失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    advancing.value = false;
  }
}

async function onSendReminder(): Promise<void> {
  if (!reminderScene.value) return;
  try {
    sending.value = true;
    await adminApi.sendReminder(userId.value, {
      scene: reminderScene.value,
      title: reminderScene.value === 'custom' ? reminderTitle.value : undefined,
      content: reminderScene.value === 'custom' ? reminderContent.value : undefined,
      remark: reminderRemark.value.trim() || undefined,
    });
    uni.showToast({ title: '已发送', icon: 'success' });
    reminderRemark.value = '';
    loadLogs(true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '发送失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    sending.value = false;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<style lang="scss" scoped>
.user-detail {
  min-height: 100vh;
  padding: 16rpx 24rpx 80rpx;
  background: #0f120e;
}

.loading {
  padding: 80rpx 0;
  text-align: center;
  color: #8a8472;
  font-size: 26rpx;
}

.card {
  margin-bottom: 20rpx;
  padding: 24rpx 24rpx;
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

.kv {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(200, 168, 124, 0.08);
  .k {
    flex-shrink: 0;
    width: 180rpx;
    color: #a89e85;
    font-size: 24rpx;
  }
  .v {
    flex: 1;
    color: #e8d9b8;
    font-size: 26rpx;
    word-break: break-all;
    &.mono {
      font-family: monospace;
      color: #c9a87c;
    }
  }
  .picker {
    flex: 1;
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
  .input,
  .textarea {
    flex: 1;
    padding: 12rpx 20rpx;
    background: rgba(0, 0, 0, 0.3);
    color: #e8d9b8;
    border: 1rpx solid rgba(200, 168, 124, 0.2);
    border-radius: 12rpx;
    font-size: 24rpx;
  }
  .textarea {
    min-height: 120rpx;
  }
}
.kv:last-child {
  border-bottom: none;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  .status-pill {
    padding: 8rpx 24rpx;
    color: #1e241f;
    border-radius: 24rpx;
    font-size: 26rpx;
    font-weight: 600;
  }
  .status-step {
    color: #a89e85;
    font-size: 24rpx;
  }
}

.form-block {
  margin: 12rpx 0;
}

.primary-btn,
.secondary-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 24rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.primary-btn {
  background: linear-gradient(135deg, #c9a87c 0%, #a8845a 100%);
  color: #1e241f;
}
.secondary-btn {
  background: rgba(200, 168, 124, 0.18);
  color: #c9a87c;
}
.primary-btn[disabled],
.secondary-btn[disabled] {
  opacity: 0.4;
}

.log-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(200, 168, 124, 0.08);
  .log-row1 {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4rpx;
    .log-action {
      color: #c9a87c;
      font-size: 26rpx;
      font-weight: 600;
    }
    .log-time {
      color: #8a8472;
      font-size: 22rpx;
    }
  }
  .log-row2 {
    color: #7CB6E0;
    font-size: 24rpx;
  }
  .log-row3 {
    color: #a89e85;
    font-size: 22rpx;
  }
  .log-row4 {
    color: #e8d9b8;
    font-size: 22rpx;
  }
}
.log-item:last-child {
  border-bottom: none;
}

.log-more {
  padding: 16rpx 0;
  text-align: center;
  color: #c9a87c;
  font-size: 24rpx;
}

.empty-mini {
  padding: 32rpx 0;
  text-align: center;
  color: #8a8472;
  font-size: 24rpx;
}
</style>
