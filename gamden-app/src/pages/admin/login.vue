<template>
  <view class="admin-login">
    <view class="brand">
      <view class="logo">G</view>
      <view class="title">GamDen 后台管理</view>
      <view class="subtitle">小程序申请运营系统</view>
    </view>

    <view class="card">
      <view class="form-item">
        <text class="label">手机号</text>
        <input
          v-model="phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请输入管理员手机号"
          :disabled="loading"
        />
      </view>
      <view class="form-item">
        <text class="label">短信验证码</text>
        <view class="code-row">
          <input
            v-model="code"
            class="input"
            type="number"
            maxlength="6"
            placeholder="6 位短信验证码"
            :disabled="loading"
          />
          <button
            class="code-btn"
            :disabled="cooldown > 0 || !phone || sending"
            @click="onSendCode"
          >
            {{ cooldown > 0 ? `${cooldown}s 后重试` : sending ? '发送中' : '获取验证码' }}
          </button>
        </view>
      </view>

      <button
        class="submit"
        :disabled="!phone || !code || loading"
        @click="onSubmit"
      >
        {{ loading ? '登录中...' : '管理员登录' }}
      </button>

      <view class="hint">
        仅 role=admin 账号可登录；如未配置，请联系超级管理员在数据库中设置 users.role='admin'。
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAdminStore } from '@/stores/admin';
import { http } from '@/utils/request';

const adminStore = useAdminStore();

const phone = ref('');
const code = ref('');
const loading = ref(false);
const sending = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

onLoad(() => {
  // 已登录则直接跳转 index
  if (adminStore.isAdmin) {
    uni.reLaunch({ url: '/pages/admin/index' });
  }
});

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

/** 发送短信验证码 */
async function onSendCode(): Promise<void> {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '请输入合法手机号', icon: 'none' });
    return;
  }
  try {
    sending.value = true;
    await http.post('/sms/send', {
      phone: phone.value,
      purpose: 'login',
    });
    uni.showToast({ title: '验证码已发送', icon: 'success' });
    startCooldown();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '发送失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    sending.value = false;
  }
}

function startCooldown(): void {
  cooldown.value = 60;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

async function onSubmit(): Promise<void> {
  if (!/^1[3-9]\d{9}$/.test(phone.value) || !/^\d{6}$/.test(code.value)) {
    uni.showToast({ title: '请输入完整信息', icon: 'none' });
    return;
  }

  try {
    loading.value = true;
    await adminStore.login({ phone: phone.value, smsCode: code.value });
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => uni.reLaunch({ url: '/pages/admin/index' }), 600);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登录失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.admin-login {
  min-height: 100vh;
  padding: 120rpx 48rpx 48rpx;
  background: linear-gradient(180deg, #1e241f 0%, #0f120e 100%);
}

.brand {
  text-align: center;
  margin-bottom: 80rpx;

  .logo {
    width: 120rpx;
    height: 120rpx;
    line-height: 120rpx;
    margin: 0 auto 24rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #a8845a 100%);
    color: #1e241f;
    font-size: 64rpx;
    font-weight: 700;
  }
  .title {
    color: #e8d9b8;
    font-size: 40rpx;
    font-weight: 600;
  }
  .subtitle {
    margin-top: 12rpx;
    color: #a89e85;
    font-size: 26rpx;
  }
}

.card {
  background: rgba(30, 36, 31, 0.6);
  border: 1rpx solid rgba(200, 168, 124, 0.18);
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  backdrop-filter: blur(8rpx);
}

.form-item {
  margin-bottom: 36rpx;

  .label {
    display: block;
    margin-bottom: 12rpx;
    color: #c9a87c;
    font-size: 26rpx;
  }
  .input {
    width: 100%;
    height: 88rpx;
    padding: 0 24rpx;
    background: rgba(0, 0, 0, 0.3);
    border: 1rpx solid rgba(200, 168, 124, 0.2);
    border-radius: 12rpx;
    color: #e8d9b8;
    font-size: 30rpx;
    box-sizing: border-box;
  }
  .code-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    .input {
      flex: 1;
    }
  }
  .code-btn {
    flex-shrink: 0;
    height: 88rpx;
    padding: 0 24rpx;
    line-height: 88rpx;
    background: rgba(200, 168, 124, 0.18);
    color: #c9a87c;
    border: 1rpx solid rgba(200, 168, 124, 0.4);
    border-radius: 12rpx;
    font-size: 24rpx;
  }
  .code-btn[disabled] {
    opacity: 0.5;
  }
}

.submit {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #c9a87c 0%, #a8845a 100%);
  color: #1e241f;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
}
.submit[disabled] {
  opacity: 0.5;
}

.hint {
  margin-top: 36rpx;
  color: #8a8472;
  font-size: 22rpx;
  line-height: 1.6;
  text-align: center;
}
</style>
