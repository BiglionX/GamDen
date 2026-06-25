<template>
  <view class="agent-chat-page">
    <!-- 顶部导航 -->
    <view class="chat-header">
      <view class="header-left" @click="goBack">
        <text class="icon-back">
          &#8592;
        </text>
      </view>
      <view class="header-title">
        <text class="guardian-name">
          {{ guardianName }} · {{ isDegraded ? '低功耗模式' : '智能模式' }}
        </text>
      </view>
      <view class="header-right" @click="openMenu">
        <text class="icon-menu">
          &#8942;
        </text>
      </view>
    </view>

    <!-- 能量状态条 -->
    <view class="energy-bar" @click="goTopup">
      <view class="energy-info">
        <text class="energy-icon">
          {{ getEnergyIcon() }}
        </text>
        <text class="energy-text">
          {{ energyPercentage }}%
        </text>
      </view>
      <view class="energy-progress">
        <view 
          class="energy-progress-fill" 
          :style="{ width: energyPercentage + '%', backgroundColor: getEnergyColor() }"
        ></view>
      </view>
      <text v-if="isDegraded" class="energy-tip">
        点击补充灵力
      </text>
    </view>

    <!-- 消息列表 -->
    <scroll-view 
      class="message-list" 
      scroll-y 
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
    >
      <!-- 欢迎消息 -->
      <view v-if="messages.length === 0" class="message-item agent-message">
        <view class="avatar agent-avatar">
          <AgentAvatar :type="guardianType" size="sm" />
        </view>
        <view class="message-bubble agent-bubble">
          <text class="message-text">
            今天想聊什么？最近有玩到什么好游戏吗？
          </text>
        </view>
      </view>

      <!-- 对话消息 -->
      <view 
        v-for="(msg, index) in messages" 
        :id="'msg-' + index"
        :key="index"
        :class="['message-item', msg.role === 'user' ? 'user-message' : 'agent-message']"
      >
        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="message-bubble user-bubble">
          <text class="message-text">
            {{ msg.content }}
          </text>
        </view>
        <view v-if="msg.role === 'user'" class="avatar user-avatar">
          <text class="avatar-text">
            我
          </text>
        </view>

        <!-- 守护灵消息 -->
        <view v-if="msg.role === 'agent'" class="avatar agent-avatar">
          <AgentAvatar :type="guardianType" size="sm" />
        </view>
        <view v-if="msg.role === 'agent'" class="message-bubble agent-bubble">
          <text class="message-text">
            {{ msg.content }}
          </text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="message-item agent-message loading">
        <view class="avatar agent-avatar">
          <AgentAvatar :type="guardianType" size="sm" />
        </view>
        <view class="message-bubble agent-bubble loading-bubble">
          <text class="loading-dots">
            ...
          </text>
        </view>
      </view>

      <!-- 低能量提示 -->
      <view v-if="showLowEnergyTip" class="low-energy-tip">
        <text class="tip-text">
          {{ lowEnergyMessage }}
        </text>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area" :class="{ degraded: isDegraded }">
      <!-- Token 消耗提示 -->
      <view v-if="lastTokensUsed > 0" class="token-hint">
        <text class="hint-text">
          本次消耗 {{ lastTokensUsed }} Token
        </text>
      </view>

      <view class="input-wrapper">
        <input 
          v-model="inputMessage" 
          type="text" 
          placeholder="输入消息..."
          class="message-input"
          :disabled="isDegraded"
          @confirm="sendMessage"
        />
        <button 
          class="send-btn" 
          :disabled="!inputMessage.trim() || loading || isDegraded"
          @click="sendMessage"
        >
          <text class="send-icon">
            &#10148;
          </text>
        </button>
      </view>

      <!-- 降智模式提示 -->
      <view v-if="isDegraded" class="degraded-tip">
        <text class="degraded-text">
          灵力已耗尽，守护灵正在休息中
        </text>
        <button class="topup-btn" @click="goTopup">
          补充灵力
        </button>
      </view>
    </view>

    <!-- 菜单弹窗 -->
    <uni-popup ref="menuPopup" type="bottom">
      <view class="menu-popup">
        <view class="menu-item" @click="goMemories">
          <text class="menu-icon">
            📖
          </text>
          <text class="menu-text">
            查看记忆
          </text>
        </view>
        <view class="menu-item" @click="goTopup">
          <text class="menu-icon">
            ⚡
          </text>
          <text class="menu-text">
            补充灵力
          </text>
        </view>
        <view class="menu-item danger" @click="clearHistory">
          <text class="menu-icon">
            🗑️
          </text>
          <text class="menu-text">
            清空对话
          </text>
        </view>
        <view class="menu-item" @click="closeMenu">
          <text class="menu-text">
            取消
          </text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import AgentAvatar from '@/components/agent/AgentAvatar.vue';
