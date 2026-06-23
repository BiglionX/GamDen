<script setup lang="ts">
/**
 * 单聊聊天窗口（pages/im/chat）
 * ----------------------------------------------------------------------
 * 核心：复用 OpenIM 单聊能力（sessionType=1），展示 GamDen 皮肤：
 *   - 顶部：返回 + 对方昵称 + 守护灵头像 + 在线状态
 *   - 中部：消息列表（scroll-view，向上滚动加载更多历史）
 *     * 文本气泡：ChatBubble（古风边框纹理）
 *     * 表情气泡：ChatBubble（大字 emoji）
 *     * 图片气泡：ImageBubble（古风边框 + 点击预览）
 *     * 系统通知：居中提示条
 *   - 底部：MessageInputBar（文字 + 表情面板 + 图片按钮）
 *
 * 守护灵不介入私聊（仅系统通知）：
 *   - 本页面不渲染任何 GuardianBubble
 *   - 输入栏不提供"守护灵"按钮
 *   - store 中 sendGuardianNotice / sendWelcome 等 API 不在此处暴露
 */
import { computed, nextTick, ref } from 'vue';
import { onLoad, onPullDownRefresh, onUnload } from '@dcloudio/uni-app';
import { useSingleChatStore } from '@/stores/single-chat';
import { useUserStore } from '@/stores/user';
import type {
  EmojiMessageBody,
  ImageMessageBody,
  SingleChatMessage,
  SingleChatPeer,
  TextMessageBody,
} from '@/types/im';

import ChatBubble from '@/components/club/ChatBubble.vue';
import MessageInputBar from '@/components/club/MessageInputBar.vue';
import ImageBubble from '@/components/im/ImageBubble.vue';
import SystemBubble from '@/components/im/SystemBubble.vue';

// =========================================================
// Stores
// =========================================================
const chatStore = useSingleChatStore();
const userStore = useUserStore();

// =========================================================
// State
// =========================================================
const inputText = ref('');
const scrollTop = ref(0);
const scrollIntoView = ref('');
const statusBarHeight = ref(20);
const navBarHeight = ref(44);

// =========================================================
// Computed
// =========================================================
const peer = computed<SingleChatPeer | null>(() => chatStore.peer);
const messages = computed<SingleChatMessage[]>(() => chatStore.messages);
const sending = computed(() => chatStore.sending);
const loadingHistory = computed(() => chatStore.loadingHistory);
const inputDisabled = computed(() => userStore.isGuest);

// =========================================================
// Lifecycle
// =========================================================
onLoad(async (options: Record<string, string> | undefined) => {
  try {
    const info = uni.getSystemInfoSync();
    statusBarHeight.value = info.statusBarHeight ?? 20;
    navBarHeight.value = 44;
  } catch {
    /* ignore */
  }

  if (!options) {
    uni.showToast({ title: '参数缺失', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }

  // 解析入参（来自地图 / 俱乐部）
  const peerInfo: SingleChatPeer = {
    userID: options.userID ?? '',
    nickname: decodeURIComponent(options.nickname ?? '巢友'),
    avatar: decodeURIComponent(options.avatar ?? '🛖'),
    conversationID: options.conversationID ?? '',
    guardianType: (options.guardianType as SingleChatPeer['guardianType']) || undefined,
  };

  if (!peerInfo.userID) {
    uni.showToast({ title: '对方 ID 缺失', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }

  if (userStore.isGuest) {
    uni.showModal({
      title: '入驻巢穴',
      content: '私聊功能需要先入驻巢穴，是否前往？',
      confirmText: '去入驻',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack();
          setTimeout(() => uni.navigateTo({ url: '/pages/auth/login' }), 200);
        } else {
          uni.navigateBack();
        }
      },
    });
    return;
  }

  await chatStore.enterChat(peerInfo);
  uni.setNavigationBarTitle({ title: peerInfo.nickname });
  // 等消息列表渲染完后滚到底部
  nextTick(() => scrollToBottom(true));
});

onUnload(() => {
  chatStore.leaveChat();
});

// 触顶加载历史（onPullDownRefresh 仅在 enablePullDownRefresh 时生效）
onPullDownRefresh(async () => {
  if (chatStore.canLoadMore) {
    const beforeCount = messages.value.length;
    await chatStore.loadHistory();
    // 加载后保持位置（向上滚动不会跳）
    if (messages.value.length > beforeCount) {
      const anchor = messages.value[beforeCount - 1];
      if (anchor) {
        scrollIntoView.value = `msg_${anchor.clientMsgID}`;
      }
    }
  }
  uni.stopPullDownRefresh();
});

// =========================================================
// Actions
// =========================================================

/** 滚动到底部 */
function scrollToBottom(immediate = false) {
  nextTick(() => {
    if (immediate) {
      scrollTop.value = 99999;
    } else {
      const last = messages.value[messages.value.length - 1];
      if (last) scrollIntoView.value = `msg_${last.clientMsgID}`;
    }
  });
}

/** 输入框 v-model */
function handleInputUpdate(v: string) {
  inputText.value = v;
}

/** 发送文本 */
async function handleSend(text: string) {
  if (!text.trim() || sending.value) return;
  await chatStore.sendText(text);
  scrollToBottom();
}

/** 发送表情 */
async function handleEmoji(char: string, index?: number) {
  await chatStore.sendEmoji(char, index);
  scrollToBottom();
}

/** 发送图片 */
async function handleSendImage() {
  if (sending.value) return;
  try {
    const imagePath: string = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (r: UniApp.ChooseImageSuccessCallbackResult) => {
          // 取第一张图片的本地路径
          const files = (r.tempFiles as Array<{ path?: string }>) || [];
          const path = files[0]?.path;
          if (path) resolve(path);
          else reject(new Error('未获取到图片路径'));
        },
        fail: (e) => reject(e),
      });
    });
    if (!imagePath) return;
    await chatStore.sendImage(imagePath);
    scrollToBottom();
  } catch (e: unknown) {
    const err = e as { errMsg?: string };
    if (err?.errMsg && !/cancel/i.test(err.errMsg)) {
      uni.showToast({ title: '选择图片失败', icon: 'none' });
    }
  }
}

