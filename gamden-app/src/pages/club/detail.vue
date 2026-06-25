<script setup lang="ts">
/**
 * 俱乐部详情页（pages/club/detail）
 * ----------------------------------------------------------------------
 * 核心：复用 OpenIM 群聊能力（不修改核心源码），展示 GamDen 皮肤：
 *   - 顶部：俱乐部标题 + 活力值 + 成员数 + 发帖按钮 + 成员入口
 *   - 中部：消息列表（scroll-view）
 *     * 文本/表情气泡：ChatBubble（古风边框纹理）
 *     * 守护灵通知：GuardianBubble（特殊气泡 + 守护灵头像）
 *     * 入群欢迎：WelcomeBubble
 *   - 底部：MessageInputBar（文字 + 表情面板）
 *   - 右抽屉：ClubMemberList（按角色分组）
 *   - 活力值等级展示（青铜/白银/黄金/钻石）
 *   - 俱乐部详情弹窗
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useClubChatStore } from '@/stores/club-chat';
import { useUserStore } from '@/stores/user';
import type { ChatMessage, Club, ClubMember, GuardianNoticeBody, WelcomeMessageBody } from '@/types/club';
import type { EmojiMessageBody, TextMessageBody } from '@/types/club';
import { VITALITY_LEVEL_CONFIG, CLUB_TYPE_CONFIG, type ClubUpgrade } from '@/types/club';
import { clubApi } from '@/utils/club-api';

import ChatBubble from '@/components/club/ChatBubble.vue';
import GuardianBubble from '@/components/club/GuardianBubble.vue';
import WelcomeBubble from '@/components/club/WelcomeBubble.vue';
import ClubMemberList from '@/components/club/ClubMemberList.vue';
import MessageInputBar from '@/components/club/MessageInputBar.vue';

// =========================================================
// Stores
// =========================================================
const chatStore = useClubChatStore();
const userStore = useUserStore();

// =========================================================
// State
// =========================================================
const clubId = ref<string>('');
const clubIdNum = ref<number>(0);
const inputText = ref('');
const scrollTop = ref(0);
const scrollIntoView = ref('');

// 俱乐部扩展信息
const clubDetail = ref<ClubUpgrade | null>(null);
const clubDetailLoading = ref(false);

// 详情弹窗
const showDetailModal = ref(false);

// =========================================================
// Computed
// =========================================================
const currentClub = computed<Club | null>(() => chatStore.currentClub);
const messages = computed<ChatMessage[]>(() => chatStore.messages);
const memberPanel = computed(() => chatStore.memberPanel);
const inputDisabled = computed(() => userStore.isGuest);
const sending = computed(() => chatStore.sending);

// 活力值配置
const vitalityConfig = computed(() => {
  if (!clubDetail.value) return VITALITY_LEVEL_CONFIG.bronze;
  return VITALITY_LEVEL_CONFIG[clubDetail.value.vitality_level] || VITALITY_LEVEL_CONFIG.bronze;
});

// 俱乐部类型配置
const typeConfig = computed(() => {
  if (!clubDetail.value) return CLUB_TYPE_CONFIG.default;
  return CLUB_TYPE_CONFIG[clubDetail.value.club_type] || CLUB_TYPE_CONFIG.default;
});

// 活力值进度百分比
const vitalityProgress = computed(() => {
  if (!clubDetail.value) return 0;
  const config = vitalityConfig.value;
  const range = config.max_value === Infinity ? 1000 : config.max_value - config.min_value;
  const progress = clubDetail.value.vitality - config.min_value;
  return Math.min(100, Math.max(0, (progress / range) * 100));
});

// 距离下一等级
const nextLevelInfo = computed(() => {
  if (!clubDetail.value) return null;
  const level = clubDetail.value.vitality_level;
  if (level === 'diamond') return null;
  
  const levels: Array<'bronze' | 'silver' | 'gold' | 'diamond'> = ['bronze', 'silver', 'gold', 'diamond'];
  const currentIndex = levels.indexOf(level);
  const nextLevel = levels[currentIndex + 1];
  
  return {
    name: VITALITY_LEVEL_CONFIG[nextLevel].name,
    icon: VITALITY_LEVEL_CONFIG[nextLevel].icon,
    minValue: VITALITY_LEVEL_CONFIG[nextLevel].min_value
  };
});

// =========================================================
// Lifecycle
// =========================================================
onLoad((options: Record<string, string> | undefined) => {
  clubId.value = options?.id ?? '';
  const club = chatStore.enterClub(clubId.value);
  if (!club) {
    uni.showToast({ title: '俱乐部不存在', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  // 设置导航栏标题
  uni.setNavigationBarTitle({ title: club.name });
  // 滚到底部（mock 消息已经预填）
  nextTick(() => scrollToBottom());
  
  // 尝试解析数字clubId并加载详情
  clubIdNum.value = parseInt(clubId.value) || 0;
  if (clubIdNum.value > 0) {
    loadClubDetail();
  }
});

onUnload(() => {
  chatStore.leaveClub();
});

onMounted(() => {
  // 如果store中的club有更多数据，合并到detail
  if (currentClub.value) {
    clubDetail.value = {
      id: parseInt(currentClub.value.id) || 0,
      name: currentClub.value.name,
      description: currentClub.value.description,
      club_type: 'default',
      tags: [],
      join_type: 'auto',
      status: 'active',
      vitality: 0,
      vitality_level: 'bronze',
      member_count: currentClub.value.memberCount,
      post_count: currentClub.value.todayNewPosts,
      icon: currentClub.value.icon,
      openim_group_id: currentClub.value.groupID,
      owner_id: 0,
      game_name: currentClub.value.gameTag,
      created_at: new Date(currentClub.value.createdAt).toISOString(),
      updated_at: new Date().toISOString()
    };
  }
});

// =========================================================
// Methods
// =========================================================

/** 加载俱乐部详情 */
async function loadClubDetail() {
  if (clubIdNum.value <= 0) return;
  
  clubDetailLoading.value = true;
  try {
    const detail = await clubApi.getClubDetail(clubIdNum.value);
    clubDetail.value = detail;
  } catch (e) {
    console.warn('加载俱乐部详情失败:', e);
  } finally {
    clubDetailLoading.value = false;
  }
}

