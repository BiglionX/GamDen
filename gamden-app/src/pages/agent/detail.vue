<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAgentStore } from '@/stores/agent';
import { storeToRefs } from 'pinia';
import {
  GUARDIAN_VISUALS,
  AGENT_LEVEL_THRESHOLDS,
  AGENT_BOND_THRESHOLDS,
  EXP_ACTION_NAMES,
  EGGS_CONFIG,
  PERSONality_TAG_CONFIG,
  type ExpType,
} from '@/types/agent';
import { track, TrackEvent } from '@/utils/track';

const userStore = useUserStore();
const agentStore = useAgentStore();

const { agentState, dailyProgress, agentStateLoading, showUpgradeEffect, upgradeEffectData } =
  storeToRefs(agentStore);

const refreshing = ref(false);
const dialogueText = ref('');
const showUpgradeModal = ref(false);

// 守护灵视觉配置
const guardianVisual = computed(() => {
  const type = userStore.profile?.guardianType ?? 'mechanical';
  return GUARDIAN_VISUALS[type];
});

// 经验值进度百分比
const expProgress = computed(() => {
  if (!agentState.value) return 0;
  const level = agentState.value.agentLevel;
  const current = agentState.value.exp;
  const threshold = AGENT_LEVEL_THRESHOLDS[level] ?? 0;
  const nextThreshold = AGENT_LEVEL_THRESHOLDS[level + 1] ?? threshold;
  if (nextThreshold === threshold) return 100;
  return Math.round(((current - threshold) / (nextThreshold - threshold)) * 100);
});

// 亲密度进度百分比
const bondProgress = computed(() => {
  if (!agentState.value) return 0;
  const level = agentState.value.bondLevel;
  const current = agentState.value.bondPoints;
  const threshold = AGENT_BOND_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = AGENT_BOND_THRESHOLDS[level] ?? threshold;
  if (nextThreshold === threshold) return 100;
  return Math.min(100, Math.round(((current - threshold) / (nextThreshold - threshold)) * 100));
});

// 下一级解锁提示
const nextLevelUnlock = computed(() => {
  if (!agentState.value) return '';
  const level = agentState.value.agentLevel;
  const unlocks: Record<number, string> = {
    2: '解锁更多互动话题',
    3: '解锁性格演化系统',
    4: '解锁彩蛋系统',
    5: '解锁深度对话',
    6: '解锁记忆功能',
    7: '解锁外观自定义',
    8: '解锁主动关心行为',
    9: '解锁组队功能预览',
    10: '达成最终形态',
  };
  return unlocks[level + 1] ?? '';
});

// 已解锁彩蛋列表
const unlockedEggsList = computed(() => {
  if (!agentState.value) return [];
  return EGGS_CONFIG.filter((egg) => agentState.value!.unlockedEggs.includes(egg.id));
});

// 性格标签显示
const personalityTagsDisplay = computed(() => {
  if (!agentState.value || agentState.value.personalityTags.length === 0) {
    return '性格养成中...';
  }
  const tagConfig = PERSONality_TAG_CONFIG as Record<string, string>;
  return agentState.value.personalityTags
    .map((tag) => tagConfig[tag] ?? tag)
    .join(' · ');
});

onMounted(async () => {
  if (userStore.isGuest) return;

  // 埋点
  track(TrackEvent.AgentDetailViewed);

  // 加载守护灵状态
  await agentStore.fetchAgentState();
  await agentStore.fetchDailyProgress();

  // 检查是否有升级特效需要显示
  if (upgradeEffectData.value) {
    showUpgradeModal.value = true;
  }
});

// 刷新数据
async function handleRefresh() {
  refreshing.value = true;
  try {
    await agentStore.fetchAgentState();
    await agentStore.fetchDailyProgress();
  } finally {
    refreshing.value = false;
  }
}

// 发送对话
async function handleSendDialogue() {
  if (!dialogueText.value.trim()) return;
  const text = dialogueText.value.trim();
  dialogueText.value = '';

  // 调用后端对话接口
  try {
    await uni.request({
      url: '/api/agent/dialogue',
      method: 'POST',
      data: { message: text },
    });
    track(TrackEvent.AgentDialogueInit, { message_length: text.length });
  } catch (e) {
    console.error('[AgentDetail] dialogue error:', e);
  }
}

// 关闭升级特效弹窗
function handleCloseUpgradeEffect() {
  showUpgradeModal.value = false;
  agentStore.hideUpgradeEffect();
}

