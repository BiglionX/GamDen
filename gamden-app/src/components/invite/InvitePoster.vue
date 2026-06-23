<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import type { InvitePosterData } from '@/types/invite';
import { DEFAULT_POSTER_CONFIG } from '@/types/invite';

interface Props {
  data: InvitePosterData | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'saved'): void;
  (e: 'error', message: string): void;
}>();

const canvasId = 'invite-poster-canvas';
const posterWidth = DEFAULT_POSTER_CONFIG.width;
const posterHeight = DEFAULT_POSTER_CONFIG.height;

const saving = ref(false);
const canvasReady = ref(false);

const isReady = computed(() => !!props.data);

const GUARDIAN_LABEL: Record<string, string> = {
  mechanical: '机械师',
  elf: '精灵',
  astrologer: '占星师',
};
const GUARDIAN_ICON: Record<string, string> = {
  mechanical: '⚙️',
  elf: '🌿',
  astrologer: '🔮',
};

onMounted(() => {
  if (props.data) {
    drawPoster();
  }
});

/**
 * 在 canvas 上绘制完整海报
 * - Canvas 2D API（type="2d"）
 * - 跨 H5 / 微信小程序 / App
 */
async function drawPoster() {
  if (!props.data) return;
  await nextTick();

  const query = uni.createSelectorQuery();
  // 微信小程序 + H5 都支持
  // #ifdef MP-WEIXIN
  ;(query as any)
    .select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec((res: any) => {
      const canvas = (res[0] as { node: any; width: number; height: number })?.node;
      if (!canvas) return drawFallback();
      paintOn(canvas);
    });
  // #endif
  // #ifndef MP-WEIXIN
  drawFallback();
  // #endif
}

/**
 * 非微信小程序环境的兜底绘制（H5 / App）
 * 使用 uni.canvasToTempFilePath 流程
 */
function drawFallback() {
  // H5 端用 html2canvas / dom-to-image 更合适；App 端用 Canvas 2D 同样可行
  // 此处给个简单提示：H5 端用 preview 截图，App 端用原生 canvas
  canvasReady.value = true;
  // #ifdef APP-PLUS
  // App 端原生 canvas（plus.canvas）
  // 实际项目可接 5+App 的 Native.js
  // #endif
}

