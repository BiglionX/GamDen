<script setup lang="ts">
/**
 * 俱乐部提议表单页
 */
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { clubApi } from '@/utils/club-api';

const proposalType = ref('other');
const name = ref('');
const description = ref('');
const gameName = ref('');
const selectedTags = ref<string[]>([]);

const PROPOSAL_TYPES = [
  { value: 'game', label: '游戏类', icon: '🎮' },
  { value: 'interest', label: '兴趣类', icon: '🎯' },
  { value: 'other', label: '其他', icon: '✨' },
];

const AVAILABLE_TAGS = [
  'PVP', '竞技', '休闲', '社交', '剧情', 'RPG',
  '建造', '技术', '收集', '策略', '二次元', '创作'
];

function onTypeChange(type: string) {
  proposalType.value = type;
}

function onTagToggle(tag: string) {
  const index = selectedTags.value.indexOf(tag);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else if (selectedTags.value.length < 3) {
    selectedTags.value.push(tag);
  } else {
    uni.showToast({ title: '最多选择3个标签', icon: 'none' });
  }
}

function goBack() {
  uni.navigateBack();
}

async function onSubmit() {
  // 验证
  if (!name.value.trim()) {
    uni.showToast({ title: '请输入俱乐部名称', icon: 'none' });
    return;
  }
  if (name.value.trim().length > 15) {
    uni.showToast({ title: '名称不能超过15字', icon: 'none' });
    return;
  }
  if (!description.value.trim()) {
    uni.showToast({ title: '请输入一句话简介', icon: 'none' });
    return;
  }
  if (description.value.trim().length > 50) {
    uni.showToast({ title: '简介不能超过50字', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '提交中...' });

  try {
    await clubApi.createProposal({
      name: name.value.trim(),
      description: description.value.trim(),
      proposal_type: proposalType.value,
      game_name: gameName.value.trim() || undefined,
      tags: selectedTags.value,
    });

    uni.hideLoading();
    uni.showToast({ title: '提议提交成功', icon: 'success' });

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="page-proposal">
    <!-- 标题 -->
    <view class="header">
      <view class="header__back" @tap="goBack">
        <text>‹</text>
      </view>
      <text class="header__title">提议新茶摊</text>
      <view class="header__placeholder"></view>
    </view>

    <!-- 俱乐部名称 -->
    <view class="form-item">
      <view class="form-item__label">
        <text class="form-item__icon">📌</text>
        <text>茶摊名称 *</text>
      </view>
      <input
        v-model="name"
        class="form-item__input"
        placeholder="例如：星穹铁道茶摊、种田养老院"
        maxlength="15"
      />
      <view class="form-item__hint">限15字</view>
    </view>

    <!-- 一句话简介 -->
    <view class="form-item">
      <view class="form-item__label">
        <text class="form-item__icon">📝</text>
        <text>一句话简介 *</text>
      </view>
      <textarea
        v-model="description"
        class="form-item__textarea"
        placeholder="用一句话介绍这个俱乐部"
        maxlength="50"
      />
      <view class="form-item__hint">{{ description.length }}/50</view>
    </view>

    <!-- 所属类型 -->
    <view class="form-item">
      <view class="form-item__label">
        <text class="form-item__icon">🏷️</text>
        <text>所属类型</text>
      </view>
      <view class="type-selector">
        <view
          v-for="type in PROPOSAL_TYPES"
          :key="type.value"
          class="type-selector__item"
          :class="{ 'type-selector__item--active': proposalType === type.value }"
          @tap="onTypeChange(type.value)"
        >
          <text class="type-selector__icon">{{ type.icon }}</text>
          <text>{{ type.label }}</text>
        </view>
      </view>
    </view>

    <!-- 关联游戏（选填） -->
    <view class="form-item" v-if="proposalType === 'game'">
      <view class="form-item__label">
        <text class="form-item__icon">🎮</text>
        <text>关联游戏</text>
      </view>
      <input
        v-model="gameName"
        class="form-item__input"
        placeholder="请输入游戏名称"
        maxlength="20"
      />
    </view>

    <!-- 兴趣标签（选填） -->
    <view class="form-item">
      <view class="form-item__label">
        <text class="form-item__icon">🏷️</text>
        <text>兴趣标签（选填，最多3个）</text>
      </view>
      <view class="tag-selector">
        <view
          v-for="tag in AVAILABLE_TAGS"
          :key="tag"
          class="tag-selector__item"
          :class="{
            'tag-selector__item--active': selectedTags.includes(tag),
            'tag-selector__item--disabled': selectedTags.length >= 3 && !selectedTags.includes(tag)
          }"
          @tap="onTagToggle(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- 提示 -->
    <view class="notice">
      <view class="notice__title">提交前须知</view>
      <view class="notice__item">• 请确认名称不含敏感词</view>
      <view class="notice__item">• 已有≥20人联署时会自动通过</view>
      <view class="notice__item">• 否则需运营审核（3个工作日内）</view>
      <view class="notice__item">• 提议通过后可获得金币+50奖励</view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-btn" @tap="onSubmit">
      <text>提交提议</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-proposal {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 0 32rpx 64rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;

  &__back,
  &__placeholder {
    width: 80rpx;
  }

  &__back {
    font-size: 48rpx;
    color: #C9A87C;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 600;
    color: #F5F0E6;
  }
}

.form-item {
  margin-bottom: 40rpx;

  &__label {
    display: flex;
    align-items: center;
    gap: 12rpx;
    font-size: 28rpx;
    color: #F5F0E6;
    margin-bottom: 16rpx;
  }

  &__icon {
    font-size: 28rpx;
  }

  &__input {
    background: rgba(201, 168, 124, 0.08);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
    color: #F5F0E6;
  }

  &__textarea {
    background: rgba(201, 168, 124, 0.08);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
    color: #F5F0E6;
    height: 160rpx;
    resize: none;
  }

  &__hint {
    font-size: 22rpx;
    color: $u-tips-color;
    text-align: right;
    margin-top: 8rpx;
  }
}

.type-selector {
  display: flex;
  gap: 24rpx;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx;
    background: rgba(201, 168, 124, 0.08);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #A89E85;
    transition: all 0.2s;

    &--active {
      background: rgba(201, 168, 124, 0.2);
      border-color: #C9A87C;
      color: #C9A87C;
    }
  }

  &__icon {
    font-size: 40rpx;
  }
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  &__item {
    padding: 12rpx 24rpx;
    background: rgba(201, 168, 124, 0.08);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 24rpx;
    font-size: 24rpx;
    color: #A89E85;

    &--active {
      background: rgba(201, 168, 124, 0.2);
      border-color: #C9A87C;
      color: #C9A87C;
    }

    &--disabled {
      opacity: 0.4;
    }
  }
}

.notice {
  background: rgba(201, 168, 124, 0.05);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 40rpx;

  &__title {
    font-size: 26rpx;
    font-weight: 600;
    color: #C9A87C;
    margin-bottom: 16rpx;
  }

  &__item {
    font-size: 24rpx;
    color: $u-tips-color;
    line-height: 1.8;
  }
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx;
  background: linear-gradient(135deg, #C9A87C, #A8895F);
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}
</style>