// 返回上一页
function handleBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="agent-detail">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="icon-back">
          ←
        </text>
      </view>
      <text class="nav-title">
        我的守护灵
      </text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 守护灵信息卡片 -->
    <view class="guardian-card">
      <view class="guardian-avatar" :style="{ background: guardianVisual.bgColor }">
        <text class="avatar-icon">
          {{ guardianVisual.icon }}
        </text>
      </view>

      <view class="guardian-info">
        <text class="guardian-name">
          {{ guardianVisual.name }}
        </text>
        <text class="guardian-level">
          Lv.{{ agentState?.agentLevel ?? 1 }}
        </text>
        <text class="guardian-type">
          · {{ guardianVisual.name }}
        </text>
      </view>

      <!-- Bond进度 -->
      <view class="bond-section">
        <text class="bond-label">
          Bond {{ agentState?.bondLevel ?? 1 }}/5
        </text>
        <view class="bond-bar">
          <view class="bond-progress" :style="{ width: bondProgress + '%' }"></view>
        </view>
      </view>

      <!-- 性格标签 -->
      <view class="personality-tags">
        <text class="tags-text">
          {{ personalityTagsDisplay }}
        </text>
      </view>

      <!-- 下一级解锁 -->
      <view v-if="nextLevelUnlock" class="next-unlock">
        <text class="unlock-label">
          下一级解锁：
        </text>
        <text class="unlock-text">
          {{ nextLevelUnlock }}
        </text>
      </view>
    </view>

    <!-- 成长数据 -->
    <view class="section">
      <text class="section-title">
        成长数据
      </text>

      <view class="exp-card">
        <view class="exp-header">
          <text class="exp-label">
            当前经验值
          </text>
          <text class="exp-value">
            {{ agentState?.exp ?? 0 }} / {{ AGENT_LEVEL_THRESHOLDS[agentState?.agentLevel ?? 1] ?? 0 }}
          </text>
        </view>
        <view class="exp-bar">
          <view class="exp-progress" :style="{ width: expProgress + '%' }"></view>
        </view>
        <text class="exp-percent">
          {{ expProgress }}%
        </text>
      </view>
    </view>

    <!-- 今日进度 -->
    <view class="section">
      <text class="section-title">
        今日已获EXP
      </text>

      <view class="daily-progress">
        <view class="progress-item">
          <text class="progress-label">
            签到
          </text>
          <text class="progress-value" :class="{ completed: dailyProgress?.signInCount }">
            +{{ dailyProgress?.signInCount ?? 0 }}
          </text>
        </view>
        <view class="progress-item">
          <text class="progress-label">
            发帖
          </text>
          <text class="progress-value" :class="{ completed: dailyProgress?.postCount }">
            +{{ (dailyProgress?.postCount ?? 0) * 5 }}
          </text>
        </view>
        <view class="progress-item">
          <text class="progress-label">
            点赞
          </text>
          <text class="progress-value" :class="{ completed: dailyProgress?.likeCount }">
            +{{ (dailyProgress?.likeCount ?? 0) * 2 }}
          </text>
        </view>
        <view class="progress-item">
          <text class="progress-label">
            邀请
          </text>
          <text class="progress-value" :class="{ completed: dailyProgress?.inviteCount }">
            +{{ (dailyProgress?.inviteCount ?? 0) * 50 }}
          </text>
        </view>
      </view>

      <view class="daily-summary">
        <text class="summary-label">
          今日已获
        </text>
        <text class="summary-value">
          {{ dailyProgress?.expGained ?? 0 }} EXP
        </text>
        <text class="summary-label">
          / 100 上限
        </text>
      </view>
    </view>

    <!-- 已解锁彩蛋 -->
    <view class="section">
      <text class="section-title">
        已解锁彩蛋
      </text>

      <view class="eggs-grid">
        <view
          v-for="egg in unlockedEggsList"
          :key="egg.id"
          class="egg-item unlocked"
        >
          <text class="egg-name">
            {{ egg.name }}
          </text>
          <text class="egg-desc">
            {{ egg.desc }}
          </text>
        </view>

        <view v-if="unlockedEggsList.length === 0" class="eggs-empty">
          <text class="empty-text">
            Lv.4 后解锁彩蛋系统
          </text>
        </view>
      </view>
    </view>

    <!-- 与守护灵对话 -->
    <view class="section dialogue-section">
      <text class="section-title">
        与{{ guardianVisual.name }}对话
      </text>

      <view class="dialogue-input">
        <input
          v-model="dialogueText"
          class="input-field"
          placeholder="说点什么..."
          @confirm="handleSendDialogue"
        />
        <button class="send-btn" @tap="handleSendDialogue">
          发送
        </button>
      </view>
    </view>

    <!-- 升级特效弹窗 -->
    <view v-if="showUpgradeModal && upgradeEffectData" class="upgrade-modal">
      <view class="upgrade-content">
        <text class="upgrade-level">
          Lv.{{ upgradeEffectData.newLevel }}
        </text>
        <text class="upgrade-text">
          {{ upgradeEffectData.text }}
        </text>
        <button class="upgrade-close" @tap="handleCloseUpgradeEffect">
          确定
        </button>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="agentStateLoading" class="loading-overlay">
      <text class="loading-text">
        加载中...
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.agent-detail {
  min-height: 100vh;
  background: #1e241f;
  padding-bottom: 40rpx;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #1e241f;
}

