<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MiniProgramCodeData } from '@/types/invite';

interface Props {
  data: MiniProgramCodeData | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'share'): void;
}>();

const imageError = ref(false);

const codeImage = computed(() => {
  if (imageError.value || !props.data?.imageBase64) return '';
  return props.data.imageBase64;
});

function onImageError() {
  imageError.value = true;
}

function handleSave() {
  if (!props.data?.unlocked || !codeImage.value) return;
  // 微信小程序：保存到相册
  // #ifdef MP-WEIXIN
  uni.downloadFile({
    url: codeImage.value,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
      });
    },
  });
  // #endif
  // #ifdef H5
  const link = document.createElement('a');
  link.href = codeImage.value;
  link.download = `gamden-miniprogram-${props.data.scene}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // #endif
  emit('save');
}

function handleShare() {
  emit('share');
}
</script>

<template>
  <view v-if="data?.unlocked" class="mp-code">
    <view class="mp-code__card">
      <view class="mp-code__header">
        <text class="mp-code__title">我的专属小程序</text>
        <text class="mp-code__hint">扫码进入 · 邀请进度 {{ data.invitedCount }}/{{ data.threshold }}</text>
      </view>

      <view class="mp-code__body">
        <view class="mp-code__qr">
          <image
            v-if="codeImage"
            :src="codeImage"
            class="mp-code__qr-img"
            mode="aspectFit"
            @error="onImageError"
          />
          <view v-else class="mp-code__qr-placeholder">
            <text>小程序码生成中...</text>
          </view>
        </view>

        <view class="mp-code__meta">
          <text class="mp-code__scene">scene: {{ data.scene }}</text>
          <text class="mp-code__page">page: {{ data.pagePath }}</text>
          <text v-if="data.expiresAt" class="mp-code__exp">
            有效期至 {{ data.expiresAt.slice(0, 10) }}
          </text>
        </view>
      </view>

      <view class="mp-code__actions">
        <view class="mp-code__btn mp-code__btn--primary" @tap="handleSave">
          <text>保存到相册</text>
        </view>
        <view class="mp-code__btn mp-code__btn--ghost" @tap="handleShare">
          <text>分享给朋友</text>
        </view>
      </view>
    </view>
  </view>

  <view v-else-if="data && !data.unlocked" class="mp-code-locked">
    <view class="mp-code-locked__icon">🔒</view>
    <view class="mp-code-locked__text">
      邀请 {{ data.threshold - data.invitedCount }} 位好友即可解锁专属小程序
    </view>
    <view class="mp-code-locked__sub">
      解锁后可生成你的个人小程序码（领地缩略图 + 邀请进度 + 下载 App 引导）
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mp-code {
  &__card {
    background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
    border: 2rpx solid #c9a87c;
    border-radius: 24rpx;
    padding: 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.4);
  }

  &__header {
    text-align: center;
    margin-bottom: 32rpx;
  }
  &__title {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 4rpx;
  }
  &__hint {
    display: block;
    font-size: 22rpx;
    color: #a89e85;
    margin-top: 8rpx;
  }

  &__body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__qr {
    width: 360rpx;
    height: 360rpx;
    background: #ffffff;
    border-radius: 16rpx;
    padding: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  }
  &__qr-img { width: 100%; height: 100%; }
  &__qr-placeholder {
    color: #a89e85;
    font-size: 24rpx;
  }

  &__meta {
    margin-top: 24rpx;
    text-align: center;
  }
  &__scene, &__page, &__exp {
    display: block;
    font-size: 20rpx;
    color: #a89e85;
    margin-top: 4rpx;
    font-family: monospace;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
    margin-top: 32rpx;
  }
  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;

    &--primary {
      background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
      color: #1e241f;
      box-shadow: 0 2rpx 8rpx rgba(201, 168, 124, 0.35);
    }
    &--ghost {
      background: transparent;
      color: #a89e85;
      border: 1rpx solid rgba(201, 168, 124, 0.3);
    }
    &:active { transform: scale(0.96); }
  }
}

.mp-code-locked {
  text-align: center;
  padding: 64rpx 32rpx;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx dashed rgba(201, 168, 124, 0.4);
  border-radius: 24rpx;

  &__icon {
    font-size: 96rpx;
    margin-bottom: 16rpx;
    filter: grayscale(0.5);
  }
  &__text {
    font-size: 30rpx;
    color: #c9a87c;
    font-weight: 600;
    margin-bottom: 16rpx;
  }
  &__sub {
    font-size: 24rpx;
    color: #a89e85;
    line-height: 1.6;
    padding: 0 48rpx;
  }
}
</style>
