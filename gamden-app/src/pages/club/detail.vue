<script setup lang="ts">
/**
 * 俱乐部详情页（pages/club/detail）
 * ----------------------------------------------------------------------
 * 核心：复用 OpenIM 群聊能力（不修改核心源码），展示 GamDen 皮肤：
 *   - 顶部：俱乐部标题 + 成员数 + 发帖按钮 + 成员入口
 *   - 中部：消息列表（scroll-view）
 *     * 文本/表情气泡：ChatBubble（古风边框纹理）
 *     * 守护灵通知：GuardianBubble（特殊气泡 + 守护灵头像）
 *     * 入群欢迎：WelcomeBubble
 *   - 底部：MessageInputBar（文字 + 表情面板）
 *   - 右抽屉：ClubMemberList（按角色分组）
 *
 * 自定义消息约定：
 *   - contentType 115  -> emoji 消息
 *   - contentType 200  -> 守护灵系统通知
 *   - contentType 201  -> 入群欢迎
 *   全部走 im-custom-msg.ts 的 buildXxx / parseCustomMessage
 */
import { computed, nextTick, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useClubChatStore } from '@/stores/club-chat';
import { useUserStore } from '@/stores/user';
import type { ChatMessage, Club, ClubMember, GuardianNoticeBody, WelcomeMessageBody } from '@/types/club';
import type { EmojiMessageBody, TextMessageBody } from '@/types/club';

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
const clubId = ref('');
const inputText = ref('');
const scrollTop = ref(0);
const scrollIntoView = ref('');

// =========================================================
// Computed
// =========================================================
const currentClub = computed<Club | null>(() => chatStore.currentClub);
const messages = computed<ChatMessage[]>(() => chatStore.messages);
const memberPanel = computed(() => chatStore.memberPanel);
const inputDisabled = computed(() => userStore.isGuest);
const sending = computed(() => chatStore.sending);

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
});

onUnload(() => {
  chatStore.leaveClub();
});

// =========================================================
// Actions
// =========================================================

/** 滚动到底部（用 scrollTop 大数值兜底，跨平台稳定） */
function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999;
    // 同时设置 scroll-into-view 兜底
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

/** 触发演示用的守护灵通知（开发态可见） */
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

/** 触发演示用的入群欢迎（管理态可见） */
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
  // 在输入框追加 @昵称
  const mention = `@${m.nickname} `;
  inputText.value = (inputText.value + mention).slice(0, 500);
}

/** 私聊成员（俱乐部 → 单聊窗口） */
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

  // 不能和自己私聊
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

/** 发帖按钮（占位） */
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

// =========================================================
// Helpers
// =========================================================

/** 格式化时间（ms -> HH:MM） */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 把 GuardianNoticeBody 类型收窄 */
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
        <view class="detail-header__icon">{{ currentClub.icon }}</view>
        <view class="detail-header__title-block">
          <text class="detail-header__title">{{ currentClub.name }}</text>
          <view class="detail-header__meta">
            <u-tag :text="currentClub.gameTag" type="warning" size="mini" />
            <text class="detail-header__stat">
              {{ currentClub.memberCount.toLocaleString() }} 成员 · 今日 {{ currentClub.todayNewPosts }} 新帖
            </text>
          </view>
        </view>
      </view>
      <view class="detail-header__actions">
        <view class="detail-header__action" @tap="handlePublish">
          <text class="detail-header__action-icon">📝</text>
          <text>发帖</text>
        </view>
        <view class="detail-header__action" @tap="toggleMemberPanel">
          <text class="detail-header__action-icon">👥</text>
          <text>成员</text>
        </view>
        <view class="detail-header__action" @tap="simulateGuardianNotice">
          <text class="detail-header__action-icon">🛡️</text>
          <text>守护灵</text>
        </view>
        <view class="detail-header__action" @tap="simulateWelcome">
          <text class="detail-header__action-icon">✦</text>
          <text>欢迎</text>
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
          :key="m.clientMsgID"
          :id="`msg_${m.clientMsgID}`"
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
      <text class="guest-tip__link" @tap="goLogin">入驻巢穴</text>
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
  </view>
</template>

<style lang="scss" scoped>
.page-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $u-bg-color;
  // 巢穴暗纹背景
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
  // 古风暗纹
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
</style>
