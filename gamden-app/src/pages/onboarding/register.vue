<script setup lang="ts">
/**
 * 入驻引导页 - 注册流程（守护灵叙事版）
 *
 * 按需求文档 3.2 节设计：
 * - 全屏守护灵对话界面
 * - 页面中央：守护灵头像(160x160pt) + 对话气泡
 * - 表单以半透明浮层形式置于对话下方
 * - 手机号+验证码输入（60秒倒计时）
 * - 【归巢】主按钮（领地金 #C9A87C）
 *
 * 注册完成后跳转到守护灵选择页
 */
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAgentStore } from '@/stores/agent';
import { track } from '@/utils/track';
import { GUARDIAN_VISUALS, type GuardianType } from '@/types/agent';
import { getAgentLine } from '@/utils/agent-lines';

const userStore = useUserStore();
const agentStore = useAgentStore();

// 表单数据
const phone = ref('');
const smsCode = ref('');
const countdown = ref(0);
const submitting = ref(false);

// 守护灵视觉配置（随机选择一个作为引导角色）
const guardianTypes: GuardianType[] = ['mechanical', 'elf', 'astrologer'];
const currentGuardian = ref<GuardianType>('mechanical');

// 当前对话台词 - 初次相遇
const currentLine = computed(() => {
  return getAgentLine(currentGuardian.value, 'firstEncounter');
});

const visual = computed(() => GUARDIAN_VISUALS[currentGuardian.value]);

const canSubmit = computed(
  () =>
    /^1[3-9]\d{9}$/.test(phone.value) &&
    /^\d{6}$/.test(smsCode.value) &&
    !submitting.value,
);

onMounted(() => {
  // 随机选择一个守护灵类型作为引导角色
  const idx = Math.floor(Math.random() * guardianTypes.length);
  currentGuardian.value = guardianTypes[idx];

  // 记录埋点：进入注册页
  track('onboarding_register_started', {
    guardian_type: null, // 未选择守护灵
  });

  // 触发初次相遇话术
  setTimeout(() => {
    agentStore.triggerFirstEncounter();
  }, 500);
});

