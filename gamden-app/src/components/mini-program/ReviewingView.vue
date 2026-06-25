<script setup lang="ts">
/**
 * ReviewingView —— 状态 5 视图（代码审核中）
 *
 * UI 内容：
 *  - 黄色徽章 + "代码审核中"
 *  - 提示用户等待微信审核（1-7个工作日）
 *  - 按钮：【🔗 前往微信公众平台查看进度】
 *  - 预览入口：【📱 预览体验版】（如有）
 */
import { computed } from 'vue';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';

const store = useUserMiniProgramStore();

const WECHAT_MP_URL = 'https://mp.weixin.qq.com/';

const submittedAtText = computed(() => {
  const t = store.record?.codeSubmittedAt;
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
  uni.setClipboardData({
    data: WECHAT_MP_URL,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  });
}

/**
 * 模拟"预览体验版"功能 —— 实际 V1.0 通过 wechatService.generateTrialQRCode 实现
 * V1.0 mock：直接展示提示
 */
function openTrialPreview(): void {
  uni.showModal({
    title: '预览体验版',
    content: '体验版二维码需在管理后台生成，V1.0 暂未开放自助功能。请联系客服。',
    showCancel: false,
  });
}

function refresh(): void {
  store.fetchStatus();
}
</script>

<template>
  <view class="rv">
    <!-- 状态信息 -->
    <view class="rv-status">
      <view class="rv-status__icon">
        <text>🔍</text>
      </view>
      <text class="rv-status__title">
        代码审核中
      </text>
      <text class="rv-status__desc">
        微信审核通常需要 1-7 个工作日，请耐心等待。
      </text>
    </view>

    <!-- 提交时间 + AppID -->
    <view v-if="submittedAtText" class="rv-time">
      <text class="rv-time__label">
        提交审核时间
      </text>
      <text class="rv-time__value">
        {{ submittedAtText }}
      </text>
    </view>
    <view v-if="store.record?.appid" class="rv-time">
      <text class="rv-time__label">
        小程序 AppID
      </text>
      <text class="rv-time__value">
        {{ store.record.appid }}
      </text>
    </view>

    <!-- 关键操作 -->
    <view class="rv-card">
      <view class="rv-card__title">
        🔗 查看审核进度
      </view>
      <text class="rv-card__desc">
        登录微信公众平台 → 版本管理，可查看审核状态、撤回审核、查看反馈。
      </text>
      <view
        class="rv-card__btn"
        hover-class="rv-card__btn--hover"
        @tap="openWechatMp"
      >
        <text>🔗 前往微信公众平台</text>
      </view>
    </view>

    <!-- 体验版入口 -->
    <view class="rv-card rv-card--secondary">
      <view class="rv-card__title">
        📱 预览体验版
      </view>
      <text class="rv-card__desc">
        审核通过前，开发者可通过体验版二维码分享给指定用户测试。
      </text>
      <view
        class="rv-card__btn rv-card__btn--secondary"
        hover-class="rv-card__btn--hover"
        @tap="openTrialPreview"
      >
        <text>📱 预览体验版</text>
      </view>
    </view>

    <!-- 提示 -->
    <view class="rv-tip">
      <text class="rv-tip__icon">
        💡
      </text>
      <view class="rv-tip__body">
        <text class="rv-tip__title">
          审核通过后
        </text>
        <text class="rv-tip__desc">
          系统会自动生成小程序码并展示在此页面。
        </text>
      </view>
    </view>

    <!-- 刷新 -->
    <view class="rv-refresh" @tap="refresh">
      <text class="rv-refresh__icon">
        ⟳
      </text>
      <text class="rv-refresh__text">
        刷新状态
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rv {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.rv-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(180deg, rgba(241, 196, 15, 0.08) 0%, rgba(241, 196, 15, 0.02) 100%);
  border: 1rpx solid rgba(241, 196, 15, 0.3);
  border-radius: 20rpx;
  &__icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(241, 196, 15, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72rpx;
    margin-bottom: 24rpx;
    animation: rv-pulse 2s ease-in-out infinite;
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

.rv-time {
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

.rv-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  &--secondary {
    background: rgba(0, 0, 0, 0.2);
  }
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
    &--secondary {
      background: transparent;
      color: #c9a87c;
      border: 1rpx solid rgba(201, 168, 124, 0.4);
    }
    &--hover { transform: scale(0.98); opacity: 0.92; }
  }
}

.rv-tip {
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

.rv-refresh {
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

@keyframes rv-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