import { GUARDIAN_VISUALS, ENERGY_LEVEL_LABELS } from '@/types/agent';

const agentStore = useAgentStore();
const userStore = useUserStore();

// 页面状态
const inputMessage = ref('');
const messages = ref<{ role: string; content: string }[]>([]);
const loading = ref(false);
const scrollTop = ref(0);
const scrollIntoView = ref('');
const lastTokensUsed = ref(0);
const showLowEnergyTip = ref(false);
const lowEnergyMessage = ref('');
const menuPopup = ref<any>(null);

// 守护灵信息
const guardianType = computed(() => userStore.profile?.guardianType || 'mechanical');
const guardianName = computed(() => GUARDIAN_VISUALS[guardianType.value]?.name || '守护灵');

// 能量状态
const energyStatus = computed(() => agentStore.energyStatus);
const energyPercentage = computed(() => {
  if (!energyStatus.value) return 100;
  return Math.round(energyStatus.value.percentage * 100);
});
const isDegraded = computed(() => agentStore.isDegraded);

// 获取能量图标
const getEnergyIcon = () => {
  const level = energyStatus.value?.level || 'abundant';
  const icons: Record<string, string> = {
    abundant: '🟢',
    low: '🟡',
    depleted: '🔴'
  };
  return icons[level] || '🟢';
};

// 获取能量颜色
const getEnergyColor = () => {
  const level = energyStatus.value?.level || 'abundant';
  const colors: Record<string, string> = {
    abundant: '#52c41a',
    low: '#faad14',
    depleted: '#f5222d'
  };
  return colors[level] || '#52c41a';
};

// 初始化
onMounted(async () => {
  // 获取能量状态
  await agentStore.fetchEnergyStatus();
  // 获取对话历史
  await agentStore.fetchChatHistory();
  // 同步消息
  messages.value = [...agentStore.chatHistory];
  // 滚动到底部
  setTimeout(() => {
    scrollToBottom();
  }, 100);
});

// 发送消息
const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text || loading.value) return;

  inputMessage.value = '';
  loading.value = true;

  try {
    const result = await agentStore.sendChatMessage(text);
    if (result) {
      // 更新消息
      messages.value = [...agentStore.chatHistory];
      lastTokensUsed.value = result.tokensUsed;

      // 如果是降智模式，显示提示
      if (result.isDegraded) {
        showLowEnergyTip.value = true;
        lowEnergyMessage.value = result.degradedReason || '守护灵需要休息了';
        setTimeout(() => {
          showLowEnergyTip.value = false;
        }, 3000);
      }

      // 滚动到底部
      scrollToBottom();
    }
  } finally {
    loading.value = false;
  }
};

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    scrollIntoView.value = 'msg-' + (messages.value.length - 1);
    scrollTop.value = scrollTop.value + 100;
  }, 100);
};

// 返回
const goBack = () => {
  uni.navigateBack();
};

// 跳转充值页面
const goTopup = () => {
  uni.navigateTo({ url: '/pages/agent/topup' });
};

// 跳转记忆页面
const goMemories = () => {
  closeMenu();
  uni.navigateTo({ url: '/pages/agent/memories' });
};

// 打开菜单
const openMenu = () => {
  menuPopup.value?.open();
};

// 关闭菜单
const closeMenu = () => {
  menuPopup.value?.close();
};