/** 显示详情弹窗 */
function showDetail() {
  showDetailModal.value = true;
}

/** 隐藏详情弹窗 */
function hideDetail() {
  showDetailModal.value = false;
}

/** 滚动到底部 */
function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999;
    const last = messages.value[messages.value.length - 1];
    if (last) {
      scrollIntoView.value = `msg_${last.clientMsgID}`;
    }
  });
}

/** 输入文本 v-model */
function handleInputUpdate(v: string) {
  inputText.value = v;
}

/** 发送文本 */
async function handleSend(text: string) {
  await chatStore.sendText(text);
  scrollToBottom();
}

/** 发送表情 */
async function handleEmoji(char: string) {
  await chatStore.sendEmoji(char);
  scrollToBottom();
}

/** 触发演示用的守护灵通知 */
async function simulateGuardianNotice() {
  await chatStore.sendGuardianNotice({
    kind: 'levelUp',
    actorName: userStore.profile?.nickname ?? '你',
    guardianType: userStore.profile?.guardianType ?? 'mechanical',
    title: '领地升级',
    content: '巢穴繁荣度 +20，解锁【群山矿脉】地图！',
    level: 9,
  });
  scrollToBottom();
}

/** 触发演示用的入群欢迎 */
async function simulateWelcome() {
  await chatStore.sendWelcome({
    newMemberName: '新人巢友',
    guardianType: 'elf',
    avatar: '🌿',
    greeting: '欢迎加入【原神·提瓦特茶摊】，请遵守领地公约，文明发言～',
  });
  scrollToBottom();
}

/** 切换成员面板 */
async function toggleMemberPanel() {
  await chatStore.toggleMemberPanel();
  scrollToBottom();
}

/** @ 提及成员 */
function handleSelectMember(m: ClubMember) {
  chatStore.toggleMemberPanel(false);
  if (userStore.isGuest) {
    uni.showToast({ title: '请先入驻巢穴', icon: 'none' });
    return;
  }
  const mention = `@${m.nickname} `;
  inputText.value = (inputText.value + mention).slice(0, 500);
}

/** 私聊成员 */
function handlePrivateChat(m: ClubMember) {
  chatStore.toggleMemberPanel(false);

  if (userStore.isGuest) {
    uni.showModal({
      title: '入驻巢穴',
      content: '私聊功能需要先入驻巢穴，是否前往？',
      confirmText: '去入驻',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/auth/login' });
      },
    });
    return;
  }

  if (m.userID === userStore.profile?.id) {
    uni.showToast({ title: '不能与自己私聊', icon: 'none' });
    return;
  }

  uni.navigateTo({
    url: '/pages/im/chat',
    query: {
      userID: m.userID,
      nickname: encodeURIComponent(m.nickname),
      avatar: encodeURIComponent(m.avatar || '🛖'),
      conversationID: '',
      guardianType: m.guardianType || '',
    },
  });
}

