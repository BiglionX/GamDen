<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useInviteStore } from '@/stores/invite';
import InvitePoster from '@/components/invite/InvitePoster.vue';

const inviteStore = useInviteStore();
const statusBarHeight = ref(20);
const navBarHeight = ref(44);
const saving = ref(false);

onMounted(async () => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight ?? 20;
  } catch { /* ignore */ }

  await inviteStore.loadPosterData();
});

const posterRef = ref<InstanceType<typeof InvitePoster> | null>(null);

async function handleSave() {
  saving.value = true;
  try {
    await posterRef.value?.handleSave();
  } finally {
    saving.value = false;
  }
}

function handleBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="page-poster">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner" :style="{ height: navBarHeight + 'px' }">
        <view class="navbar__back" @tap="handleBack">
          <text>‹</text>
        </view>
        <text class="navbar__title">
          分享邀请
        </text>
        <view class="navbar__placeholder" />
      </view>
    </view>

    <!-- 海报主体 -->
    <view class="poster-body">
      <view class="poster-body__hint">
        <text>📸 长按或点击保存按钮，分享专属海报</text>
      </view>

      <InvitePoster ref="posterRef" :data="inviteStore.posterData" />

      <view class="poster-body__url">
        <text class="poster-body__url-label">
          落地链接
        </text>
        <text class="poster-body__url-text">
          {{ inviteStore.posterData?.inviteUrl }}
        </text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-bar__copy" @tap="inviteStore.copyInviteCode">
        <text>📋 复制邀请码</text>
      </view>
      <view class="bottom-bar__save" @tap="handleSave">
        <text>{{ saving ? '保存中...' : '💾 保存到相册' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-poster {
  min-height: 100vh;
  background: #14181a;
  display: flex;
  flex-direction: column;
}

.navbar {
  position: relative;
  z-index: 10;
  background: #14181a;
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32rpx;
  }
  &__back {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f5f0e6;
    font-size: 56rpx;
    font-weight: 300;
  }
  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #f5f0e6;
  }
  &__placeholder { width: 64rpx; }
}

.poster-body {
  flex: 1;
  padding: 24rpx 32rpx 32rpx;

  &__hint {
    text-align: center;
    font-size: 22rpx;
    color: #a89e85;
    margin-bottom: 24rpx;
  }
  &__url {
    margin-top: 24rpx;
    padding: 16rpx 20rpx;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12rpx;
  }
  &__url-label {
    display: block;
    font-size: 20rpx;
    color: #a89e85;
    margin-bottom: 6rpx;
  }
  &__url-text {
    display: block;
    font-size: 22rpx;
    color: #c9a87c;
    word-break: break-all;
    font-family: monospace;
  }
}

.bottom-bar {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #14181a;
  border-top: 1rpx solid rgba(201, 168, 124, 0.2);

  &__copy, &__save {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    &:active { transform: scale(0.96); }
  }
  &__copy {
    background: transparent;
    color: #c9a87c;
    border: 1rpx solid rgba(201, 168, 124, 0.4);
  }
  &__save {
    background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
    color: #1e241f;
    box-shadow: 0 4rpx 12rpx rgba(201, 168, 124, 0.4);
  }
}
</style>
