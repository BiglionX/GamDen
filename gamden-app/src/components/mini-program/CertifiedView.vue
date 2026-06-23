<script setup lang="ts">
/**
 * CertifiedView —— 状态 3 视图（认证通过，待部署）
 *
 * UI 内容：
 *  - 蓝色徽章 + "认证通过，请完成部署"
 *  - 显示获取 AppID 的图文步骤
 *  - 输入框：用户输入 AppID
 *  - 提交按钮：【确认提交】（调用 API 校验 AppID）
 *  - 错误提示：AppID 无效时的反馈
 *
 * 技术要点：
 *  - AppID 输入做 350ms 防抖校验（仅前端格式校验，AppSecret 不做格式校验避免暴露规则）
 *  - 提交时携带 appid + appSecret（后端会调用微信 API 实时校验）
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';
import { isValidAppId, isValidAppSecret } from '@/types/mini-program';

const emit = defineEmits<{
  (e: 'submit-success'): void;
}>();

const store = useUserMiniProgramStore();

const appid = ref('');
const appSecret = ref('');
const showAppSecret = ref(false);
const showSteps = ref(true);
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const debouncedAppid = ref('');

/** AppID 实时格式校验结果 */
const appidValid = computed<boolean | null>(() => {
  if (!debouncedAppid.value) return null;
  return isValidAppId(debouncedAppid.value);
});

/** AppSecret 长度校验 */
const appSecretValid = computed<boolean | null>(() => {
  if (!appSecret.value) return null;
  return isValidAppSecret(appSecret.value);
});

const canSubmit = computed<boolean>(() => {
  return isValidAppId(appid.value) && isValidAppSecret(appSecret.value) && !store.submitting;
});

const steps = [
  { idx: 1, label: '登录【微信公众平台】', desc: 'mp.weixin.qq.com' },
  { idx: 2, label: '进入【开发 → 开发管理】', desc: '左侧菜单' },
  { idx: 3, label: '点击【开发设置】', desc: '查看 AppID 和 AppSecret' },
  { idx: 4, label: '复制后粘贴到下方', desc: '注意不要泄露给他人' },
];

/**
 * 防抖逻辑：监听 appid，停止输入 350ms 后才更新 debouncedAppid 触发 UI 校验
 * - 替代手写 @input handler，避开 H5 / 小程序事件类型差异
 */
watch(
  () => appid.value,
  (v) => {
    store.clearError();
    if (debounceTimer.value) clearTimeout(debounceTimer.value);
    debounceTimer.value = setTimeout(() => {
      debouncedAppid.value = v;
    }, 350);
  },
);

function toggleAppSecret(): void {
  showAppSecret.value = !showAppSecret.value;
}

function toggleSteps(): void {
  showSteps.value = !showSteps.value;
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  try {
    await store.submitAppid(appid.value, appSecret.value);
    uni.showToast({ title: 'AppID 提交成功', icon: 'success' });
    emit('submit-success');
  } catch (e) {
    const msg = e instanceof Error ? e.message : '提交失败，请重试';
    uni.showToast({ title: msg, icon: 'none', duration: 3000 });
  }
}

function handleOpenWechatMp(): void {
  uni.setClipboardData({
    data: 'https://mp.weixin.qq.com/',
    success: () =>
      uni.showToast({ title: '链接已复制', icon: 'success' }),
  });
}

watch(appid, () => {
  store.clearError();
});

onUnmounted(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
    debounceTimer.value = null;
  }
});
</script>

