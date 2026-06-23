<script setup lang="ts">
/**
 * CertifyingView —— 状态 2 视图（认证中）
 *
 * UI 内容：
 *  - 黄色徽章 + "认证中，等待微信审核"
 *  - 提示用户查看微信公众平台站内信
 *  - 按钮：【🔗 前往微信公众平台】（外部链接）
 *  - 底部提示："审核期间你可以继续邀请好友扩大领地"
 */
import { computed } from 'vue';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';

const store = useUserMiniProgramStore();

const WECHAT_MP_URL = 'https://mp.weixin.qq.com/';

const submittedAtText = computed(() => {
  const t = store.record?.certSubmittedAt;
  if (!t) return null;
  try {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return null;
  }
});

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function openWechatMp(): void {
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: WECHAT_MP_URL,
    success: () => uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' }),
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.setClipboardData({
    data: WECHAT_MP_URL,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  });
  // #endif
}

function refresh(): void {
  store.fetchStatus();
}
</script>

<template>
  <view class="cv">
    <!-- 状态信息 -->
    <view class="cv-status">
      <view class="cv-status__spinner">
        <text>🔄</text>
      </view>
      <text class="cv-status__title">认证中，等待微信审核</text>
      <text class="cv-status__desc">
        微信审核通常需要 1-3 个工作日，请保持关注。
      </text>
    </view>

    <!-- 提交时间 -->
    <view v-if="submittedAtText" class="cv-time">
      <text class="cv-time__label">提交时间</text>
      <text class="cv-time__value">{{ submittedAtText }}</text>
    </view>

    <!-- 主体信息 -->
    <view v-if="store.certificationLabel" class="cv-type">
      <text class="cv-type__label">认证主体</text>
      <text class="cv-type__value">{{ store.certificationLabel }}</text>
    </view>

    <!-- 关键操作卡片 -->
    <view class="cv-card">
      <view class="cv-card__title">📬 查看审核进度</view>
      <text class="cv-card__desc">
        登录微信公众平台 → 通知中心，查看微信官方发送的站内信与审核结果。
      </text>
      <view
        class="cv-card__btn"
        hover-class="cv-card__btn--hover"
        @tap="openWechatMp"
      >
        <text>🔗 前往微信公众平台</text>
      </view>
    </view>

    <!-- 提示 -->
    <view class="cv-tip">
      <text class="cv-tip__icon">💡</text>
      <view class="cv-tip__body">
        <text class="cv-tip__title">审核期间可以继续邀请好友</text>
        <text class="cv-tip__desc">
          扩大领地不仅能解锁更多功能，还能让你的小程序在启动后拥有更高的初始曝光。
        </text>
      </view>
    </view>

    <!-- 刷新 -->
    <view class="cv-refresh" @tap="refresh">
      <text class="cv-refresh__icon">⟳</text>
      <text class="cv-refresh__text">刷新状态</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.cv {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.cv-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(180deg, rgba(241, 196, 15, 0.08) 0%, rgba(241, 196, 15, 0.02) 100%);
  border: 1rpx solid rgba(241, 196, 15, 0.3);
  border-radius: 20rpx;
  &__spinner {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(241, 196, 15, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72rpx;
    margin-bottom: 24rpx;
    animation: cv-spin 2.4s linear infinite;
  }
  &__title {
    color: #d4a017;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    margin-bottom: 12rpx;
  }
  &__desc {
    color: #a89e85;
    font-size: 24rpx;
    text-align: center;
    line-height: 1.6;
  }
}

.cv-time, .cv-type {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  &__label {
    color: #a89e85;
    font-size: 24rpx;
  }
  &__value {
    color: #f5dcae;
    font-size: 26rpx;
    font-weight: 600;
  }
}

.cv-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }
  &__desc {
    display: block;
    color: #f5f0e6;
    font-size: 24rpx;
    line-height: 1.6;
    margin-bottom: 24rpx;
  }
  &__btn {
    height: 80rpx;
    border-radius: 40rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(201, 168, 124, 0.3);
    transition: all 0.15s ease;
    &--hover { transform: scale(0.98); opacity: 0.92; }
  }
}

.cv-tip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(90, 143, 108, 0.1);
  border: 1rpx solid rgba(90, 143, 108, 0.3);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  &__icon { font-size: 40rpx; }
  &__body { flex: 1; }
  &__title {
    display: block;
    color: #5a8f6c;
    font-size: 26rpx;
    font-weight: 700;
    margin-bottom: 4rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
    line-height: 1.5;
  }
}

.cv-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: transparent;
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  color: #c9a87c;
  font-size: 26rpx;
  transition: all 0.15s ease;
  &__icon { font-size: 30rpx; }
  &:active { transform: scale(0.98); opacity: 0.85; }
}

@keyframes cv-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
</style>