/** 发帖按钮 */
function handlePublish() {
  if (userStore.isGuest) {
    uni.navigateTo({ url: '/pages/auth/login' });
    return;
  }
  uni.showToast({ title: '发帖功能开发中', icon: 'none' });
}

/** 跳登录页 */
function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' });
}

/** 格式化时间 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 类型收窄 */
function asGuardianBody(body: ChatMessage['body']): GuardianNoticeBody {
  return body as GuardianNoticeBody;
}
function asWelcomeBody(body: ChatMessage['body']): WelcomeMessageBody {
  return body as WelcomeMessageBody;
}
function asTextBody(body: ChatMessage['body']): TextMessageBody {
  return body as TextMessageBody;
}
function asEmojiBody(body: ChatMessage['body']): EmojiMessageBody {
  return body as EmojiMessageBody;
}
</script>

<template>
  <view v-if="currentClub" class="page-detail">
    <!-- 顶部俱乐部头 -->
    <view class="detail-header">
      <view class="detail-header__top">
        <view class="detail-header__icon">
          {{ currentClub.icon }}
        </view>
        <view class="detail-header__title-block">
          <text class="detail-header__title">
            {{ currentClub.name }}
          </text>
          <view class="detail-header__meta">
            <u-tag :text="currentClub.gameTag" type="warning" size="mini" />
            <text class="detail-header__stat">
              {{ currentClub.memberCount.toLocaleString() }} 成员
            </text>
          </view>
        </view>
        <!-- 活力值徽章 -->
        <view v-if="clubDetail" class="detail-header__vitality" @tap="showDetail">
          <text class="vitality-icon">
            {{ vitalityConfig.icon }}
          </text>
          <text class="vitality-value">
            {{ clubDetail.vitality }}
          </text>
        </view>
      </view>
      
      <!-- 活力值进度条 -->
      <view v-if="clubDetail && clubDetail.vitality_level !== 'diamond'" class="detail-header__vitality-bar">
        <view class="vitality-bar__track">
          <view 
            class="vitality-bar__fill" 
            :style="{ width: vitalityProgress + '%', background: vitalityConfig.color }"
          ></view>
        </view>
        <text v-if="nextLevelInfo" class="vitality-bar__hint">
          距离{{ nextLevelInfo.icon }}{{ nextLevelInfo.name }}还需 {{ nextLevelInfo.minValue - clubDetail.vitality }} 活力值
        </text>
      </view>
      
      <view class="detail-header__actions">
        <view class="detail-header__action" @tap="handlePublish">
          <text class="detail-header__action-icon">
            📝
          </text>
          <text>发帖</text>
        </view>
        <view class="detail-header__action" @tap="toggleMemberPanel">
          <text class="detail-header__action-icon">
            👥
          </text>
          <text>成员</text>
        </view>
        <view class="detail-header__action" @tap="showDetail">
          <text class="detail-header__action-icon">
            📊
          </text>
          <text>详情</text>
        </view>
        <view class="detail-header__action" @tap="simulateGuardianNotice">
          <text class="detail-header__action-icon">
            🛡️
          </text>
          <text>守护灵</text>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      :show-scrollbar="false"
      :enhanced="true"
      :bounces="true"
      class="msg-scroll"
      scroll-y="true"
    >
      <view class="msg-list">
        <view
          v-for="m in messages"
          :id="`msg_${m.clientMsgID}`"
          :key="m.clientMsgID"
          class="msg-item"
        >
          <!-- 守护灵通知 -->
          <GuardianBubble
            v-if="m.renderType === 'guardian'"
            :guardian-type="asGuardianBody(m.body).guardianType"
            :title="asGuardianBody(m.body).title"
            :content="asGuardianBody(m.body).content"
            :level="asGuardianBody(m.body).level"
            :actor-name="asGuardianBody(m.body).actorName"
            :time="formatTime(m.sendTime)"
          />
          <!-- 入群欢迎 -->
          <WelcomeBubble
            v-else-if="m.renderType === 'welcome'"
            :new-member-name="asWelcomeBody(m.body).newMemberName"
            :avatar="asWelcomeBody(m.body).avatar"
            :guardian-type="asWelcomeBody(m.body).guardianType"
            :greeting="asWelcomeBody(m.body).greeting"
            :time="formatTime(m.sendTime)"
          />
          <!-- 表情 -->
          <ChatBubble
            v-else-if="m.renderType === 'emoji'"
            :is-self="m.isSelf"
            :emoji="asEmojiBody(m.body).emoji"
            :avatar="m.sendAvatar"
            :name="m.sendName"
            :time="formatTime(m.sendTime)"
          />
          <!-- 文本 -->
          <ChatBubble
            v-else
            :is-self="m.isSelf"
            :text="asTextBody(m.body).text"
            :avatar="m.sendAvatar"
            :name="m.sendName"
            :time="formatTime(m.sendTime)"
          />
        </view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <MessageInputBar
      v-model="inputText"
      :disabled="inputDisabled"
      :sending="sending"
      :placeholder="inputDisabled ? '请先入驻巢穴再发言' : '说点什么...'"
      @send="handleSend"
      @emoji="handleEmoji"
      @update:model-value="handleInputUpdate"
    />

    <!-- 游客态软提示 -->
    <view v-if="inputDisabled" class="guest-tip">
      <text>游客仅可围观，请</text>
      <text class="guest-tip__link" @tap="goLogin">
        入驻巢穴
      </text>
      <text>后参与群聊</text>
    </view>

    <!-- 成员面板 -->
    <ClubMemberList
      :visible="memberPanel.visible"
      :members="memberPanel.members"
      :loading="memberPanel.loading"
      @close="chatStore.toggleMemberPanel(false)"
      @select="handleSelectMember"
      @private-chat="handlePrivateChat"
    />

    <!-- 俱乐部详情弹窗 -->
    <u-overlay :show="showDetailModal" @tap="hideDetail">
      <view class="detail-modal" @tap.stop>
        <!-- 弹窗头部 -->
        <view class="detail-modal__header">
          <view class="detail-modal__icon">
            {{ currentClub.icon }}
          </view>
          <view class="detail-modal__title-block">
            <text class="detail-modal__title">
              {{ currentClub.name }}
            </text>
            <text class="detail-modal__type">
              {{ typeConfig.icon }} {{ typeConfig.name }}俱乐部
            </text>
          </view>
          <view class="detail-modal__close" @tap="hideDetail">
            ✕
          </view>
        </view>
        
        <!-- 活力值卡片 -->
        <view v-if="clubDetail" class="detail-modal__vitality">
          <view class="vitality-card">
            <view class="vitality-card__top">
              <view class="vitality-card__level">
                <text class="vitality-card__icon">
                  {{ vitalityConfig.icon }}
                </text>
                <text class="vitality-card__name">
                  {{ vitalityConfig.name }}
                </text>
              </view>
              <text class="vitality-card__value">
                {{ clubDetail.vitality }}
              </text>
            </view>
            <view class="vitality-card__progress">
              <view class="vitality-card__track">
                <view 
                  class="vitality-card__fill" 
                  :style="{ width: vitalityProgress + '%', background: vitalityConfig.color }"
                ></view>
              </view>
              <text class="vitality-card__range">
                {{ vitalityConfig.min_value }} ~ {{ vitalityConfig.max_value === Infinity ? '∞' : vitalityConfig.max_value }}
              </text>
            </view>
            <view v-if="nextLevelInfo" class="vitality-card__next">
              <text>距离 {{ nextLevelInfo.icon }}{{ nextLevelInfo.name }}：需 {{ nextLevelInfo.minValue - clubDetail.vitality }} 活力值</text>
            </view>
          </view>
        </view>
        
        <!-- 统计信息 -->
        <view v-if="clubDetail" class="detail-modal__stats">
          <view class="stat-item">
            <text class="stat-item__value">
              {{ clubDetail.member_count }}
            </text>
            <text class="stat-item__label">
              成员
            </text>
          </view>
          <view class="stat-item">
            <text class="stat-item__value">
              {{ clubDetail.post_count }}
            </text>
            <text class="stat-item__label">
              帖子
            </text>
          </view>
          <view class="stat-item">
            <text class="stat-item__value">
              {{ clubDetail.endorsement_count || 0 }}
            </text>
            <text class="stat-item__label">
              联署
            </text>
          </view>
        </view>
        
        <!-- 俱乐部信息 -->
        <view v-if="clubDetail" class="detail-modal__info">
          <view class="info-row">
            <text class="info-row__label">
              加入方式
            </text>
            <text class="info-row__value">
              {{ clubDetail.join_type === 'auto' ? '自动加入' : clubDetail.join_type === 'free' ? '自由加入' : '需要审批' }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-row__label">
              俱乐部状态
            </text>
            <u-tag 
              :text="clubDetail.status === 'active' ? '活跃' : clubDetail.status === 'dormant' ? '休眠' : clubDetail.status === 'archived' ? '已归档' : '已关闭'" 
              :type="clubDetail.status === 'active' ? 'success' : 'warning'"
              size="mini"
            />
          </view>
          <view v-if="clubDetail.game_name" class="info-row">
            <text class="info-row__label">
              关联游戏
            </text>
            <text class="info-row__value">
              {{ clubDetail.game_name }}
            </text>
          </view>
          <view v-if="clubDetail.tags && clubDetail.tags.length > 0" class="info-row">
            <text class="info-row__label">
              标签
            </text>
            <view class="info-row__tags">
              <u-tag 
                v-for="tag in clubDetail.tags" 
                :key="tag" 
                :text="tag" 
                size="mini" 
                plain
              />
            </view>
          </view>
          <view class="info-row">
            <text class="info-row__label">
              创建时间
            </text>
            <text class="info-row__value">
              {{ new Date(clubDetail.created_at).toLocaleDateString() }}
            </text>
          </view>
        </view>
        
        <!-- 加载状态 -->
        <view v-if="clubDetailLoading" class="detail-modal__loading">
          <u-loading-icon></u-loading-icon>
        </view>
        
        <!-- 关闭按钮 -->
        <view class="detail-modal__footer">
          <u-button type="primary" text="关闭" @click="hideDetail"></u-button>
        </view>
      </view>
    </u-overlay>
  </view>
</template>

<style lang="scss" scoped>
.page-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $u-bg-color;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(201, 168, 124, 0.05) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 80%, rgba(201, 168, 124, 0.05) 1rpx, transparent 1rpx),
    radial-gradient(circle at 50% 50%, rgba(201, 168, 124, 0.03) 2rpx, transparent 2rpx);
  background-size: 48rpx 48rpx, 48rpx 48rpx, 96rpx 96rpx;
}