// 清空对话
const clearHistory = async () => {
  closeMenu();
  uni.showModal({
    title: '清空对话',
    content: '确定要清空所有对话记录吗？',
    success: async (res) => {
      if (res.confirm) {
        const success = await agentStore.clearChatHistory();
        if (success) {
          messages.value = [];
          uni.showToast({ title: '已清空', icon: 'success' });
        }
      }
    }
  });
};
</script>

<style scoped lang="scss">
.agent-chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1a2e;
}

/* 顶部导航 */
.chat-header {
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

.icon-back,
.icon-menu {
  font-size: 40rpx;
  color: #ffd700;
}

.header-title {
  flex: 1;
  text-align: center;
}

.guardian-name {
  font-size: 32rpx;
  color: #ffd700;
  font-weight: bold;
}

/* 能量状态条 */
.energy-bar {
  padding: 20rpx 30rpx;
  background-color: #16213e;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.energy-info {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.energy-icon {
  font-size: 24rpx;
  margin-right: 10rpx;
}

.energy-text {
  font-size: 24rpx;
  color: #888;
}

.energy-progress {
  height: 8rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4rpx;
  overflow: hidden;
}

.energy-progress-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.energy-tip {
  font-size: 22rpx;
  color: #f5222d;
  margin-top: 10rpx;
}

/* 消息列表 */
.message-list {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.message-item {
  display: flex;
  margin-bottom: 30rpx;
  align-items: flex-end;
}

.user-message {
  flex-direction: row-reverse;
}

.agent-message {
  flex-direction: row;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 215, 0, 0.2);
}

.user-avatar {
  background-color: rgba(82, 196, 26, 0.2);
}

.avatar-text {
  font-size: 28rpx;
  color: #52c41a;
  font-weight: bold;
}

.message-bubble {
  max-width: 70%;
  padding: 24rpx 30rpx;
  border-radius: 20rpx;
  margin: 0 20rpx;
}

.user-bubble {
  background-color: #52c41a;
  border-bottom-right-radius: 8rpx;
}

.agent-bubble {
  background-color: #2a2a4e;
  border-bottom-left-radius: 8rpx;
}

.message-text {
  font-size: 28rpx;
  color: #fff;
  line-height: 1.5;
  word-break: break-all;
}

.loading-bubble {
  min-width: 100rpx;
}

.loading-dots {
  font-size: 32rpx;
  color: #888;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.low-energy-tip {
  text-align: center;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #faad14;
  font-style: italic;
}

/* 输入区域 */
.input-area {
  padding: 20rpx 30rpx;
  background-color: #16213e;
  border-top: 1px solid rgba(255, 215, 0, 0.1);
}

.input-area.degraded {
  opacity: 0.7;
}

.token-hint {
  text-align: center;
  margin-bottom: 10rpx;
}

.hint-text {
  font-size: 22rpx;
  color: #888;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 40rpx;
  padding: 10rpx 20rpx;
}

.message-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
  color: #fff;
  background: transparent;
  border: none;
  padding: 0 20rpx;
}

.message-input::placeholder {
  color: #666;
}

.send-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
}

.send-btn[disabled] {
  background-color: #555;
}

.send-icon {
  font-size: 32rpx;
  color: #1a1a2e;
}

.degraded-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: rgba(245, 34, 45, 0.1);
  border-radius: 12rpx;
}

.degraded-text {
  font-size: 24rpx;
  color: #f5222d;
}

.topup-btn {
  font-size: 24rpx;
  color: #ffd700;
  background: none;
  border: 1px solid #ffd700;
  border-radius: 20rpx;
  padding: 10rpx 30rpx;
}

/* 菜单弹窗 */
.menu-popup {
  background-color: #2a2a4e;
  border-radius: 20rpx 20rpx 0 0;
  padding: 30rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-item:last-child {
  border-bottom: none;
  justify-content: center;
}

.menu-item.danger {
  color: #f5222d;
}

.menu-icon {
  font-size: 32rpx;
  margin-right: 20rpx;
}

.menu-text {
  font-size: 28rpx;
  color: #fff;
}
</style>
