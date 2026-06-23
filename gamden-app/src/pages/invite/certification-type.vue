<script setup lang="ts">
/**
 * 主体类型选择页
 *
 * 触发：用户从"我的小程序"中心页（not_started 状态）点击【开始申请 →】跳转
 *
 * 流程：
 *  1. 用户选择主体类型（个人 / 企业）
 *  2. 点击【选择】 → 二次确认 → 调 POST /mini-program/apply
 *  3. 成功后跳转到微信公众平台注册页（外部浏览器）
 *  4. 用户完成注册后回到 App，本页 onShow 会自动拉取最新状态
 *  5. 若状态已推进至 certifying，提示用户并自动回退到中心页
 *
 * 多端处理：
 *  - H5：window.open
 *  - MP-WEIXIN：uni.setClipboardData 复制链接 + 提示（小程序不能直接打开外链）
 *  - APP-PLUS：plus.runtime.openURL
 */
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';
import type { CertificationType } from '@/types/mini-program';
import { track, TrackEvent } from '@/utils/track';

/** 微信公众平台注册页（V1.0 通用注册入口，后续可改为小程序专用注册引导页） */
const WECHAT_REGISTRATION_URL =
  'https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN';

interface TypeOption {
  key: CertificationType;
  icon: string;
  title: string;
  prepare: string;
  fee: string;
  highlight: { label: string; positive: boolean };
  fitFor: string;
  cta: string;
}

const options: TypeOption[] = [
  {
    key: 'individual',
    icon: '👤',
    title: '个人主体',
    prepare: '身份证正反面',
    fee: '30 元 / 年',
    highlight: { label: '无支付功能', positive: false },
    fitFor: '展示型小程序（个人名片、兴趣主页）',
    cta: '选择个人主体',
  },
  {
    key: 'enterprise',
    icon: '🏢',
    title: '企业 / 个体工商户',
    prepare: '营业执照（企业还须对公账户、法人身份证）',
    fee: '300 元 / 年',
    highlight: { label: '支持微信支付等全部能力', positive: true },
    fitFor: '商业化运营、社群电商、付费服务',
    cta: '选择企业主体',
  },
];

const store = useUserMiniProgramStore();

/** 当前选中的主体类型（默认 individual） */
const selectedType = ref<CertificationType>('individual');

/** 二次确认弹窗 */
const showConfirm = ref(false);

/** 提交中 */
const submitting = ref(false);

/** 跳外部后的"等待返回"状态：onShow 中检测到状态变化时自动回退 */
const waitingReturn = ref(false);

/** 计算当前选中项（用于详情区展示） */
const currentOption = computed<TypeOption>(
  () => options.find((o) => o.key === selectedType.value) ?? options[0],
);

/**
 * 入口校验：未解锁 / 状态已非 not_started 时直接退回中心页
 * - 由 onLoad 触发（路由参数 + 状态守卫）
 */