.detail-header {
  flex-shrink: 0;
  padding: 24rpx 32rpx 16rpx;
  background: linear-gradient(180deg, rgba(38, 45, 39, 0.95) 0%, rgba(30, 36, 31, 0.85) 100%);
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.3);
  background-image:
    radial-gradient(circle at 0% 0%, rgba(201, 168, 124, 0.1) 1rpx, transparent 1rpx),
    radial-gradient(circle at 100% 100%, rgba(201, 168, 124, 0.1) 1rpx, transparent 1rpx);
  background-size: 32rpx 32rpx;
  backdrop-filter: blur(10rpx);

  &__top {
    display: flex;
    gap: 20rpx;
    align-items: center;
  }

  &__icon {
    font-size: 64rpx;
    width: 96rpx;
    height: 96rpx;
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.25), rgba(201, 168, 124, 0.05));
    border: 1rpx solid rgba(201, 168, 124, 0.5);
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__title-block {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 600;
    color: $u-main-color;
    letter-spacing: 2rpx;
    display: block;
    margin-bottom: 8rpx;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex-wrap: wrap;
  }
  &__stat {
    font-size: 22rpx;
    color: $u-tips-color;
  }

  // 活力值徽章
  &__vitality {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8rpx 16rpx;
    background: rgba(201, 168, 124, 0.15);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    .vitality-icon {
      font-size: 28rpx;
    }
    .vitality-value {
      font-size: 20rpx;
      color: $u-content-color;
      font-weight: 600;
    }
    &:active {
      background: rgba(201, 168, 124, 0.25);
    }
  }

  // 活力值进度条
  &__vitality-bar {
    margin-top: 16rpx;
    padding: 0 8rpx;
  }

  &__actions {
    display: flex;
    justify-content: space-around;
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx dashed rgba(201, 168, 124, 0.25);
  }

  &__action {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx;
    color: $u-content-color;
    font-size: 22rpx;
    border-radius: 12rpx;
    &:active { background: rgba(201, 168, 124, 0.1); }
  }
  &__action-icon {
    font-size: 36rpx;
  }
}