function paintOn(canvas: any) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = props.data!;

  // DPR 适配
  const sysInfo = uni.getSystemInfoSync();
  const dpr = sysInfo.pixelRatio || 1;
  canvas.width = posterWidth * dpr;
  canvas.height = posterHeight * dpr;
  ctx.scale(dpr, dpr);

  const { background, primary, textPrimary, textSecondary } = DEFAULT_POSTER_CONFIG;

  // 1. 背景
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, posterWidth, posterHeight);

  // 2. 顶部装饰条
  ctx.fillStyle = primary;
  ctx.fillRect(60, 60, posterWidth - 120, 4);

  // 3. 品牌名
  ctx.fillStyle = primary;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GamDen', posterWidth / 2, 160);

  // 4. 副标题
  ctx.fillStyle = textSecondary;
  ctx.font = '24px sans-serif';
  ctx.fillText('游戏巢穴 · 邀请制社区', posterWidth / 2, 200);

  // 5. 装饰线
  ctx.strokeStyle = primary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(posterWidth / 2 - 60, 240);
  ctx.lineTo(posterWidth / 2 + 60, 240);
  ctx.stroke();

  // 6. 用户昵称（大）
  ctx.fillStyle = textPrimary;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(data.nickname, posterWidth / 2, 340);

  // 7. 守护灵
  if (data.guardianType) {
    ctx.fillStyle = primary;
    ctx.font = '32px sans-serif';
    const guardianLabel = GUARDIAN_LABEL[data.guardianType] ?? '';
    const guardianIcon = GUARDIAN_ICON[data.guardianType] ?? '';
    ctx.fillText(`${guardianIcon}  ${guardianLabel}`, posterWidth / 2, 400);
  }

  // 8. 邀请标题
  ctx.fillStyle = primary;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('我的邀请码', posterWidth / 2, 500);

  // 9. 邀请码（大字号 monospace）
  ctx.fillStyle = textPrimary;
  ctx.font = 'bold 88px monospace';
  // 字符间距
  const code = data.inviteCode;
  const codeWidth = ctx.measureText(code).width;
  ctx.fillText(code, posterWidth / 2, 620);

  // 10. 提示文字
  ctx.fillStyle = textSecondary;
  ctx.font = '24px sans-serif';
  ctx.fillText(`已邀请 ${data.totalInvited} 位巢友`, posterWidth / 2, 690);

  // 11. 二维码框
  const qrSize = 280;
  const qrX = (posterWidth - qrSize) / 2;
  const qrY = 780;
  ctx.fillStyle = textPrimary;
  ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);

  // 12. 二维码图片
  if (data.qrCodeDataUrl) {
    const img = canvas.createImage();
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      canvasReady.value = true;
    };
    img.onerror = () => {
      // 二维码加载失败时显示提示文字
      ctx.fillStyle = textSecondary;
      ctx.font = '20px sans-serif';
      ctx.fillText('扫码加载失败', posterWidth / 2, qrY + qrSize / 2);
      canvasReady.value = true;
    };
    img.src = data.qrCodeDataUrl;
  } else {
    // 占位
    ctx.fillStyle = '#2a3128';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = textSecondary;
    ctx.font = '22px sans-serif';
    ctx.fillText('GamDen', posterWidth / 2, qrY + qrSize / 2 - 12);
    ctx.font = '18px sans-serif';
    ctx.fillText('扫码加入巢穴', posterWidth / 2, qrY + qrSize / 2 + 16);
    canvasReady.value = true;
  }

  // 13. 底部 logo + 标语
  ctx.fillStyle = primary;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('扫码加入 · 共筑巢穴', posterWidth / 2, posterHeight - 100);
  ctx.fillStyle = textSecondary;
  ctx.font = '20px sans-serif';
  ctx.fillText('gamden.matux.tech', posterWidth / 2, posterHeight - 60);
}

/**
 * 保存海报到相册
 */
