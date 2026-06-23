<script setup lang="ts">
/**
 * NotStartedView —— 状态 1 视图（尚未申请）
 *
 * UI 内容：
 *  - 徽章"尚未申请" + 进度 0/4
 *  - 准备材料清单（身份证/邮箱/银行卡等）
 *  - 费用说明（个人30元/年、企业300元/年）
 *  - 预估耗时（3-15个工作日）
 *  - 主按钮：【开始申请 →】（跳转到主体类型选择页）
 *  - 次要链接：【📖 查看图文教程】
 *
 * 主体类型的选择在独立页面 pages/invite/certification-type 中完成
 */
import { useUserMiniProgramStore } from '@/stores/user-mini-program';

const emit = defineEmits<{
  (e: 'open-tutorial'): void;
  (e: 'navigate-to-type'): void;
}>();

const store = useUserMiniProgramStore();

const materials = [
  { icon: '🆔', label: '身份证（中国大陆居民身份证）' },
  { icon: '📧', label: '本人手机号 / 邮箱' },
  { icon: '💳', label: '微信支付认证费用（个人 30 元 / 年，企业 300 元 / 年）' },
  { icon: '🏢', label: '企业主体：营业执照、对公账户、法人身份证' },
];

const feeList = [
  { type: 'individual', icon: '🧑', label: '个人主体', fee: '30 元 / 年' },
  { type: 'enterprise', icon: '🏢', label: '企业 / 个体工商户', fee: '300 元 / 年' },
];

function handleStartApply(): void {
  emit('navigate-to-type');
}

function handleOpenTutorial(): void {
  emit('open-tutorial');
}
</script>

<template>
  <view class="nsv">
    <!-- 顶部说明 -->
    <view class="nsv-intro">
      <text class="nsv-intro__title">📜 准备开始你的小程序申请</text>
      <text class="nsv-intro__desc">
        请先在微信公众平台完成小程序注册与认证，然后回到本页面继续后续步骤。
      </text>
    </view>

    <!-- 准备材料清单 -->
    <view class="nsv-card">
      <view class="nsv-card__header">
        <text class="nsv-card__title">📋 准备材料</text>
        <text class="nsv-card__sub">建议提前准备以下材料</text>
      </view>
      <view class="nsv-materials">
        <view
          v-for="(m, idx) in materials"
          :key="idx"
          class="nsv-material"
        >
          <text class="nsv-material__icon">{{ m.icon }}</text>
          <text class="nsv-material__label">{{ m.label }}</text>
        </view>
      </view>
    </view>

    <!-- 费用说明 -->
    <view class="nsv-card">
      <view class="nsv-card__header">
        <text class="nsv-card__title">💰 认证费用</text>
        <text class="nsv-card__sub">由微信收取，一次性年费</text>
      </view>
      <view class="nsv-fees">
        <view
          v-for="f in feeList"
          :key="f.type"
          class="nsv-fee"
        >
          <text class="nsv-fee__icon">{{ f.icon }}</text>
          <text class="nsv-fee__label">{{ f.label }}</text>
          <text class="nsv-fee__price">{{ f.fee }}</text>
        </view>
      </view>
    </view>

    <!-- 耗时预估 -->
    <view class="nsv-tip">
      <text class="nsv-tip__icon">⏱️</text>
      <view class="nsv-tip__body">
        <text class="nsv-tip__title">预估耗时：3-15 个工作日</text>
        <text class="nsv-tip__desc">包含微信认证审核 + 部署上线时间</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="nsv-actions">
      <view
        class="nsv-actions__primary"
        hover-class="nsv-actions__primary--hover"
        @tap="handleStartApply"
      >
        <text>开始申请 →</text>
      </view>
      <view class="nsv-actions__secondary" @tap="handleOpenTutorial">
        <text>📖 查看图文教程</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.nsv {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.nsv-intro {
  padding: 0 8rpx;
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    margin-bottom: 12rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
  }
}

.nsv-card {
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;

  &__header {
    margin-bottom: 20rpx;
  }
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 4rpx;
  }
  &__sub {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
  }
}

.nsv-materials {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.nsv-material {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  &__icon { font-size: 32rpx; }
  &__label {
    flex: 1;
    color: #f5f0e6;
    font-size: 24rpx;
    line-height: 1.5;
  }
}

.nsv-fees {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.nsv-fee {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  &__icon { font-size: 32rpx; }
  &__label {
    flex: 1;
    color: #f5f0e6;
    font-size: 26rpx;
  }
  &__price {
    color: #c9a87c;
    font-size: 28rpx;
    font-weight: 700;
  }
}

.nsv-types {
  display: flex;
  gap: 16rpx;
}
.nsv-type {
  flex: 1;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border: 2rpx solid rgba(201, 168, 124, 0.25);
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s ease;
  &--active {
    border-color: #c9a87c;
    background: rgba(201, 168, 124, 0.12);
  }
  &--hover { transform: scale(0.98); }
  &__icon { font-size: 56rpx; line-height: 1; }
  &__label {
    color: #f5f0e6;
    font-size: 26rpx;
    font-weight: 600;
  }
  &__fee {
    color: #a89e85;
    font-size: 22rpx;
  }
  &__check {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: #c9a87c;
    color: #1e241f;
    font-size: 24rpx;
    line-height: 36rpx;
    text-align: center;
    font-weight: 800;
  }
}

.nsv-tip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(241, 196, 15, 0.1);
  border: 1rpx solid rgba(241, 196, 15, 0.3);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  &__icon { font-size: 40rpx; }
  &__body { flex: 1; }
  &__title {
    display: block;
    color: #d4a017;
    font-size: 26rpx;
    font-weight: 700;
    margin-bottom: 4rpx;
  }
  &__desc {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
  }
}

.nsv-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
  &__primary {
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
    &--disabled { opacity: 0.6; }
  }
  &__secondary {
    height: 80rpx;
    border-radius: 40rpx;
    background: transparent;
    color: #c9a87c;
    font-size: 26rpx;
    border: 1rpx solid rgba(201, 168, 124, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    &:active { transform: scale(0.98); opacity: 0.85; }
  }
}

.nsv-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(15, 20, 16, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  animation: nsv-mask-in 0.25s ease-out;
}
.nsv-modal {
  width: 100%;
  max-width: 600rpx;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border: 2rpx solid #c9a87c;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 32rpx;
  animation: nsv-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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

@keyframes nsv-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes nsv-modal-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
