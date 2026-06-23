<template>
  <view class="faqs">
    <view class="top-bar">
      <picker
        mode="selector"
        :range="stageOptions"
        :value="stageIndex"
        @change="onStageChange"
      >
        <view class="picker">
          阶段：{{ stageOptions[stageIndex] }}
          <text class="arrow">▾</text>
        </view>
      </picker>
      <button class="add-btn" @click="onCreate">+ 新建 FAQ</button>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无 FAQ</view>

    <view v-for="f in list" :key="f.id" class="card">
      <view class="row1">
        <view class="q">Q. {{ f.question }}</view>
        <view class="badges">
          <view class="badge stage">{{ stageLabel(f.stage) }}</view>
          <view class="badge" :class="f.isActive ? 'on' : 'off'">
            {{ f.isActive ? '已启用' : '已停用' }}
          </view>
        </view>
      </view>
      <view class="a">A. {{ f.answer }}</view>
      <view class="actions">
        <button class="mini-btn" @click="onEdit(f)">编辑</button>
        <button class="mini-btn" @click="onToggle(f)">
          {{ f.isActive ? '停用' : '启用' }}
        </button>
        <button class="mini-btn danger" @click="onDelete(f)">删除</button>
      </view>
    </view>

    <view v-if="editing" class="modal-mask" @click.self="cancelEdit">
      <view class="modal">
        <view class="modal-title">{{ editing.id ? '编辑 FAQ' : '新建 FAQ' }}</view>
        <view class="form">
          <view class="form-item">
            <text class="label">阶段</text>
            <picker
              mode="selector"
              :range="stageOptions.slice(1)"
              :value="stageOptions.slice(1).indexOf(stageLabel(editing!.stage))"
              @change="onEditingStageChange"
            >
              <view class="picker">
                {{ stageLabel(editing!.stage) }}
                <text class="arrow">▾</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">问题</text>
            <textarea
              v-model="editing!.question"
              class="textarea"
              placeholder="用户可能问到的问题"
            />
          </view>
          <view class="form-item">
            <text class="label">答案</text>
            <textarea
              v-model="editing!.answer"
              class="textarea large"
              placeholder="答案（支持换行）"
            />
          </view>
          <view class="form-item">
            <text class="label">排序</text>
            <input
              v-model.number="editing!.sortOrder"
              class="input"
              type="number"
            />
          </view>
          <view class="form-item">
            <text class="label">启用</text>
            <switch
              :checked="editing!.isActive"
              @change="onEditingActiveChange"
              color="#c9a87c"
            />
          </view>
        </view>
        <view class="modal-actions">
          <button class="modal-btn" @click="cancelEdit">取消</button>
          <button class="modal-btn primary" :disabled="saving" @click="onSave">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/utils/admin-api';
import { useAdminStore } from '@/stores/admin';
import type { Faq } from '@/types/admin';

const adminStore = useAdminStore();

const list = ref<Faq[]>([]);
const loading = ref(false);
const saving = ref(false);
const stage = ref<string>('');
const stageKeys = ['', 'apply', 'appid', 'review', 'online', 'general'];
const stageOptions = ['全部', '申请', 'AppID', '代码审核', '上线', '通用'];
const stageIndex = ref(0);
const editing = ref<Faq | null>(null);

function stageLabel(s: string): string {
  const map: Record<string, string> = {
    apply: '申请',
    appid: 'AppID',
    review: '代码审核',
    online: '上线',
    general: '通用',
  };
  return map[s] ?? s;
}

onMounted(() => {
  if (!adminStore.isAdmin) {
    uni.reLaunch({ url: '/pages/admin/login' });
    return;
  }
  load();
});