onLoad(() => {
  if (!store.unlocked) {
    uni.showToast({ title: '尚未获得部署资格', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  if (store.status !== 'not_started') {
    uni.showToast({ title: '当前状态不可重新选择', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
  }
});

/**
 * onShow 钩子：用户从外部回到 App 时拉取最新状态
 * - 若状态已推进至 certifying，说明用户已在外部完成初步操作，自动回退到中心页
 * - 若用户已完成微信认证（certified），中心页会自动展示对应状态视图
 */
onShow(async () => {
  if (!waitingReturn.value) return;
  if (!store.unlocked) return;
  await store.fetchStatus(true);
  if (store.status !== 'not_started') {
    waitingReturn.value = false;
    uni.showToast({ title: '申请进度已更新', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  }
});

/** 选择主体类型（点击卡片区域） */
function selectType(t: CertificationType): void {
  selectedType.value = t;
}

/** 点击【选择】按钮：触发二次确认 */
function handleSelectClick(): void {
  showConfirm.value = true;
  // 埋点：mp_apply_start（用户点击"开始申请"按钮，提交主体类型）
  track(TrackEvent.MpApplyStart, {
    certification_type: selectedType.value,
  });
}

/** 关闭二次确认弹窗 */
function closeConfirm(): void {
  showConfirm.value = false;
}

/** 确认提交：调 API + 跳转外部 */
async function handleConfirmSubmit(): Promise<void> {
  showConfirm.value = false;
  submitting.value = true;
  // 埋点：mp_cert_submitted（用户确认已提交认证，进入微信注册流程）
  track(TrackEvent.MpCertSubmitted);
  try {
    await store.apply(selectedType.value);
    uni.showToast({ title: '申请已记录，正在打开微信公众平台...', icon: 'none' });
    waitingReturn.value = true;
    // 短暂延迟让 toast 可见，再打开外部链接
    setTimeout(() => openWechatRegistration(), 600);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '提交失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

/**
 * 打开微信公众平台注册页
 * - H5：window.open
 * - APP-PLUS：plus.runtime.openURL
 * - MP-WEIXIN：复制链接 + 引导用户到浏览器打开（小程序不能直接打开外链）
 */
function openWechatRegistration(): void {
  const url = WECHAT_REGISTRATION_URL;
  // #ifdef H5
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
  // #endif
  // #ifdef APP-PLUS
  plus.runtime.openURL(
    url,
    () => uni.showToast({ title: '打开失败，请检查系统浏览器', icon: 'none' }),
  );
  // #endif
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: url,
    success: () =>
      uni.showModal({
        title: '链接已复制',
        content:
          '小程序内无法直接打开微信公众平台。链接已复制到剪贴板，请前往浏览器粘贴访问。',
        confirmText: '我知道了',
        showCancel: false,
      }),
    fail: () =>
      uni.showToast({ title: '复制失败，请手动打开浏览器', icon: 'none' }),
  });
  // #endif
}

/** 返回中心页 */
function handleBack(): void {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/profile/index' }),
  });
}
</script>

<template>
  <view class="page-ct">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="navbar__back" hover-class="navbar__back--hover" @tap="handleBack">
        <text>‹</text>
      </view>
      <text class="navbar__title">选择你的主体类型</text>
      <view class="navbar__placeholder" />
    </view>

    <!-- 顶部说明 -->
    <view class="ct-intro">
      <text class="ct-intro__title">🪶 选对你的身份</text>
      <text class="ct-intro__desc">
        小程序的主体类型将影响你的功能权限与认证费用。提交后可在【认证中】状态放弃并重新选择。
      </text>
    </view>

    <!-- 卡片列表 -->
    <view class="ct-cards">
      <view
        v-for="opt in options"
        :key="opt.key"
        class="ct-card"
        :class="{ 'ct-card--active': selectedType === opt.key }"
        hover-class="ct-card--hover"
        @tap="selectType(opt.key)"
      >
        <!-- 选中标记 -->
        <view v-if="selectedType === opt.key" class="ct-card__check">
          <text>✓</text>
        </view>

        <!-- 头部：图标 + 标题 -->
        <view class="ct-card__head">
          <text class="ct-card__icon">{{ opt.icon }}</text>
          <text class="ct-card__title">{{ opt.title }}</text>
        </view>

        <!-- 信息行 -->
        <view class="ct-card__rows">
          <view class="ct-card__row">
            <text class="ct-card__row-label">需准备</text>
            <text class="ct-card__row-value">{{ opt.prepare }}</text>
          </view>
          <view class="ct-card__row">
            <text class="ct-card__row-label">认证费</text>
            <text class="ct-card__row-value ct-card__row-value--fee">
              {{ opt.fee }}
            </text>
          </view>
          <view class="ct-card__row">
            <text class="ct-card__row-label">{{
              opt.highlight.positive ? '优势' : '限制'
            }}</text>
            <text
              class="ct-card__row-value"
              :class="{
                'ct-card__row-value--positive': opt.highlight.positive,
                'ct-card__row-value--negative': !opt.highlight.positive,
              }"
            >
              {{ opt.highlight.label }}
            </text>
          </view>
          <view class="ct-card__row">
            <text class="ct-card__row-label">适合</text>
            <text class="ct-card__row-value">{{ opt.fitFor }}</text>
          </view>
        </view>

        <!-- 选择按钮 -->
        <view
          class="ct-card__btn"
          :class="{ 'ct-card__btn--active': selectedType === opt.key }"
          hover-class="ct-card__btn--hover"
          @tap.stop="selectType(opt.key)"
        >
          <text>
            {{
              selectedType === opt.key ? '✓ 已选择（点击下方按钮提交）' : '选择'
            }}
          </text>
        </view>
      </view>
    </view>

    <!-- 主提交按钮 -->
    <view
      class="ct-submit"
      :class="{ 'ct-submit--disabled': submitting }"
      hover-class="ct-submit--hover"
      @tap="handleSelectClick"
    >
      <text>{{ submitting ? '提交中...' : `确认选择：${currentOption.title}` }}</text>
    </view>

    <!-- 底部提示 -->
    <view class="ct-footnote">
      <text class="ct-footnote__line">
        💡 个人主体功能受限（无法使用微信支付等），但作为个人展示名片已足够。
      </text>
      <text class="ct-footnote__line">后期可升级为企业主体。</text>
    </view>

    <!-- 二次确认弹窗 -->
    <view v-if="showConfirm" class="ct-modal-mask" @tap="closeConfirm">
      <view class="ct-modal" @tap.stop>
        <text class="ct-modal__title">确认主体类型？</text>
        <text class="ct-modal__desc">
          你选择了【{{ currentOption.title }}（{{ currentOption.fee }}）】。
          提交后将打开微信公众平台注册页，请在外部完成小程序注册与认证。
          完成后回到本 App，状态会自动更新为【认证中】。
        </text>
        <view class="ct-modal__actions">
          <view
            class="ct-modal__btn ct-modal__btn--cancel"
            hover-class="ct-modal__btn--hover"
            @tap="closeConfirm"
          >
            <text>再想想</text>
          </view>
          <view
            class="ct-modal__btn ct-modal__btn--confirm"
            hover-class="ct-modal__btn--hover"
            @tap="handleConfirmSubmit"
          >
            <text>确认并打开微信</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 等待返回提示层（遮罩 + 文案，不可关闭） -->
    <view v-if="waitingReturn" class="ct-wait-mask">
      <view class="ct-wait">
        <view class="ct-wait__spinner">
          <text>⏳</text>
        </view>
        <text class="ct-wait__title">等待你完成微信端操作...</text>
        <text class="ct-wait__desc">
          完成后请返回 GamDen，本页会自动检测并更新状态。
        </text>
        <view
          class="ct-wait__btn"
          hover-class="ct-wait__btn--hover"
          @tap="openWechatRegistration"
        >
          <text>🔗 重新打开微信公众平台</text>
        </view>
        <view
          class="ct-wait__link"
          hover-class="ct-wait__link--hover"
          @tap="handleBack"
        >
          <text>已完成，返回中心页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-ct {
  min-height: 100vh;
  background: linear-gradient(180deg, #1e241f 0%, #15191b 100%);
  padding-bottom: 80rpx;
}

/* ===== 导航 ===== */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: rgba(30, 36, 31, 0.95);
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.15);
  &__back {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c9a87c;
    font-size: 56rpx;
    line-height: 1;
    &--hover { opacity: 0.7; }
  }
  &__title {
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
  &__placeholder { width: 64rpx; }
}

/* ===== 顶部说明 ===== */
.ct-intro {
  padding: 32rpx 32rpx 16rpx;
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    margin-bottom: 8rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
  }
}

/* ===== 卡片列表 ===== */
.ct-cards {
  padding: 16rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.ct-card {
  position: relative;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  transition: all 0.2s ease;
  &--active {
    border-color: #c9a87c;
    background: linear-gradient(180deg, rgba(201, 168, 124, 0.15) 0%, #1e241f 100%);
    box-shadow: 0 4rpx 24rpx rgba(201, 168, 124, 0.25);
  }
  &--hover {
    transform: scale(0.99);
  }
  &__check {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 26rpx;
    font-weight: 800;
    line-height: 40rpx;
    text-align: center;
    box-shadow: 0 2rpx 8rpx rgba(201, 168, 124, 0.4);
  }
  &__head {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }
  &__icon {
    font-size: 64rpx;
    line-height: 1;
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__title {
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
  &__rows {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
    margin-bottom: 24rpx;
  }
  &__row {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
  }
  &__row-label {
    flex-shrink: 0;
    width: 96rpx;
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
  }
  &__row-value {
    flex: 1;
    color: #f5f0e6;
    font-size: 24rpx;
    line-height: 1.6;
    &--fee {
      color: #c9a87c;
      font-weight: 700;
      font-size: 26rpx;
    }
    &--positive {
      color: #5a8f6c;
      font-weight: 600;
    }
    &--negative {
      color: #c0886e;
      font-weight: 600;
    }
  }
  &__btn {
    height: 80rpx;
    border-radius: 40rpx;
    border: 1rpx solid rgba(201, 168, 124, 0.4);
    color: #c9a87c;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    &--active {
      background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
      color: #1e241f;
      border-color: transparent;
    }
    &--hover {
      transform: scale(0.98);
      opacity: 0.92;
    }
  }
}

/* ===== 主提交按钮 ===== */
.ct-submit {
  margin: 32rpx 32rpx 24rpx;
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
  &--hover {
    transform: scale(0.98);
    opacity: 0.92;
  }
  &--disabled {
    opacity: 0.6;
  }
}

/* ===== 底部提示 ===== */
.ct-footnote {
  padding: 16rpx 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  &__line {
    color: #a89e85;
    font-size: 22rpx;
    line-height: 1.7;
    text-align: center;
  }
}

/* ===== 二次确认弹窗 ===== */
.ct-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(15, 20, 16, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  animation: ct-mask-in 0.25s ease-out;
}
.ct-modal {
  width: 100%;
  max-width: 600rpx;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx;
  animation: ct-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    text-align: center;
    margin-bottom: 16rpx;
  }
  &__desc {
    display: block;
    color: #f5f0e6;
    font-size: 26rpx;
    line-height: 1.7;
    margin-bottom: 32rpx;
  }
  &__actions {
    display: flex;
    gap: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 600;
    transition: all 0.15s ease;
    &--hover { transform: scale(0.98); }
    &--cancel {
      background: transparent;
      border: 1rpx solid rgba(201, 168, 124, 0.4);
      color: #c9a87c;
    }
    &--confirm {
      background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
      color: #1e241f;
    }
  }
}

/* ===== 等待返回遮罩 ===== */
.ct-wait-mask {
  position: fixed;
  inset: 0;
  z-index: 9600;
  background: rgba(15, 20, 16, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  animation: ct-mask-in 0.3s ease-out;
}
.ct-wait {
  width: 100%;
  max-width: 560rpx;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 24rpx;
  padding: 56rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  &__spinner {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72rpx;
    margin-bottom: 24rpx;
    animation: ct-wait-spin 2s ease-in-out infinite;
  }
  &__title {
    color: #f5dcae;
    font-size: 30rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }
  &__desc {
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.7;
    margin-bottom: 32rpx;
  }
  &__btn {
    width: 100%;
    height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 28rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.35);
    transition: all 0.15s ease;
    &--hover {
      transform: scale(0.98);
      opacity: 0.92;
    }
  }
  &__link {
    margin-top: 16rpx;
    height: 64rpx;
    color: #c9a87c;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s ease;
    &--hover { opacity: 0.7; }
  }
}

@keyframes ct-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ct-modal-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes ct-wait-spin {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(15deg); }
}
</style>