<template>
  <view class="cdv">
    <!-- 状态提示 -->
    <view class="cdv-banner">
      <text class="cdv-banner__icon">✅</text>
      <view class="cdv-banner__body">
        <text class="cdv-banner__title">认证通过</text>
        <text class="cdv-banner__desc">请填写 AppID 完成部署</text>
      </view>
    </view>

    <!-- 获取 AppID 步骤 -->
    <view class="cdv-steps-card">
      <view class="cdv-steps-header" @tap="toggleSteps">
        <text class="cdv-steps-header__title">📖 如何获取 AppID？</text>
        <text class="cdv-steps-header__toggle">{{ showSteps ? '收起' : '展开' }}</text>
      </view>
      <view v-if="showSteps" class="cdv-steps">
        <view
          v-for="s in steps"
          :key="s.idx"
          class="cdv-step"
        >
          <view class="cdv-step__num">{{ s.idx }}</view>
          <view class="cdv-step__body">
            <text class="cdv-step__label">{{ s.label }}</text>
            <text class="cdv-step__desc">{{ s.desc }}</text>
          </view>
        </view>
        <view class="cdv-step__open" @tap="handleOpenWechatMp">
          <text>🔗 前往微信公众平台</text>
        </view>
      </view>
    </view>

    <!-- 输入表单 -->
    <view class="cdv-form">
      <view class="cdv-form__title">🔑 填写小程序凭证</view>

      <view class="cdv-form__field">
        <view class="cdv-form__label">
          <text>AppID</text>
          <text class="cdv-form__required">*</text>
        </view>
        <view
          class="cdv-form__input-wrap"
          :class="{
            'cdv-form__input-wrap--ok': appidValid === true,
            'cdv-form__input-wrap--err': appidValid === false,
          }"
        >
          <input
            v-model="appid"
            class="cdv-form__input"
            type="text"
            placeholder="wx 开头的 18 位字符串"
            placeholder-class="cdv-form__placeholder"
            :maxlength="32"
          />
          <text
            v-if="appidValid === true"
            class="cdv-form__icon cdv-form__icon--ok"
          >✓</text>
          <text
            v-else-if="appidValid === false"
            class="cdv-form__icon cdv-form__icon--err"
          >✕</text>
        </view>
        <text
          v-if="appidValid === false"
          class="cdv-form__error"
        >格式错误：应为 wx + 16 位十六进制字符</text>
      </view>

      <view class="cdv-form__field">
        <view class="cdv-form__label">
          <text>AppSecret</text>
          <text class="cdv-form__required">*</text>
        </view>
        <view
          class="cdv-form__input-wrap"
          :class="{
            'cdv-form__input-wrap--ok': appSecretValid === true,
            'cdv-form__input-wrap--err': appSecretValid === false,
          }"
        >
          <input
            v-model="appSecret"
            class="cdv-form__input"
            :type="showAppSecret ? 'text' : 'password'"
            placeholder="32 位密钥"
            placeholder-class="cdv-form__placeholder"
            :maxlength="64"
          />
          <view class="cdv-form__eye" @tap="toggleAppSecret">
            <text>{{ showAppSecret ? '🙈' : '👁️' }}</text>
          </view>
        </view>
        <text
          v-if="appSecretValid === false"
          class="cdv-form__error"
        >长度不足（至少 16 位）</text>
        <text class="cdv-form__tip">
          🔒 AppSecret 仅用于调用微信 API，不会展示给其他用户
        </text>
      </view>

      <!-- 错误提示 -->
      <view v-if="store.error" class="cdv-form__alert">
        <text class="cdv-form__alert-icon">⚠️</text>
        <text class="cdv-form__alert-text">{{ store.error }}</text>
      </view>

      <view
        class="cdv-form__submit"
        :class="{ 'cdv-form__submit--disabled': !canSubmit }"
        hover-class="cdv-form__submit--hover"
        @tap="handleSubmit"
      >
        <text>{{ store.submitting ? '提交中...' : '确认提交' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cdv {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.cdv-banner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(180deg, rgba(52, 152, 219, 0.15) 0%, rgba(52, 152, 219, 0.04) 100%);
  border: 1rpx solid rgba(52, 152, 219, 0.4);
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  &__icon { font-size: 56rpx; }
  &__body { flex: 1; }
  &__title {
    display: block;
    color: #3498db;
    font-size: 30rpx;
    font-weight: 700;
    margin-bottom: 4rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 24rpx;
  }
}

.cdv-steps-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
}
.cdv-steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  &__title {
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
  }
  &__toggle {
    color: #c9a87c;
    font-size: 24rpx;
  }
}
.cdv-steps {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 20rpx;
}
.cdv-step {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  &__num {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.2);
    color: #c9a87c;
    font-size: 24rpx;
    line-height: 40rpx;
    text-align: center;
    font-weight: 700;
  }
  &__body { flex: 1; padding-top: 4rpx; }
  &__label {
    display: block;
    color: #f5f0e6;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 2rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
  }
  &__open {
    margin-top: 8rpx;
    padding: 16rpx 0;
    color: #c9a87c;
    font-size: 26rpx;
    text-align: center;
    border-top: 1rpx dashed rgba(201, 168, 124, 0.2);
  }
}

.cdv-form {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 24rpx;
  }
  &__field {
    margin-bottom: 28rpx;
  }
  &__label {
    display: flex;
    align-items: center;
    gap: 4rpx;
    color: #f5f0e6;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 12rpx;
  }
  &__required {
    color: #e74c3c;
    font-size: 28rpx;
  }
  &__input-wrap {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background: rgba(0, 0, 0, 0.25);
    border: 1rpx solid rgba(201, 168, 124, 0.25);
    border-radius: 12rpx;
    padding: 0 20rpx;
    height: 88rpx;
    transition: all 0.2s ease;
    &--ok {
      border-color: #5a8f6c;
    }
    &--err {
      border-color: #e74c3c;
    }
  }
  &__input {
    flex: 1;
    color: #f5f0e6;
    font-size: 28rpx;
    background: transparent;
    height: 88rpx;
  }
  &__placeholder {
    color: #6e6757;
    font-size: 26rpx;
  }
  &__icon {
    font-size: 32rpx;
    line-height: 1;
    font-weight: 700;
    &--ok { color: #5a8f6c; }
    &--err { color: #e74c3c; }
  }
  &__eye {
    padding: 0 8rpx;
    font-size: 32rpx;
  }
  &__error {
    display: block;
    margin-top: 8rpx;
    color: #e74c3c;
    font-size: 22rpx;
  }
  &__tip {
    display: block;
    margin-top: 8rpx;
    color: #a89e85;
    font-size: 22rpx;
  }
  &__alert {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background: rgba(231, 76, 60, 0.12);
    border: 1rpx solid rgba(231, 76, 60, 0.4);
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-bottom: 16rpx;
    &-icon { font-size: 28rpx; }
    &-text {
      flex: 1;
      color: #f5dcae;
      font-size: 24rpx;
      line-height: 1.5;
    }
  }
  &__submit {
    height: 96rpx;
    border-radius: 48rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 30rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.35);
    transition: all 0.15s ease;
    &--hover { transform: scale(0.98); opacity: 0.92; }
    &--disabled {
      opacity: 0.45;
      box-shadow: none;
    }
  }
}
</style>