// 活力值进度条
.vitality-bar {
  &__track {
    height: 8rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4rpx;
    overflow: hidden;
  }
  &__fill {
    height: 100%;
    border-radius: 4rpx;
    transition: width 0.3s ease;
  }
  &__hint {
    font-size: 20rpx;
    color: $u-tips-color;
    margin-top: 8rpx;
    display: block;
  }
}

.msg-scroll {
  flex: 1;
  min-height: 0;
}

.msg-list {
  padding: 16rpx 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.msg-item {
  // 单一消息容器，便于 scroll-into-view 锚定
}

.guest-tip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 240rpx;
  text-align: center;
  font-size: 22rpx;
  color: $u-tips-color;
  pointer-events: auto;
  background: linear-gradient(180deg, transparent, rgba(30, 36, 31, 0.95) 30%);
  padding: 24rpx 32rpx 12rpx;
  &__link {
    color: #C9A87C;
    font-weight: 600;
    text-decoration: underline;
    margin: 0 8rpx;
  }
}

// 详情弹窗
.detail-modal {
  width: 600rpx;
  max-height: 80vh;
  background: linear-gradient(180deg, #2a332a 0%, #1e241e 100%);
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &__header {
    display: flex;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.2);
  }
  
  &__icon {
    font-size: 72rpx;
    width: 96rpx;
    height: 96rpx;
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.3), rgba(201, 168, 124, 0.1));
    border: 2rpx solid rgba(201, 168, 124, 0.5);
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  &__title-block {
    flex: 1;
    margin-left: 24rpx;
  }
  
  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: $u-main-color;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__type {
    font-size: 24rpx;
    color: $u-tips-color;
  }
  
  &__close {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    color: $u-tips-color;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    &:active {
      background: rgba(255, 255, 255, 0.1);
    }
  }
  
  // 活力值卡片
  &__vitality {
    padding: 24rpx 32rpx;
  }
  
  // 统计信息
  &__stats {
    display: flex;
    justify-content: space-around;
    padding: 24rpx 32rpx;
    border-top: 1rpx solid rgba(201, 168, 124, 0.1);
  }
  
  // 俱乐部信息
  &__info {
    padding: 0 32rpx 24rpx;
    flex: 1;
    overflow-y: auto;
  }
  
  // 加载
  &__loading {
    display: flex;
    justify-content: center;
    padding: 40rpx;
  }
  
  // 底部
  &__footer {
    padding: 24rpx 32rpx;
    border-top: 1rpx solid rgba(201, 168, 124, 0.1);
  }
}

