<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

interface Item {
  id: string;
  name: string;
  icon: string;
  price: number;
  currency: 'coin' | 'gem';
  stock: number;
  category: 'avatar' | 'deco' | 'boost';
  description: string;
}

const userStore = useUserStore();
const category = ref<'all' | 'avatar' | 'deco' | 'boost'>('all');
const coinBalance = ref(2580);

const items = ref<Item[]>([
  { id: 'i1', name: '古风卷轴头像框', icon: '🎴', price: 500, currency: 'coin', stock: 999, category: 'avatar', description: '为头像添加古风卷轴外框' },
  { id: 'i2', name: '樱花树装饰', icon: '🌸', price: 1200, currency: 'coin', stock: 50, category: 'deco', description: '在领地放置樱花树，邻居可见' },
  { id: 'i3', name: '经验加速券(24h)', icon: '⚡', price: 800, currency: 'coin', stock: 100, category: 'boost', description: '24 小时内签到经验双倍' },
  { id: 'i4', name: '金翎守护徽章', icon: '🛡️', price: 2000, currency: 'coin', stock: 30, category: 'avatar', description: '稀有徽章，展示资深玩家身份' },
  { id: 'i5', name: '竹亭装饰', icon: '🎋', price: 1500, currency: 'coin', stock: 20, category: 'deco', description: '在领地放置小型竹亭' },
]);

const filteredItems = ref<Item[]>(items.value);

function filterCategory(c: 'all' | 'avatar' | 'deco' | 'boost') {
  category.value = c;
  filteredItems.value = c === 'all' ? items.value : items.value.filter((i) => i.category === c);
}

function handleExchange(item: Item) {
  if (userStore.isGuest) {
    uni.showModal({
      title: '提示',
      content: '兑换功能需要先入驻巢穴',
      confirmText: '去入驻',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/auth/login' });
      },
    });
    return;
  }
  if (coinBalance.value < item.price) {
    uni.showToast({ title: '金币不足', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '确认兑换',
    content: `使用 ${item.price} 金币兑换【${item.name}】？`,
    success: (res) => {
      if (res.confirm) {
        coinBalance.value -= item.price;
        uni.showToast({ title: '兑换成功', icon: 'success' });
      }
    },
  });
}
</script>

<template>
  <view class="page-market">
    <view class="balance-card">
      <view class="balance-card__row">
        <text class="balance-card__label">我的金币</text>
        <text class="balance-card__value">🪙 {{ coinBalance }}</text>
      </view>
      <text class="balance-card__hint">通过签到、发帖、邀请好友获取金币</text>
    </view>

    <view class="category-tabs">
      <view
        v-for="c in [
          { key: 'all', label: '全部' },
          { key: 'avatar', label: '头像框' },
          { key: 'deco', label: '装饰' },
          { key: 'boost', label: '加速' },
        ]"
        :key="c.key"
        class="category-tabs__item"
        :class="{ 'category-tabs__item--active': category === c.key }"
        @tap="filterCategory(c.key as typeof category)"
      >
        {{ c.label }}
      </view>
    </view>

    <view class="item-grid">
      <view v-for="item in filteredItems" :key="item.id" class="item-card">
        <text class="item-card__icon">{{ item.icon }}</text>
        <text class="item-card__name">{{ item.name }}</text>
        <text class="item-card__desc">{{ item.description }}</text>
        <view class="item-card__footer">
          <text class="item-card__price">🪙 {{ item.price }}</text>
          <u-button type="primary" size="mini" text="兑换" @tap="handleExchange(item)" />
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-market {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 24rpx 32rpx;
}

.balance-card {
  background: linear-gradient(135deg, $u-primary-dark 0%, $u-bg-color-light 100%);
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  &__row { display: flex; align-items: center; justify-content: space-between; }
  &__label { font-size: 26rpx; color: $u-content-color; }
  &__value { font-size: 40rpx; font-weight: 600; color: $u-primary; }
  &__hint { font-size: 22rpx; color: $u-tips-color; margin-top: 8rpx; display: block; }
}

.category-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
  &__item {
    padding: 12rpx 32rpx;
    border-radius: 32rpx;
    background: $u-bg-color-light;
    border: 1rpx solid $u-border-color;
    color: $u-tips-color;
    font-size: 26rpx;
    &--active {
      background: $u-primary;
      color: $u-bg-color;
      border-color: $u-primary;
      font-weight: 600;
    }
  }
}

.item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.item-card {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  &__icon { font-size: 80rpx; margin-bottom: 16rpx; }
  &__name { font-size: 28rpx; color: $u-main-color; font-weight: 500; margin-bottom: 8rpx; }
  &__desc {
    font-size: 22rpx;
    color: $u-tips-color;
    text-align: center;
    margin-bottom: 24rpx;
    min-height: 60rpx;
  }
  &__footer { display: flex; align-items: center; justify-content: space-between; width: 100%; }
  &__price { font-size: 28rpx; color: $u-primary; font-weight: 600; }
}
</style>