async function load(): Promise<void> {
  try {
    loading.value = true;
    list.value = await adminApi.listFaqs({
      stage: stage.value || undefined,
      includeInactive: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function onStageChange(e: { detail: { value: number } }): void {
  stageIndex.value = e.detail.value;
  stage.value = stageKeys[e.detail.value] ?? '';
  load();
}

function onEditingStageChange(e: { detail: { value: number } }): void {
  if (editing.value) {
    editing.value.stage = (stageKeys[e.detail.value + 1] ?? 'general') as Faq['stage'];
  }
}

function onEditingActiveChange(e: unknown): void {
  if (editing.value) {
    const detail = (e as { detail: { value: boolean } }).detail;
    editing.value.isActive = !!detail.value;
  }
}

function onCreate(): void {
  editing.value = {
    id: '',
    stage: 'general',
    question: '',
    answer: '',
    sortOrder: 1000,
    isActive: true,
  };
}

function onEdit(f: Faq): void {
  editing.value = { ...f };
}

function cancelEdit(): void {
  editing.value = null;
}

async function onSave(): Promise<void> {
  if (!editing.value) return;
  if (!editing.value.question.trim() || !editing.value.answer.trim()) {
    uni.showToast({ title: '请填写问题和答案', icon: 'none' });
    return;
  }
  try {
    saving.value = true;
    if (editing.value.id) {
      await adminApi.updateFaq(editing.value.id, editing.value);
      uni.showToast({ title: '已更新', icon: 'success' });
    } else {
      const { id: _id, ...payload } = editing.value;
      await adminApi.createFaq(payload);
      uni.showToast({ title: '已创建', icon: 'success' });
    }
    editing.value = null;
    load();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    saving.value = false;
  }
}

async function onToggle(f: Faq): Promise<void> {
  try {
    await adminApi.updateFaq(f.id, { isActive: !f.isActive });
    load();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '操作失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

async function onDelete(f: Faq): Promise<void> {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${f.question}」吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.deleteFaq(f.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : '删除失败';
        uni.showToast({ title: msg, icon: 'none' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.faqs {
  min-height: 100vh;
  padding: 16rpx 24rpx 80rpx;
  background: #0f120e;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0 24rpx;
  gap: 16rpx;
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
  .add-btn {
    height: 64rpx;
    line-height: 64rpx;
    padding: 0 24rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #a8845a 100%);
    color: #1e241f;
    border-radius: 12rpx;
    font-size: 24rpx;
    font-weight: 600;
  }
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: #8a8472;
  font-size: 26rpx;
}

.card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  background: rgba(30, 36, 31, 0.6);
  border: 1rpx solid rgba(200, 168, 124, 0.18);
  border-radius: 16rpx;
  .row1 {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12rpx;
    .q {
      flex: 1;
      color: #e8d9b8;
      font-size: 28rpx;
      font-weight: 600;
    }
    .badges {
      display: flex;
      gap: 8rpx;
      .badge {
        padding: 4rpx 12rpx;
        border-radius: 16rpx;
        font-size: 20rpx;
        &.stage {
          background: rgba(200, 168, 124, 0.18);
          color: #c9a87c;
        }
        &.on {
          background: rgba(124, 201, 124, 0.18);
          color: #7CC97C;
        }
        &.off {
          background: rgba(168, 158, 133, 0.18);
          color: #a89e85;
        }
      }
    }
  }
  .a {
    margin-bottom: 16rpx;
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
  }
  .actions {
    display: flex;
    gap: 12rpx;
    .mini-btn {
      flex: 1;
      height: 64rpx;
      line-height: 64rpx;
      padding: 0;
      background: rgba(200, 168, 124, 0.12);
      color: #c9a87c;
      border-radius: 10rpx;
      font-size: 24rpx;
    }
    .mini-btn.danger {
      background: rgba(220, 100, 100, 0.16);
      color: #ff8888;
    }
  }
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}

.modal {
  width: 100%;
  max-height: 80vh;
  padding: 32rpx 24rpx 24rpx;
  background: #1e241f;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  overflow-y: auto;
  .modal-title {
    margin-bottom: 20rpx;
    color: #c9a87c;
    font-size: 32rpx;
    font-weight: 600;
    text-align: center;
  }
}

.form-item {
  margin-bottom: 18rpx;
  .label {
    display: block;
    margin-bottom: 8rpx;
    color: #a89e85;
    font-size: 24rpx;
  }
  .input,
  .textarea,
  .picker {
    width: 100%;
    padding: 12rpx 20rpx;
    background: rgba(0, 0, 0, 0.3);
    color: #e8d9b8;
    border: 1rpx solid rgba(200, 168, 124, 0.2);
    border-radius: 12rpx;
    font-size: 26rpx;
    box-sizing: border-box;
  }
  .textarea {
    min-height: 120rpx;
    &.large {
      min-height: 200rpx;
    }
  }
  .picker {
    display: flex;
    align-items: center;
    .arrow {
      margin-left: auto;
    }
  }
}

.modal-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  .modal-btn {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
    background: rgba(200, 168, 124, 0.12);
    color: #c9a87c;
  }
  .modal-btn.primary {
    background: linear-gradient(135deg, #c9a87c 0%, #a8845a 100%);
    color: #1e241f;
    font-weight: 600;
  }
  .modal-btn[disabled] {
    opacity: 0.4;
  }
}
</style>