// 活力值卡片
.vitality-card {
  background: linear-gradient(135deg, rgba(201, 168, 124, 0.15), rgba(201, 168, 124, 0.05));
  border: 1rpx solid rgba(201, 168, 124, 0.3);
  border-radius: 16rpx;
  padding: 24rpx;
  
  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__level {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  
  &__icon {
    font-size: 40rpx;
  }
  
  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: $u-main-color;
  }
  
  &__value {
    font-size: 36rpx;
    font-weight: 700;
    color: #C9A87C;
  }
  
  &__progress {
    margin-bottom: 12rpx;
  }
  
  &__track {
    height: 12rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6rpx;
    overflow: hidden;
  }
  
  &__fill {
    height: 100%;
    border-radius: 6rpx;
    transition: width 0.3s ease;
  }
  
  &__range {
    font-size: 20rpx;
    color: $u-tips-color;
    margin-top: 8rpx;
    display: block;
  }
  
  &__next {
    font-size: 22rpx;
    color: $u-tips-color;
    text-align: center;
    padding-top: 12rpx;
    border-top: 1rpx dashed rgba(201, 168, 124, 0.2);
  }
}

// 统计项
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &__value {
    font-size: 36rpx;
    font-weight: 700;
    color: #C9A87C;
  }
  
  &__label {
    font-size: 22rpx;
    color: $u-tips-color;
    margin-top: 4rpx;
  }
}

// 信息行
.info-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
  
  &__label {
    width: 140rpx;
    font-size: 24rpx;
    color: $u-tips-color;
    flex-shrink: 0;
  }
  
  &__value {
    flex: 1;
    font-size: 24rpx;
    color: $u-content-color;
  }
  
  &__tags {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }
}
</style>
