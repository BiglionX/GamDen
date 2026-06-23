<script setup lang="ts">
/**
 * OnlineView —— 状态 6 视图（已上线）
 *
 * UI 内容：
 *  - 绿色徽章 + "已上线 🎉"
 *  - 显示小程序名称、上线时间
 *  - 显示小程序码（可保存到相册）
 *  - 显示小程序路径链接（可复制）
 *  - 运营建议文案
 */
import { computed, ref } from 'vue';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';

const store = useUserMiniProgramStore();

const showAll = ref(true);

const onlineAtText = computed(() => {
  const t = store.record?.onlineAt;
  if (!t) return null;
  try {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return null;
  }
});

const appid = computed(() => store.record?.appid ?? '');

const miniProgramPath = computed(() => {
  // 路径格式：pages/index/index?mp={userId}
  if (!store.record) return '';
  return `pages/index/index?mp=${store.record.userId}`;
});

const qrCodeUrl = computed(() => store.record?.qrCodeUrl ?? '');

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 复制小程序路径 */
function copyPath(): void {
  if (!miniProgramPath.value) return;
  uni.setClipboardData({
    data: miniProgramPath.value,
    success: () => uni.showToast({ title: '路径已复制', icon: 'success' }),
  });
}

/** 复制 AppID */
function copyAppid(): void {
  if (!appid.value) return;
  uni.setClipboardData({
    data: appid.value,
    success: () => uni.showToast({ title: 'AppID 已复制', icon: 'success' }),
  });
}

/**
 * 保存小程序码到相册
 * - qrCodeUrl 可能是 base64 dataURL 或 https URL
 */
function saveQrCode(): void {
  if (!qrCodeUrl.value) {
    uni.showToast({ title: '小程序码暂未生成', icon: 'none' });
    return;
  }
  // #ifdef H5
  uni.showToast({
    title: '请长按图片保存',
    icon: 'none',
  });
  // #endif
  // #ifndef H5
  uni.showActionSheet({
    itemList: ['保存到相册', '复制图片链接'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // base64 / URL → 临时路径 → 保存
        if (qrCodeUrl.value.startsWith('data:')) {
          // 写入临时文件
          const base64 = qrCodeUrl.value.split(',')[1] ?? '';
          // #ifdef MP-WEIXIN
          const wxGlobal = (globalThis as { wx?: { env?: { USER_DATA_PATH?: string } } }).wx;
          const wxEnv = wxGlobal?.env;
          const filePath = `${wxEnv?.USER_DATA_PATH ?? ''}/qr_${Date.now()}.png`;
          try {
            const fs = uni.getFileSystemManager();
            // writeFileSync 接受位置参数 (filePath, data, encoding)
            (fs.writeFileSync as unknown as (a: string, b: string, c: string) => void)(
              filePath,
              base64,
              'base64',
            );
            uni.saveImageToPhotosAlbum({
              filePath,
              success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
              fail: () =>
                uni.showToast({ title: '保存失败，请检查权限', icon: 'none' }),
            });
          } catch (e) {
            uni.showToast({ title: '保存失败', icon: 'none' });
          }
          // #endif
          // #ifdef APP-PLUS
          try {
            const NativeObj = plus.nativeObj as unknown as {
              Bitmap: new (name: string) => {
                loadBase64Data: (data: string, cb: () => void) => void;
                save: (path: string, opts: object, cb: () => void) => void;
                clear: () => void;
              };
            };
            const bitmap = new NativeObj.Bitmap('qr');
            bitmap.loadBase64Data(base64, () => {
              const path = `_doc/qr_${Date.now()}.png`;
              bitmap.save(path, {}, () => {
                plus.gallery.save(path, () => {
                  uni.showToast({ title: '已保存到相册', icon: 'success' });
                  bitmap.clear();
                });
              });
            });
          } catch (e) {
            uni.showToast({ title: '保存失败', icon: 'none' });
          }
          // #endif
        } else {
          // URL：直接保存网络图片
          uni.saveImageToPhotosAlbum({
            filePath: qrCodeUrl.value,
            success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
          });
        }
      } else if (res.tapIndex === 1) {
        uni.setClipboardData({
          data: qrCodeUrl.value,
          success: () => uni.showToast({ title: '已复制', icon: 'success' }),
        });
      }
    },
  });
  // #endif
}

function shareToFriend(): void {
  uni.showToast({ title: '请使用右上角菜单分享', icon: 'none' });
}
</script>

