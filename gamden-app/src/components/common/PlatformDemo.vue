<template>
  <!-- 条件编译示例组件 - 演示多端 UI 差异 -->
  <view class="platform-demo">
    <!-- 平台标识 -->
    <view class="platform-badge">
      <!-- #ifdef H5 -->
      <text class="badge h5">H5 网页版</text>
      <!-- #endif -->

      <!-- #ifdef MP-WEIXIN -->
      <text class="badge mp">微信小程序</text>
      <!-- #endif -->

      <!-- #ifdef APP-ANDROID -->
      <text class="badge android">Android App</text>
      <!-- #endif -->

      <!-- #ifdef APP-IOS -->
      <text class="badge ios">iOS App</text>
      <!-- #endif -->
    </view>

    <!-- 平台特定功能 -->
    <view class="features">
      <!-- H5 特有：分享按钮 -->
      <!-- #ifdef H5 -->
      <button class="feature-btn" @click="handleH5Share">
        <text class="icon">🔗</text>
        <text>复制链接分享</text>
      </button>
      <!-- #endif -->

      <!-- 微信小程序特有：转发按钮 -->
      <!-- #ifdef MP-WEIXIN -->
      <button class="feature-btn" open-type="share">
        <text class="icon">👥</text>
        <text>转发给好友</text>
      </button>
      <button class="feature-btn" open-type="launchApp">
        <text class="icon">📱</text>
        <text>打开 App</text>
      </button>
      <!-- #endif -->

      <!-- App 特有：原生分享 -->
      <!-- #ifdef APP-PLUS -->
      <button class="feature-btn" @click="handleAppShare">
        <text class="icon">📤</text>
        <text>原生分享</text>
      </button>
      <!-- #endif -->

      <!-- 所有平台通用功能 -->
      <button class="feature-btn" @click="handleCopy">
        <text class="icon">📋</text>
        <text>复制内容</text>
      </button>
    </view>

    <!-- 平台差异展示 -->
    <view class="platform-info">
      <text class="title">当前平台信息</text>
      <view class="info-item">
        <text class="label">API 地址：</text>
        <text class="value">{{ apiBaseUrl }}</text>
      </view>
      <view class="info-item">
        <text class="label">IM 地址：</text>
        <text class="value">{{ imApiUrl }}</text>
      </view>
      <view class="info-item">
        <text class="label">状态栏高度：</text>
        <text class="value">{{ statusBarHeight }}px</text>
      </view>
      <view class="info-item">
        <text class="label">导航栏高度：</text>
        <text class="value">{{ navBarHeight }}px</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { API_BASE_URL, IM_API_URL } from '@/utils/env';
import { getNavBarHeight, getSafeArea, showShareMenu } from '@/utils/platform';

// 环境变量
const apiBaseUrl = ref(API_BASE_URL);
const imApiUrl = ref(IM_API_URL);
const statusBarHeight = ref(0);
const navBarHeight = ref(44);

onMounted(() => {
  const safeArea = getSafeArea();
  statusBarHeight.value = safeArea.statusBarHeight;
  navBarHeight.value = getNavBarHeight();
});

// H5 分享
function handleH5Share() {
  // #ifdef H5
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    uni.showToast({ title: '链接已复制', icon: 'success' });
  });
  // #endif
}

// App 原生分享
function handleAppShare() {
  // #ifdef APP-PLUS
  showShareMenu({
    title: 'GamDen 游戏巢穴',
    path: '/pages/map/index',
  });
  // #endif
}

// 复制内容
function handleCopy() {
  uni.setClipboardData({
    data: '这是要复制的内容',
    success: () => {
      uni.showToast({ title: '复制成功', icon: 'success' });
    },
  });
}
</script>

<style lang="scss" scoped>
.platform-demo {
  padding: 32rpx;
  background: #1E241F;
  min-height: 100vh;
}

.platform-badge {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;

  .badge {
    padding: 16rpx 32rpx;
    border-radius: 32rpx;
    font-size: 28rpx;
    font-weight: bold;

    &.h5 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }

    &.mp {
      background: linear-gradient(135deg, #07c160 0%, #10aeff 100%);
      color: #fff;
    }

    &.android {
      background: linear-gradient(135deg, #3ddc84 0%, #4caf50 100%);
      color: #fff;
    }

    &.ios {
      background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
      color: #fff;
    }
  }
}

.features {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 32rpx;

  .feature-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    padding: 24rpx 32rpx;
    background: #2a332c;
    border-radius: 16rpx;
    border: none;
    color: #c9a87c;
    font-size: 28rpx;

    .icon {
      font-size: 36rpx;
    }
  }
}

.platform-info {
  background: #2a332c;
  border-radius: 16rpx;
  padding: 32rpx;

  .title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #c9a87c;
    margin-bottom: 24rpx;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 1px solid #3a433c;

    &:last-child {
      border-bottom: none;
    }

    .label {
      color: #a89e85;
      font-size: 28rpx;
    }

    .value {
      color: #fff;
      font-size: 28rpx;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
