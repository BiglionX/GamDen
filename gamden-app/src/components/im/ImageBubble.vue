<script setup lang="ts">
/**
 * ImageBubble - 图片消息气泡
 * ----------------------------------------------------------------------
 * 复用 ChatBubble 的古风边框纹理，主体改为图片：
 *   - 本地路径（发送中）：直接渲染本地 image
 *   - 远端 URL（已上传）：优先展示快照，失败回退原图
 *   - 加载失败：显示破图占位
 *   - 点击图片：触发 preview-image 全屏预览
 *
 * Props:
 *   - isSelf   自己消息（右对齐）
 *   - image    ImageMessageBody
 *   - avatar / name / time / status
 *
 * Emits:
 *   - tap-image (url)
 */
import { computed, ref } from 'vue';
import type { ImageMessageBody } from '@/types/im';

interface Props {
  isSelf?: boolean;
  image: ImageMessageBody;
  avatar?: string;
  name?: string;
  time?: string;
  status?: 'sending' | 'success' | 'failed';
}

const props = withDefaults(defineProps<Props>(), {
  isSelf: false,
  avatar: '🛖',
  name: '',
  time: '',
  status: 'success',
});

const emit = defineEmits<{
  (e: 'tap-image', url: string): void;
}>();

const showStatus = computed(
  () => props.isSelf && props.status && props.status !== 'success',
);

/** 展示的图片源（优先快照图，回退原图） */
const displayUrl = computed<string>(() => {
  return props.image.snapshotUrl || props.image.url || props.image.sourcePath || '';
});

/** 加载失败状态 */
const loadError = ref(false);
function handleError() {
  loadError.value = true;
}

function handleTap() {
  if (!displayUrl.value) return;
  emit('tap-image', displayUrl.value);
}
</script>

<template>
  <view class="img-bubble" :class="{ 'img-bubble--self': isSelf }">
    <!-- 头像 -->
    <view v-if="!isSelf" class="img-bubble__avatar">
      <text class="img-bubble__avatar-icon">
        {{ avatar }}
      </text>
    </view>

    <!-- 主内容 -->
    <view class="img-bubble__main">
      <text v-if="!isSelf && name" class="img-bubble__name">
        {{ name }}
      </text>

      <view class="img-bubble__body">
        <view class="img-bubble__border-outer" />
        <view class="img-bubble__border-inner" />
        <view class="img-bubble__body-inner" @tap="handleTap">
          <image
            v-if="displayUrl && !loadError"
            class="img-bubble__img"
            :src="displayUrl"
            mode="widthFix"
            @error="handleError"
          />
          <view v-else class="img-bubble__broken">
            <text class="img-bubble__broken-icon">
              🖼️
            </text>
            <text class="img-bubble__broken-text">
              图片加载失败
            </text>
          </view>

          <!-- 发送中遮罩 -->
          <view v-if="status === 'sending'" class="img-bubble__mask">
            <text class="img-bubble__mask-text">
              发送中...
            </text>
          </view>
        </view>
      </view>

      <view v-if="time || showStatus" class="img-bubble__footer">
        <text
          v-if="showStatus"
          class="img-bubble__status"
          :class="`img-bubble__status--${status}`"
        >
          {{ status === 'sending' ? '发送中...' : '发送失败' }}
        </text>
        <text v-if="time" class="img-bubble__time">
          {{ time }}
        </text>
      </view>
    </view>

    <view v-if="isSelf" class="img-bubble__avatar img-bubble__avatar--self">
      <text class="img-bubble__avatar-icon">
        {{ avatar }}
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.img-bubble {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 24rpx;
  width: 100%;

  &__avatar {
    flex-shrink: 0;
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    border: 2rpx solid rgba(201, 168, 124, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.35);
    &-icon { font-size: 40rpx; line-height: 1; }
  }

  &__main {
    display: flex;
    flex-direction: column;
    max-width: 70%;
    min-width: 0;
  }

  &__name {
    font-size: 22rpx;
    color: $u-tips-color;
    margin-bottom: 6rpx;
    padding-left: 16rpx;
  }

  &__body {
    position: relative;
    padding: 6rpx;
    border-radius: 18rpx;
    background: linear-gradient(135deg, #8B7355 0%, #6B5840 50%, #8B7355 100%);
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.4);
  }

  &__border-outer {
    position: absolute;
    inset: 0;
    border-radius: 18rpx;
    background-image:
      repeating-linear-gradient(
        45deg,
        rgba(201, 168, 124, 0.18) 0,
        rgba(201, 168, 124, 0.18) 2rpx,
        transparent 2rpx,
        transparent 6rpx
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(201, 168, 124, 0.12) 0,
        rgba(201, 168, 124, 0.12) 2rpx,
        transparent 2rpx,
        transparent 6rpx
      );
    pointer-events: none;
  }

  &__border-inner {
    position: absolute;
    inset: 4rpx;
    border-radius: 14rpx;
    border: 2rpx solid rgba(245, 240, 230, 0.25);
    pointer-events: none;
  }

  &__body-inner {
    position: relative;
    padding: 6rpx;
    border-radius: 14rpx;
    background: #262d27;
    min-width: 200rpx;
    min-height: 200rpx;
    max-width: 480rpx;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__img {
    width: 100%;
    border-radius: 8rpx;
    display: block;
  }

  &__broken {
    padding: 48rpx 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    color: $u-tips-color;
  }
  &__broken-icon { font-size: 56rpx; }
  &__broken-text { font-size: 22rpx; }

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__mask-text {
    color: #c9a87c;
    font-size: 24rpx;
    font-weight: 600;
    letter-spacing: 2rpx;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 8rpx;
    padding: 0 16rpx;
  }
  &__time {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.7;
  }
  &__status {
    font-size: 20rpx;
    opacity: 0.7;
    &--sending { color: #c9a87c; }
    &--failed { color: $u-warning; font-weight: 600; opacity: 1; }
  }

  &--self {
    flex-direction: row-reverse;
    .img-bubble__main { align-items: flex-end; }
    .img-bubble__name { display: none; }
    .img-bubble__body { background: linear-gradient(135deg, #C9A87C 0%, #A8895F 50%, #C9A87C 100%); }
    .img-bubble__body-inner { background: #C9A87C; }
    .img-bubble__avatar--self { border-color: rgba(216, 190, 149, 0.7); }
    .img-bubble__footer { justify-content: flex-end; }
  }
}
</style>