<template>
  <view class="topup-page">
    <!-- 顶部导航 -->
    <view class="page-header">
      <view class="header-left" @click="goBack">
        <text class="icon-back">
          &#8592;
        </text>
      </view>
      <view class="header-title">
        <text class="title-text">
          灵力补给站
        </text>
      </view>
      <view class="header-right">
        <!-- 占位 -->
      </view>
    </view>

    <!-- 当前能量状态 -->
    <view class="current-status">
      <view class="status-card">
        <view class="status-header">
          <text class="guardian-avatar">
            {{ guardianIcon }}
          </text>
          <view class="status-info">
            <text class="guardian-name">
              {{ guardianName }}
            </text>
            <text class="status-label">
              今日灵力状态
            </text>
          </view>
        </view>
        
        <view class="energy-display">
          <view class="energy-bar">
            <view 
              class="energy-fill" 
              :style="{ width: energyPercentage + '%' }"
            ></view>
          </view>
          <view class="energy-text">
            <text class="energy-used">
              {{ (energyStatus?.dailyUsed || 0).toLocaleString() }}
            </text>
            <text class="energy-separator">
              /
            </text>
            <text class="energy-total">
              {{ (energyStatus?.dailyFree || 100000).toLocaleString() }} Token
            </text>
          </view>
        </view>

        <!-- 充值余额 -->
        <view v-if="energyStatus?.purchasedBalance" class="balance-info">
          <text class="balance-label">
            充值余额：
          </text>
          <text class="balance-value">
            {{ energyStatus.purchasedBalance.toLocaleString() }} Token
          </text>
        </view>
      </view>
    </view>

    <!-- 选择套餐 -->
    <view class="packages-section">
      <text class="section-title">
        选择灵力套餐
      </text>
      
      <view class="packages-list">
        <view 
          v-for="pkg in packages" 
          :key="pkg.id"
          class="package-item"
          :class="{ selected: selectedPackage === pkg.id, recommended: pkg.recommended }"
          @click="selectPackage(pkg.id)"
        >
          <!-- 推荐标签 -->
          <view v-if="pkg.recommended" class="recommended-tag">
            推荐
          </view>
          
          <view class="package-icon">
            {{ pkg.icon }}
          </view>
          <view class="package-info">
            <text class="package-name">
              {{ pkg.name }}
            </text>
            <text class="package-desc">
              {{ pkg.description }}
            </text>
            <text class="package-tokens">
              +{{ (pkg.tokens / 10000).toFixed(0) }}万 Token
            </text>
          </view>
          <view class="package-price">
            <text class="price-symbol">
              ¥
            </text>
            <text class="price-value">
              {{ pkg.price }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 购买按钮 -->
    <view class="action-section">
      <view class="tip-text">
        <text>充值后立即到账，可用于智能对话</text>
      </view>
      <button 
        class="purchase-btn" 
        :disabled="!selectedPackage || loading"
        @click="handlePurchase"
      >
        <text v-if="loading">
          处理中...
        </text>
        <text v-else-if="selectedPackage">
          立即购买 ¥{{ getSelectedPrice() }}
        </text>
        <text v-else>
          请选择套餐
        </text>
      </button>
    </view>

    <!-- 购买记录 -->
    <view v-if="purchaseHistory.length > 0" class="history-section">
      <text class="section-title">
        购买记录
      </text>
      <view class="history-list">
        <view 
          v-for="record in purchaseHistory.slice(0, 3)" 
          :key="record.id"
          class="history-item"
        >
          <view class="history-icon">
            {{ record.packageIcon || '🧪' }}
          </view>
          <view class="history-info">
            <text class="history-name">
              {{ record.packageName }}
            </text>
            <text class="history-date">
              {{ formatDate(record.created_at) }}
            </text>
          </view>
          <view class="history-amount">
            <text class="amount-value">
              +{{ (record.amount / 10000).toFixed(0) }}万
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提示 -->
    <view class="notice-section">
      <text class="notice-title">
        温馨提示
      </text>
      <view class="notice-item">
        <text class="notice-bullet">
          •
        </text>
        <text class="notice-text">
          充值Token立即到账，支持微信支付
        </text>
      </view>
      <view class="notice-item">
        <text class="notice-bullet">
          •
        </text>
        <text class="notice-text">
          充值Token永久有效，不清零
        </text>
      </view>
      <view class="notice-item">
        <text class="notice-bullet">
          •
        </text>
        <text class="notice-text">
          每日免费额度零点重置
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { TOKEN_PACKAGES, GUARDIAN_VISUALS } from '@/types/agent';

const agentStore = useAgentStore();
const userStore = useUserStore();

// 页面状态
const selectedPackage = ref<string | null>(null);
const loading = ref(false);
const purchaseHistory = ref<any[]>([]);

// 套餐列表
const packages = TOKEN_PACKAGES;

// 守护灵信息
const guardianType = computed(() => userStore.profile?.guardianType || 'mechanical');
const guardianName = computed(() => GUARDIAN_VISUALS[guardianType.value]?.name || '守护灵');
const guardianIcon = computed(() => GUARDIAN_VISUALS[guardianType.value]?.icon || '🤖');

// 能量状态
const energyStatus = computed(() => agentStore.energyStatus);
const energyPercentage = computed(() => {
  if (!energyStatus.value) return 100;
  return Math.min(100, Math.round((energyStatus.value.remaining / energyStatus.value.dailyFree) * 100));
});

// 获取选中套餐价格
const getSelectedPrice = () => {
  if (!selectedPackage.value) return 0;
  const pkg = packages.find(p => p.id === selectedPackage.value);
  return pkg?.price || 0;
};

// 选择套餐
const selectPackage = (id: string) => {
  selectedPackage.value = id;
};

// 购买
const handlePurchase = async () => {
  if (!selectedPackage.value) return;

  loading.value = true;
  try {
    // 创建订单
    const res = await uni.request({
      url: '/api/agent/topup',
      method: 'POST',
      data: { packageId: selectedPackage.value }
    });

    if (res.statusCode === 200 && (res.data as any)?.data) {
      const orderId = (res.data as any).data.orderId;
      
      // 模拟支付（实际应该调起微信支付）
      const payRes = await uni.request({
        url: '/api/agent/topup/callback',
        method: 'POST',
        data: { orderId, simulate: true }
      });

      if (payRes.statusCode === 200) {
        const data = (payRes.data as any)?.data;
        
        uni.showModal({
          title: '充值成功',
          content: `${data.thankMessage || '灵力已补充！'}`,
          showCancel: false
        });

        // 刷新能量状态
        await agentStore.fetchEnergyStatus();
        
        // 刷新购买记录
        await fetchPurchaseHistory();
        
        // 清空选择
        selectedPackage.value = null;
      }
    }
  } catch (e) {
    console.error('Purchase error:', e);
    uni.showToast({ title: '充值失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

// 获取购买记录
const fetchPurchaseHistory = async () => {
  try {
    const res = await uni.request({
      url: '/api/agent/topup/history',
      method: 'GET'
    });
    
    if (res.statusCode === 200 && (res.data as any)?.data) {
      purchaseHistory.value = (res.data as any).data.history || [];
    }
  } catch (e) {
    console.error('Fetch history error:', e);
  }
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
};

// 初始化
onMounted(async () => {
  // 获取能量状态
  await agentStore.fetchEnergyStatus();
  // 获取购买记录
  await fetchPurchaseHistory();
});

// 返回
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped lang="scss">
.topup-page {
  min-height: 100vh;
  background-color: #1a1a2e;
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #16213e;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.header-left,
.header-right {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-back {
  font-size: 40rpx;
  color: #ffd700;
}

.header-title {
  flex: 1;
  text-align: center;
}

.title-text {
  font-size: 32rpx;
  color: #ffd700;
  font-weight: bold;
}

/* 当前状态 */
.current-status {
  padding: 30rpx;
}

.status-card {
  padding: 30rpx;
  background: linear-gradient(135deg, #2a2a4e 0%, #1a1a2e 100%);
  border-radius: 20rpx;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.status-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.guardian-avatar {
  font-size: 60rpx;
  margin-right: 20rpx;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.guardian-name {
  font-size: 32rpx;
  color: #ffd700;
  font-weight: bold;
}

.status-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

.energy-display {
  margin-bottom: 20rpx;
}

.energy-bar {
  height: 16rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.energy-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #73d13d);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.energy-text {
  text-align: center;
}

.energy-used {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.energy-separator {
  font-size: 28rpx;
  color: #888;
}

.energy-total {
  font-size: 28rpx;
  color: #888;
}

.balance-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  background-color: rgba(255, 215, 0, 0.1);
  border-radius: 12rpx;
}

.balance-label {
  font-size: 26rpx;
  color: #888;
}

.balance-value {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: bold;
}

/* 套餐区域 */
.packages-section {
  padding: 0 30rpx 30rpx;
}

.section-title {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.package-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 30rpx;
  background-color: #2a2a4e;
  border-radius: 16rpx;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.package-item.selected {
  border-color: #ffd700;
  background-color: rgba(255, 215, 0, 0.1);
}

.package-item.recommended {
  border-color: rgba(255, 215, 0, 0.3);
}

.recommended-tag {
  position: absolute;
  top: -12rpx;
  left: 30rpx;
  padding: 4rpx 16rpx;
  background-color: #ffd700;
  color: #1a1a2e;
  font-size: 20rpx;
  font-weight: bold;
  border-radius: 20rpx;
}

.package-icon {
  font-size: 60rpx;
  margin-right: 24rpx;
}

.package-info {
  flex: 1;
}

.package-name {
  font-size: 30rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 8rpx;
  display: block;
}

.package-desc {
  font-size: 24rpx;
  color: #888;
  margin-bottom: 8rpx;
  display: block;
}

.package-tokens {
  font-size: 28rpx;
  color: #52c41a;
  font-weight: bold;
}

.package-price {
  text-align: right;
}

.price-symbol {
  font-size: 24rpx;
  color: #ffd700;
}

.price-value {
  font-size: 48rpx;
  color: #ffd700;
  font-weight: bold;
}

/* 购买按钮 */
.action-section {
  padding: 0 30rpx 30rpx;
}

.tip-text {
  text-align: center;
  margin-bottom: 20rpx;
}

.tip-text text {
  font-size: 24rpx;
  color: #666;
}

.purchase-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #ffd700, #ffb700);
  border-radius: 50rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #1a1a2e;
  font-weight: bold;
}

.purchase-btn[disabled] {
  background: #555;
  color: #888;
}

/* 购买记录 */
.history-section {
  padding: 0 30rpx 30rpx;
}

.history-list {
  background-color: #2a2a4e;
  border-radius: 16rpx;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.history-item:last-child {
  border-bottom: none;
}

.history-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.history-info {
  flex: 1;
}

.history-name {
  font-size: 28rpx;
  color: #fff;
  display: block;
}

.history-date {
  font-size: 22rpx;
  color: #666;
  margin-top: 4rpx;
  display: block;
}

.history-amount {
  text-align: right;
}

.amount-value {
  font-size: 28rpx;
  color: #52c41a;
  font-weight: bold;
}

/* 提示 */
.notice-section {
  padding: 0 30rpx;
}

.notice-title {
  font-size: 26rpx;
  color: #888;
  margin-bottom: 16rpx;
  display: block;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.notice-bullet {
  font-size: 24rpx;
  color: #666;
  margin-right: 12rpx;
}

.notice-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}
</style>