/** 返回 */
function goBack() {
  uni.navigateBack();
}

// =========================================================
// Helpers
// =========================================================
function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function asTextBody(body: SingleChatMessage['body']): TextMessageBody {
  return body as TextMessageBody;
}
function asEmojiBody(body: SingleChatMessage['body']): EmojiMessageBody {
  return body as EmojiMessageBody;
}
function asImageBody(body: SingleChatMessage['body']): ImageMessageBody {
  return body as ImageMessageBody;
}

/** 预览图片 */
function previewImage(url: string) {
  uni.previewImage({ urls: [url] });
}
</script>

<template>
  <view v-if="peer" class="page-chat">
    <!-- 顶部自定义导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner" :style="{ height: navBarHeight + 'px' }">
        <view class="navbar__back" @tap="goBack">
          <text class="navbar__back-icon">‹</text>
        </view>
        <view class="navbar__center">
          <text class="navbar__title">{{ peer.nickname }}</text>
        </view>
        <view class="navbar__placeholder" />
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
      @scrolltoupper="() => chatStore.loadHistory()"
    >
      <view v-if="loadingHistory" class="loading-tip">
        <text>加载历史消息...</text>
      </view>

      <view class="msg-list">
        <view
          v-for="m in messages"
          :key="m.clientMsgID"
          :id="`msg_${m.clientMsgID}`"
          class="msg-item"
        >
          <!-- 系统通知 -->
          <SystemBubble
            v-if="m.renderType === 'system'"
            :text="asTextBody(m.body).text || (m.rawContent || '')"
          />
          <!-- 图片 -->
          <ImageBubble
            v-else-if="m.renderType === 'image'"
            :is-self="m.isSelf"
            :image="asImageBody(m.body)"
            :avatar="m.isSelf ? (userStore.profile?.avatar ?? '🛖') : (peer.avatar || '🛖')"
            :name="m.isSelf ? '' : peer.nickname"
            :time="formatTime(m.sendTime)"
            :status="m.status"
            @tap-image="(url) => url && previewImage(url)"
          />
          <!-- 表情 -->
          <ChatBubble
            v-else-if="m.renderType === 'emoji'"
            :is-self="m.isSelf"
            :emoji="asEmojiBody(m.body).emoji"
            :avatar="m.isSelf ? (userStore.profile?.avatar ?? '🛖') : (peer.avatar || '🛖')"
            :name="m.isSelf ? '' : peer.nickname"
            :time="formatTime(m.sendTime)"
            :status="m.status"
          />
          <!-- 文本 -->
          <ChatBubble
            v-else
            :is-self="m.isSelf"
            :text="asTextBody(m.body).text || m.rawContent"
            :avatar="m.isSelf ? (userStore.profile?.avatar ?? '🛖') : (peer.avatar || '🛖')"
            :name="m.isSelf ? '' : peer.nickname"
            :time="formatTime(m.sendTime)"
            :status="m.status"
          />
        </view>

        <view v-if="messages.length === 0" class="empty-tip">
          <text>暂无消息，发起第一句问候吧～</text>
        </view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <MessageInputBar
      v-model="inputText"
      :disabled="inputDisabled"
      :sending="sending"
      :placeholder="inputDisabled ? '请先入驻巢穴再私聊' : '说点什么...'"
      :show-image="true"
      @send="handleSend"
      @emoji="handleEmoji"
      @image="handleSendImage"
      @update:model-value="handleInputUpdate"
    />
  </view>
  <view v-else class="page-loading">
    <text>加载中...</text>
  </view>
</template>

<style lang="scss" scoped>
.page-chat {
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

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: $u-tips-color;
  font-size: 28rpx;
}

.navbar {
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(38, 45, 39, 0.95) 0%, rgba(30, 36, 31, 0.85) 100%);
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.3);
  backdrop-filter: blur(10rpx);

  &__inner {
    display: flex;
    align-items: center;
    padding: 0 24rpx;
  }
  &__back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.1);
    &:active { background: rgba(201, 168, 124, 0.25); }
  }
  &__back-icon {
    font-size: 48rpx;
    color: $u-main-color;
    line-height: 1;
    margin-top: -4rpx;
  }
  &__center {
    flex: 1;
    text-align: center;
  }
  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: $u-main-color;
    letter-spacing: 2rpx;
  }
  &__placeholder {
    width: 60rpx;
  }
}

.msg-scroll {
  flex: 1;
  min-height: 0;
}

.loading-tip {
  text-align: center;
  padding: 16rpx 0;
  font-size: 22rpx;
  color: $u-tips-color;
}

.msg-list {
  padding: 16rpx 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.msg-item {
  // 单一消息容器，便于 scroll-into-view 锚定
}

.empty-tip {
  text-align: center;
  padding: 80rpx 32rpx;
  color: $u-tips-color;
  font-size: 26rpx;
  letter-spacing: 2rpx;
}
</style>