<template>
  <view class="olv">
    <!-- 顶部已上线 banner -->
    <view class="olv-banner">
      <text class="olv-banner__emoji">🎉</text>
      <view class="olv-banner__body">
        <text class="olv-banner__title">小程序已上线</text>
        <text class="olv-banner__desc">你的专属小程序已正式发布</text>
      </view>
    </view>

    <!-- 基本信息 -->
    <view class="olv-info">
      <view v-if="store.record?.customName" class="olv-info__row">
        <text class="olv-info__label">小程序名称</text>
        <text class="olv-info__value">{{ store.record.customName }}</text>
      </view>
      <view v-if="onlineAtText" class="olv-info__row">
        <text class="olv-info__label">上线时间</text>
        <text class="olv-info__value">{{ onlineAtText }}</text>
      </view>
      <view v-if="appid" class="olv-info__row" @tap="copyAppid">
        <text class="olv-info__label">AppID</text>
        <view class="olv-info__value-wrap">
          <text class="olv-info__value">{{ appid }}</text>
          <text class="olv-info__copy">复制</text>
        </view>
      </view>
    </view>

    <!-- 小程序码 -->
    <view class="olv-card">
      <view class="olv-card__title">📱 你的专属小程序码</view>
      <view class="olv-card__qr">
        <image
          v-if="qrCodeUrl"
          class="olv-card__qr-img"
          :src="qrCodeUrl"
          mode="aspectFit"
          @longpress="saveQrCode"
        />
        <view v-else class="olv-card__qr-empty">
          <text>暂无二维码</text>
        </view>
      </view>
      <text class="olv-card__hint">长按图片可保存到相册</text>
      <view
        class="olv-card__btn"
        hover-class="olv-card__btn--hover"
        @tap="saveQrCode"
      >
        <text>💾 保存到相册</text>
      </view>
    </view>

    <!-- 路径信息 -->
    <view class="olv-card">
      <view class="olv-card__title">🔗 小程序路径</view>
      <view class="olv-card__path" @tap="copyPath">
        <text class="olv-card__path-text">{{ miniProgramPath }}</text>
        <text class="olv-card__path-copy">复制</text>
      </view>
      <text class="olv-card__hint">可在公众号文章、自定义菜单中配置此路径</text>
    </view>

    <!-- 运营建议 -->
    <view class="olv-advice">
      <view class="olv-advice__title">💡 运营建议</view>
      <view class="olv-advice__list">
        <view class="olv-advice__item">
          <text class="olv-advice__num">1</text>
          <text class="olv-advice__text">把小程序码贴到公众号文章末尾，引导读者扫码体验</text>
        </view>
        <view class="olv-advice__item">
          <text class="olv-advice__num">2</text>
          <text class="olv-advice__text">在俱乐部聊天中分享你的小程序，邀请更多巢友体验</text>
        </view>
        <view class="olv-advice__item">
          <text class="olv-advice__num">3</text>
          <text class="olv-advice__text">持续邀请新朋友，扩大领地让你的小程序更具人气</text>
        </view>
      </view>
    </view>

    <!-- 分享按钮 -->
    <view
      class="olv-share"
      hover-class="olv-share--hover"
      @tap="shareToFriend"
    >
      <text>📤 分享给好友</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.olv {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.olv-banner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: linear-gradient(180deg, rgba(90, 143, 108, 0.18) 0%, rgba(90, 143, 108, 0.04) 100%);
  border: 1rpx solid rgba(90, 143, 108, 0.5);
  border-radius: 20rpx;
  padding: 32rpx;
  &__emoji {
    font-size: 72rpx;
    line-height: 1;
    animation: olv-emoji 1.5s ease-in-out infinite;
  }
  &__body { flex: 1; }
  &__title {
    display: block;
    color: #5a8f6c;
    font-size: 32rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
    margin-bottom: 4rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 24rpx;
  }
}

.olv-info {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  overflow: hidden;
  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 28rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.15);
    &:last-child { border-bottom: none; }
  }
  &__label {
    color: #a89e85;
    font-size: 24rpx;
  }
  &__value {
    color: #f5dcae;
    font-size: 26rpx;
    font-weight: 600;
  }
  &__value-wrap {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  &__copy {
    color: #c9a87c;
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 8rpx;
  }
}

.olv-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 20rpx;
  }
  &__qr {
    width: 360rpx;
    height: 360rpx;
    margin: 0 auto 16rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  }
  &__qr-img {
    width: 100%;
    height: 100%;
  }
  &__qr-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a89e85;
    font-size: 24rpx;
  }
  &__hint {
    display: block;
    text-align: center;
    color: #a89e85;
    font-size: 22rpx;
    margin-bottom: 20rpx;
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
  &__path {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background: rgba(0, 0, 0, 0.25);
    border: 1rpx solid rgba(201, 168, 124, 0.2);
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-bottom: 12rpx;
  }
  &__path-text {
    flex: 1;
    color: #f5f0e6;
    font-size: 24rpx;
    font-family: 'Courier New', monospace;
    word-break: break-all;
  }
  &__path-copy {
    flex-shrink: 0;
    color: #c9a87c;
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    background: rgba(201, 168, 124, 0.15);
    border-radius: 8rpx;
  }
}

.olv-advice {
  background: linear-gradient(180deg, rgba(90, 143, 108, 0.08) 0%, rgba(90, 143, 108, 0.02) 100%);
  border: 1rpx solid rgba(90, 143, 108, 0.3);
  border-radius: 20rpx;
  padding: 28rpx;
  &__title {
    display: block;
    color: #5a8f6c;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 20rpx;
  }
  &__list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  &__item {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
  }
  &__num {
    flex-shrink: 0;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(90, 143, 108, 0.3);
    color: #5a8f6c;
    font-size: 22rpx;
    line-height: 36rpx;
    text-align: center;
    font-weight: 700;
  }
  &__text {
    flex: 1;
    color: #f5f0e6;
    font-size: 24rpx;
    line-height: 1.6;
  }
}

.olv-share {
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
}

@keyframes olv-emoji {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1) rotate(5deg); }
}
</style>