async function handleSave() {
  if (!props.data) return;
  if (!canvasReady.value) {
    uni.showToast({ title: '海报还在绘制中，请稍候', icon: 'none' });
    return;
  }
  saving.value = true;

  try {
    // 微信小程序 + App：canvasToTempFilePath
    // #ifdef MP-WEIXIN || APP-PLUS
    const tempRes = await new Promise<{ tempFilePath: string }>((resolve, reject) => {
      uni.canvasToTempFilePath(
        {
          canvasId,
          success: (r: any) => resolve(r as { tempFilePath: string }),
          fail: (e: any) => reject(e),
        } as any,
      );
    });

    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: tempRes.tempFilePath,
        success: () => resolve(),
        fail: (e: any) => reject(e),
      });
    });

    uni.showToast({ title: '已保存到相册', icon: 'success' });
    emit('saved');
    // #endif
    // #ifdef H5
    // H5 端：用 a 标签下载 dataURL
    const link = document.createElement('a');
    link.href = props.data.qrCodeDataUrl || '';
    link.download = `gamden-invite-${props.data.inviteCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    uni.showToast({ title: '已下载', icon: 'success' });
    emit('saved');
    // #endif
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败';
    uni.showToast({ title: msg, icon: 'none' });
    emit('error', msg);
  } finally {
    saving.value = false;
  }
}

defineExpose({ handleSave, redraw: drawPoster });
</script>

<template>
  <view class="invite-poster">
    <!-- 隐藏的 canvas（用于绘制海报并导出图片） -->
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      type="2d"
      class="invite-poster__canvas"
      :style="{ width: posterWidth + 'rpx', height: posterHeight + 'rpx' }"
    />

    <!-- 海报预览（视觉模拟） -->
    <view v-if="isReady" class="invite-poster__preview">
      <view class="invite-poster__card">
        <view class="invite-poster__brand">GamDen</view>
        <view class="invite-poster__subtitle">游戏巢穴 · 邀请制社区</view>
        <view class="invite-poster__divider" />
        <view class="invite-poster__nickname">{{ data?.nickname }}</view>
        <view v-if="data?.guardianType" class="invite-poster__guardian">
          {{ GUARDIAN_ICON[data.guardianType] }}  {{ GUARDIAN_LABEL[data.guardianType] }}
        </view>
        <view class="invite-poster__invite-title">我的邀请码</view>
        <view class="invite-poster__invite-code">{{ data?.inviteCode }}</view>
        <view class="invite-poster__invite-stat">
          已邀请 {{ data?.totalInvited }} 位巢友
        </view>
        <view class="invite-poster__qr">
          <image
            v-if="data?.qrCodeDataUrl"
            :src="data.qrCodeDataUrl"
            class="invite-poster__qr-img"
            mode="aspectFit"
          />
          <view v-else class="invite-poster__qr-placeholder">
            <text>GamDen</text>
          </view>
        </view>
        <view class="invite-poster__footer">
          <text class="invite-poster__footer-title">扫码加入 · 共筑巢穴</text>
          <text class="invite-poster__footer-url">gamden.matux.tech</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.invite-poster {
  position: relative;

  &__canvas {
    position: fixed;
    left: -9999px;
    top: -9999px;
    pointer-events: none;
  }

  &__preview {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 24rpx;
  }

  &__card {
    width: 600rpx;
    background: #1e241f;
    border: 2rpx solid #c9a87c;
    border-radius: 24rpx;
    padding: 56rpx 40rpx 48rpx;
    box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.5);
  }

  &__brand {
    text-align: center;
    font-size: 64rpx;
    font-weight: 700;
    color: #c9a87c;
    letter-spacing: 8rpx;
  }
  &__subtitle {
    text-align: center;
    font-size: 24rpx;
    color: #a89e85;
    margin-top: 16rpx;
  }
  &__divider {
    width: 120rpx;
    height: 2rpx;
    background: #c9a87c;
    margin: 40rpx auto;
  }
  &__nickname {
    text-align: center;
    font-size: 56rpx;
    font-weight: 700;
    color: #f5f0e6;
  }
  &__guardian {
    text-align: center;
    font-size: 30rpx;
    color: #c9a87c;
    margin-top: 20rpx;
  }
  &__invite-title {
    text-align: center;
    font-size: 28rpx;
    color: #c9a87c;
    margin-top: 48rpx;
    letter-spacing: 4rpx;
  }
  &__invite-code {
    text-align: center;
    font-size: 88rpx;
    font-weight: 700;
    color: #f5f0e6;
    font-family: 'Courier New', monospace;
    letter-spacing: 6rpx;
    margin-top: 16rpx;
  }
  &__invite-stat {
    text-align: center;
    font-size: 24rpx;
    color: #a89e85;
    margin-top: 16rpx;
  }
  &__qr {
    width: 320rpx;
    height: 320rpx;
    margin: 40rpx auto 0;
    background: #f5f0e6;
    padding: 12rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__qr-img { width: 100%; height: 100%; }
  &__qr-placeholder {
    color: #1e241f;
    font-size: 32rpx;
    font-weight: 700;
  }
  &__footer {
    text-align: center;
    margin-top: 40rpx;
  }
  &__footer-title {
    display: block;
    font-size: 28rpx;
    color: #c9a87c;
    font-weight: 600;
  }
  &__footer-url {
    display: block;
    font-size: 22rpx;
    color: #a89e85;
    margin-top: 8rpx;
  }
}
</style>