function handleSmsCode() {
  if (!phone.value || !/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (countdown.value > 0) return;

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
    // 调用注册API（守护灵选择在下一个页面）
    await userStore.login({
      phone: phone.value,
      smsCode: smsCode.value,
    });

    uni.showToast({ title: '注册成功', icon: 'success' });

    // 延迟跳转到守护灵选择页
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/onboarding/select-guardian',
      });
    }, 800);
  } catch {
    uni.showToast({ title: '注册失败，请重试', icon: 'none' });
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
  <view class="page-onboarding-register">
    <!-- 背景装饰 -->
    <view class="page-onboarding-register__bg">
      <view class="page-onboarding-register__fog" />
    </view>

    <!-- 守护灵对话区域 -->
    <view class="page-onboarding-register__hero">
      <!-- 守护灵头像 -->
      <view
        class="page-onboarding-register__avatar"
        :style="{
          borderColor: visual.color,
          background: `linear-gradient(135deg, ${visual.color}22 0%, ${visual.color}11 100%)`,
        }"
      >
        <text class="page-onboarding-register__avatar-icon">{{ visual.icon }}</text>
        <view
          class="page-onboarding-register__avatar-glow"
          :style="{ background: visual.color }"
        />
      </view>

      <!-- 对话气泡 -->
      <view class="page-onboarding-register__dialogue">
        <view class="page-onboarding-register__dialogue-bubble">
          <view
            class="page-onboarding-register__dialogue-arrow"
            :style="{ borderRightColor: visual.color }"
          />
          <view class="page-onboarding-register__dialogue-header">
            <text
              class="page-onboarding-register__dialogue-name"
              :style="{ color: visual.color }"
            >
              {{ visual.name }}
            </text>
          </view>
          <text class="page-onboarding-register__dialogue-text">
            {{ currentLine?.text }}
          </text>
        </view>
      </view>
    </view>

    <!-- 表单区域 -->
    <view class="page-onboarding-register__form">
      <view class="page-onboarding-register__form-card">
        <!-- 手机号 -->
        <view class="page-onboarding-register__form-item">
          <text class="page-onboarding-register__form-label">手机号</text>
          <view class="page-onboarding-register__phone-row">
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
              :text="countdown > 0 ? `${countdown}s` : '获取验证码'"
              :disabled="countdown > 0"
              type="warning"
              size="normal"
              @tap="handleSmsCode"
            />
          </view>
        </view>

        <!-- 验证码 -->
        <view class="page-onboarding-register__form-item">
          <text class="page-onboarding-register__form-label">验证码</text>
          <u-input
            v-model="smsCode"
            type="number"
            placeholder="请输入6位验证码"
            :clearable="true"
            border="surround"
            bg-color="#262D27"
            color="#F5F0E6"
            custom-style="margin-top: 24rpx;"
          />
        </view>

        <!-- 归巢按钮 -->
        <u-button
          type="primary"
          size="large"
          :text="submitting ? '入驻中...' : '归巢'"
          :disabled="!canSubmit"
          custom-class="page-onboarding-register__submit-btn"
          @tap="handleSubmit"
        />

        <!-- 游客模式入口 -->
        <view class="page-onboarding-register__guest-link" @tap="handleGuestMode">
          <text>先逛逛 → 游客模式</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-onboarding-register {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1f1c 0%, #1e241f 100%);
  padding-top: 120rpx;
  position: relative;
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__fog {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 400rpx;
    background: linear-gradient(to top, rgba(42, 49, 40, 0.8), transparent);
  }

  // 守护灵区域
  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 48rpx 40rpx;
    position: relative;
    z-index: 1;
  }

  &__avatar {
    position: relative;
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    border-width: 4rpx;
    border-style: solid;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.5);
    animation: avatar-pulse 2.4s ease-in-out infinite;
    margin-bottom: 32rpx;
  }

  &__avatar-icon {
    font-size: 96rpx;
    line-height: 1;
    z-index: 1;
  }

  &__avatar-glow {
    position: absolute;
    inset: -32rpx;
    border-radius: 50%;
    opacity: 0.2;
    z-index: 0;
    animation: avatar-glow 2.4s ease-in-out infinite;
  }

  // 对话气泡
  &__dialogue {
    width: 100%;
    max-width: 600rpx;
  }

  &__dialogue-bubble {
    position: relative;
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 2rpx solid #c9a87c;
    border-radius: 20rpx;
    padding: 28rpx 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.45);
  }

  &__dialogue-arrow {
    position: absolute;
    top: -20rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom-width: 20rpx;
    border-bottom-style: solid;
  }

  &__dialogue-header {
    margin-bottom: 16rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);
  }

  &__dialogue-name {
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }

  &__dialogue-text {
    font-size: 30rpx;
    color: #f5f0e6;
    line-height: 1.6;
    font-weight: 500;
  }

  // 表单区域
  &__form {
    position: relative;
    z-index: 1;
    padding: 0 32rpx;
  }

  &__form-card {
    background: rgba(30, 36, 31, 0.9);
    border: 2rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 24rpx;
    padding: 40rpx 32rpx;
    backdrop-filter: blur(20rpx);
  }

  &__form-item {
    margin-bottom: 8rpx;
  }

  &__form-label {
    display: block;
    font-size: 26rpx;
    color: #c9a87c;
    margin-bottom: 16rpx;
    font-weight: 600;
    letter-spacing: 2rpx;
  }

  &__phone-row {
    display: flex;
    gap: 16rpx;
    align-items: center;
  }

  // 按钮
  &__submit-btn {
    margin-top: 40rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%) !important;
    border-radius: 44rpx !important;
    height: 88rpx !important;
    font-size: 32rpx !important;
    font-weight: 700 !important;
    color: #1e241f !important;
    letter-spacing: 4rpx;
  }

  &__guest-link {
    text-align: center;
    margin-top: 32rpx;
    font-size: 24rpx;
    color: #a89e85;
    text-decoration: underline;
  }
}

// 动画
@keyframes avatar-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes avatar-glow {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(1.15);
  }
}

.placeholder {
  color: #a89e85 !important;
}
</style>

<style lang="scss">
.page-onboarding-register__submit-btn {
  .u-button__text {
    font-weight: 700 !important;
    letter-spacing: 4rpx !important;
  }
}
</style>
