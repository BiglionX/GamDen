<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import type { GuardianType } from '@/types/user';
import { GUARDIAN_VISUALS, type GuardianVisual } from '@/types/agent';

const userStore = useUserStore();

const inviteCode = ref('');
const phone = ref('');
const smsCode = ref('');
const countdown = ref(0);
const selectedGuardian = ref<GuardianType | null>(null);
const submitting = ref(false);

const canSubmit = computed(
  () =>
    !!selectedGuardian.value &&
    !!inviteCode.value.trim() &&
    /^1[3-9]\d{9}$/.test(phone.value) &&
    /^\d{6}$/.test(smsCode.value) &&
    !submitting.value,
);

/** 三选一守护灵 - 从 GUARDIAN_VISUALS 读取（单一数据源） */
const guardians: GuardianVisual[] = Object.values(GUARDIAN_VISUALS);

function handleSmsCode() {
  if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (countdown.value > 0) return;
  // 真实实现：http.post('/auth/sms-code', { phone: phone.value })
  uni.showToast({ title: '验证码已发送', icon: 'success' });
  countdown.value = 60;
  const timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function handleSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    await userStore.login({
      inviteCode: inviteCode.value,
      phone: phone.value,
      smsCode: smsCode.value,
      guardianType: selectedGuardian.value!,
    });
    uni.showToast({ title: '入驻成功', icon: 'success' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/map/index' });
    }, 800);
  } catch {
    uni.showToast({ title: '入驻失败，请重试', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function handleGuestMode() {
  userStore.enterGuestMode();
  uni.reLaunch({ url: '/pages/map/index' });
}
</script>

<template>
  <view class="page-login">
    <view class="hero">
      <text class="hero__brand">
        GamDen
      </text>
      <text class="hero__tagline">
        游戏巢穴 · 邀请制社区
      </text>
    </view>

    <view class="form-card">
      <text class="form-card__label">
        邀请码（必填）
      </text>
      <u-input
        v-model="inviteCode"
        placeholder="请输入邀请码"
        placeholder-class="placeholder"
        :clearable="true"
        border="surround"
        bg-color="#262D27"
        color="#F5F0E6"
        custom-style="margin-bottom: 32rpx;"
      />

      <text class="form-card__label">
        手机号（选填）
      </text>
      <view class="phone-row">
        <u-input
          v-model="phone"
          type="number"
          placeholder="请输入手机号"
          :clearable="true"
          border="surround"
          bg-color="#262D27"
          color="#F5F0E6"
          custom-style="flex: 1;"
        />
        <u-button
          :text="countdown > 0 ? `${countdown}s 后重试` : '获取验证码'"
          :disabled="countdown > 0"
          type="warning"
          size="normal"
          @tap="handleSmsCode"
        />
      </view>

      <u-input
        v-if="phone"
        v-model="smsCode"
        type="number"
        placeholder="请输入短信验证码"
        :clearable="true"
        border="surround"
        bg-color="#262D27"
        color="#F5F0E6"
        custom-style="margin-top: 24rpx;"
      />
    </view>

    <view class="guardian-section">
      <text class="form-card__label">
        选择你的守护灵
      </text>
      <view class="guardian-list">
        <view
          v-for="g in guardians"
          :key="g.type"
          class="guardian-card"
          :class="{ 'guardian-card--active': selectedGuardian === g.type }"
          :style="{ '--guardian-color': g.color, '--guardian-bg': g.bgColor }"
          @tap="selectedGuardian = g.type"
        >
          <view class="guardian-card__icon">
            <text>{{ g.icon }}</text>
          </view>
          <text class="guardian-card__name">
            {{ g.name }}
          </text>
          <text class="guardian-card__tagline">
            "{{ g.tagline }}"
          </text>
          <text class="guardian-card__desc">
            {{ g.description }}
          </text>
          <view v-if="selectedGuardian === g.type" class="guardian-card__check">
            <text>✓</text>
          </view>
        </view>
      </view>
    </view>

    <u-button
      type="primary"
      size="large"
      :text="submitting ? '入驻中...' : '入驻巢穴'"
      :disabled="!canSubmit"
      custom-style="margin-top: 48rpx;"
      @tap="handleSubmit"
    />

    <view class="guest-link" @tap="handleGuestMode">
      <text>先逛逛 → 游客模式</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-login {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 96rpx 48rpx 64rpx;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
  &__brand {
    font-size: 80rpx;
    font-weight: 700;
    color: $u-primary;
    letter-spacing: 8rpx;
  }
  &__tagline {
    font-size: 28rpx;
    color: $u-tips-color;
    margin-top: 16rpx;
  }
}

.form-card {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  &__label {
    font-size: 26rpx;
    color: $u-content-color;
    margin-bottom: 16rpx;
    display: block;
  }
}

.placeholder { color: $u-tips-color !important; }

.phone-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.guardian-section { margin-bottom: 32rpx; }

.guardian-list {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16rpx;
}

.guardian-card {
  position: relative;
  background: var(--guardian-bg);
  border: 2rpx solid var(--guardian-color);
  border-radius: 20rpx;
  padding: 28rpx 12rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;

  &__icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(245, 240, 230, 0.08) 0%, rgba(245, 240, 230, 0.02) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
    border: 2rpx solid var(--guardian-color);

    text {
      font-size: 56rpx;
      line-height: 1;
    }
  }
  &__name {
    font-size: 30rpx;
    color: $u-main-color;
    font-weight: 700;
    margin-bottom: 8rpx;
  }
  &__tagline {
    font-size: 20rpx;
    color: var(--guardian-color);
    font-style: italic;
    margin-bottom: 12rpx;
    line-height: 1.4;
    text-align: center;
    font-weight: 500;
  }
  &__desc {
    font-size: 20rpx;
    color: $u-tips-color;
    text-align: center;
    line-height: 1.5;
  }
  &__check {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: var(--guardian-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: $u-bg-color;
    font-size: 20rpx;
    font-weight: 700;
  }

  &--active {
    transform: translateY(-4rpx);
    box-shadow:
      0 0 0 4rpx var(--guardian-color),
      0 0 32rpx rgba(201, 168, 124, 0.4);
  }

  &:active { transform: scale(0.96); }
}

.guest-link {
  text-align: center;
  margin-top: 48rpx;
  font-size: 26rpx;
  color: $u-tips-color;
  text-decoration: underline;
}
</style>