.nav-back,
.nav-placeholder {
  width: 80rpx;
}

.icon-back {
  font-size: 40rpx;
  color: #c9a87c;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.guardian-card {
  margin: 24rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #2a3530 0%, #1e241f 100%);
  border-radius: 24rpx;
  border: 1px solid rgba(201, 168, 124, 0.2);
}

.guardian-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}

.avatar-icon {
  font-size: 64rpx;
}

.guardian-info {
  text-align: center;
  margin-bottom: 24rpx;
}

.guardian-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}

.guardian-level {
  font-size: 32rpx;
  font-weight: 600;
  color: #c9a87c;
  margin-left: 8rpx;
}

.guardian-type {
  font-size: 28rpx;
  color: #a89e85;
  margin-left: 8rpx;
}

.bond-section {
  margin-bottom: 24rpx;
}

.bond-label {
  font-size: 24rpx;
  color: #a89e85;
  margin-bottom: 8rpx;
  display: block;
}

.bond-bar {
  height: 12rpx;
  background: rgba(201, 168, 124, 0.2);
  border-radius: 6rpx;
  overflow: hidden;
}

.bond-progress {
  height: 100%;
  background: linear-gradient(90deg, #c9a87c 0%, #e8d4b8 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.personality-tags {
  text-align: center;
  margin-bottom: 16rpx;
}

.tags-text {
  font-size: 26rpx;
  color: #a89e85;
}

.next-unlock {
  text-align: center;
  padding-top: 16rpx;
  border-top: 1px solid rgba(201, 168, 124, 0.1);
}

.unlock-label {
  font-size: 24rpx;
  color: #a89e85;
}

.unlock-text {
  font-size: 24rpx;
  color: #c9a87c;
}

.section {
  margin: 24rpx;
  padding: 24rpx;
  background: rgba(42, 53, 48, 0.5);
  border-radius: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 20rpx;
  display: block;
}

.exp-card {
  background: rgba(30, 36, 31, 0.8);
  border-radius: 12rpx;
  padding: 20rpx;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.exp-label {
  font-size: 24rpx;
  color: #a89e85;
}

.exp-value {
  font-size: 24rpx;
  color: #c9a87c;
}

.exp-bar {
  height: 16rpx;
  background: rgba(201, 168, 124, 0.2);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.exp-progress {
  height: 100%;
  background: linear-gradient(90deg, #c9a87c 0%, #e8d4b8 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.exp-percent {
  font-size: 22rpx;
  color: #a89e85;
  text-align: right;
  display: block;
}

.daily-progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.progress-item {
  text-align: center;
  padding: 16rpx;
  background: rgba(30, 36, 31, 0.8);
  border-radius: 8rpx;
}

.progress-label {
  font-size: 22rpx;
  color: #a89e85;
  display: block;
  margin-bottom: 8rpx;
}

.progress-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
}

.progress-value.completed {
  color: #5a8f6c;
}

.daily-summary {
  text-align: center;
  padding: 16rpx;
  background: rgba(201, 168, 124, 0.1);
  border-radius: 8rpx;
}

.summary-label {
  font-size: 24rpx;
  color: #a89e85;
}

.summary-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #c9a87c;
  margin: 0 8rpx;
}

.eggs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.egg-item {
  padding: 20rpx;
  background: rgba(30, 36, 31, 0.8);
  border-radius: 12rpx;
}

.egg-item.unlocked {
  background: rgba(90, 143, 108, 0.2);
  border: 1px solid rgba(90, 143, 108, 0.3);
}

.egg-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.egg-desc {
  font-size: 22rpx;
  color: #a89e85;
}

.eggs-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #666;
}

.dialogue-section {
  margin-bottom: 120rpx;
}

.dialogue-input {
  display: flex;
  gap: 16rpx;
}

.input-field {
  flex: 1;
  height: 80rpx;
  padding: 0 24rpx;
  background: rgba(30, 36, 31, 0.8);
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #fff;
}

.input-field::placeholder {
  color: #666;
}

.send-btn {
  width: 140rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #c9a87c 0%, #a88a5c 100%);
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1e241f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upgrade-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.upgrade-content {
  width: 600rpx;
  padding: 48rpx;
  background: linear-gradient(135deg, #2a3530 0%, #1e241f 100%);
  border-radius: 24rpx;
  border: 2px solid #c9a87c;
  text-align: center;
}

.upgrade-level {
  font-size: 64rpx;
  font-weight: 700;
  color: #c9a87c;
  display: block;
  margin-bottom: 24rpx;
}

.upgrade-text {
  font-size: 28rpx;
  color: #fff;
  line-height: 1.6;
  display: block;
  margin-bottom: 32rpx;
}

.upgrade-close {
  width: 200rpx;
  height: 72rpx;
  background: linear-gradient(135deg, #c9a87c 0%, #a88a5c 100%);
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1e241f;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: #fff;
}
</style>
