import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import im from '@/utils/im';
import { IM_EVENTS } from '@/utils/im-config';
import { useUserStore } from '@/stores/user';
import { useImStore } from '@/stores/im';
import {
  fetchSingleChatHistory,
  parseSingleMessage,
  sendSingleEmojiMessage,
  sendSingleImageMessage,
  sendSingleTextMessage,
  SINGLE_CONTENT_TYPE,
  type RawSingleMessage,
} from '@/utils/im-single-chat';
import type {
  EmojiMessageBody,
  ImageMessageBody,
  SingleChatMessage,
  SingleChatPeer,
  TextMessageBody,
} from '@/types/im';

/**
 * 单聊状态管理
 * ----------------------------------------------------------------------
 * - 维护当前打开的单聊会话（peer） + 消息列表
 * - 订阅 OpenIM SDK 的 newMessage 事件，过滤当前 recvID 后入列
 * - 提供 sendText / sendEmoji / sendImage 三个动作
 *
 * 注：本 store 仅处理单聊；群聊走 club-chat store；守护灵通知不走单聊通道。
 */

const HISTORY_PAGE_SIZE = 30;

export const useSingleChatStore = defineStore('single-chat', () => {
  // ----------------- State -----------------

  /** 当前打开的单聊对方 */
  const peer = ref<SingleChatPeer | null>(null);
  /** 消息列表（按时间倒序展示，最新的在最底部） */
  const messages = ref<SingleChatMessage[]>([]);
  /** 发送中（按钮 loading） */
  const sending = ref(false);
  /** 历史消息加载中（向上滚动加载更多） */
  const loadingHistory = ref(false);
  /** 是否还有更多历史消息 */
  const hasMoreHistory = ref(true);

  // ----------------- Computed -----------------

  /** 是否处于某个单聊 */
  const inChat = computed(() => !!peer.value);
  /** 是否能继续向下滚动加载 */
  const canLoadMore = computed(() => !!peer.value && hasMoreHistory.value && !loadingHistory.value);

  // 订阅句柄（leaveChat 时清理）
  let unsubNewMessage: (() => void) | null = null;
  let unsubConvChanged: (() => void) | null = null;

  // ===========================================================
  // Actions
  // ===========================================================

  /**
   * 进入单聊（由 chat.vue onLoad 调用）
   * @param peerInfo 对方信息（userID/nickname/avatar 必填，conversationID 可选）
   */
  async function enterChat(peerInfo: SingleChatPeer): Promise<void> {
    // 离开上一个会话（清理订阅）
    leaveChat();

    peer.value = peerInfo;
    messages.value = [];
    hasMoreHistory.value = true;

    // 1. 拉历史消息
    await loadHistory();

    // 2. 标记已读（清零该会话未读）
    if (peerInfo.conversationID) {
      await im.markConversationRead(peerInfo.conversationID);
      // 同步更新总未读数
      try {
        const imStore = useImStore();
        await imStore.refreshUnreadCount();
      } catch {
        /* ignore */
      }
    }

    // 3. 订阅新消息
    subscribeIncoming(peerInfo.userID);
  }

  /**
   * 离开单聊（chat.vue onUnload 调用）
   */
  function leaveChat(): void {
    unsubscribeIncoming();
    peer.value = null;
    messages.value = [];
    hasMoreHistory.value = true;
    sending.value = false;
    loadingHistory.value = false;
  }

  /**
   * 加载更多历史消息（向上滚动触发）
   */
  async function loadHistory(): Promise<void> {
    if (!peer.value || !peer.value.conversationID) return;
    if (loadingHistory.value || !hasMoreHistory.value) return;

    loadingHistory.value = true;
    try {
      const oldest = messages.value[0];
      const raw = await fetchSingleChatHistory(
        peer.value.conversationID,
        oldest?.clientMsgID ?? '',
        HISTORY_PAGE_SIZE,
      );

      if (raw.length < HISTORY_PAGE_SIZE) {
        hasMoreHistory.value = false;
      }

      const userStore = useUserStore();
      const parsed = raw.map((m) => parseSingleMessage(m, userStore.profile?.id ?? ''));
      // 历史消息按时间正序追加到列表头部
      messages.value = [...parsed, ...messages.value];
    } catch (e) {
      console.error('[single-chat] loadHistory 失败:', e);
    } finally {
      loadingHistory.value = false;
    }
  }

  // ===========================================================
  // 发送消息
  // ===========================================================

  /**
   * 发送文本
   */
  async function sendText(text: string): Promise<void> {
    if (!peer.value || sending.value) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const userStore = useUserStore();
    const ctx = {
      sendID: userStore.profile?.id ?? im.currentUserId() ?? 'anonymous',
      sendName: userStore.profile?.nickname ?? '我',
      sendAvatar: userStore.profile?.avatar ?? '🛖',
      recvID: peer.value.userID,
    };

    sending.value = true;
    // 乐观更新：先在 UI 列表追加（status: sending）
    const optimistic = buildLocalMessage({
      contentType: SINGLE_CONTENT_TYPE.TEXT,
      content: JSON.stringify({ text: trimmed }),
      ctx,
    });
    optimistic.status = 'sending';
    appendMessage(optimistic);

    const { ok, message } = await sendSingleTextMessage(trimmed, ctx);
    finalizeMessage(optimistic, message, ok);
    sending.value = false;
  }

  /**
   * 发送表情
   */
  async function sendEmoji(emoji: string, index?: number): Promise<void> {
    if (!peer.value || sending.value) return;
    if (!emoji) return;

    const userStore = useUserStore();
    const ctx = {
      sendID: userStore.profile?.id ?? im.currentUserId() ?? 'anonymous',
      sendName: userStore.profile?.nickname ?? '我',
      sendAvatar: userStore.profile?.avatar ?? '🛖',
      recvID: peer.value.userID,
    };

    sending.value = true;
    const optimistic = buildLocalMessage({
      contentType: SINGLE_CONTENT_TYPE.FACE,
      content: JSON.stringify({ emoji, index }),
      ctx,
    });
    optimistic.status = 'sending';
    appendMessage(optimistic);

    const { ok, message } = await sendSingleEmojiMessage(emoji, ctx, index);
    finalizeMessage(optimistic, message, ok);
    sending.value = false;
  }

  /**
   * 发送图片
   */
  async function sendImage(imagePath: string): Promise<void> {
    if (!peer.value || sending.value) return;
    if (!imagePath) return;

    const userStore = useUserStore();
    const ctx = {
      sendID: userStore.profile?.id ?? im.currentUserId() ?? 'anonymous',
      sendName: userStore.profile?.nickname ?? '我',
      sendAvatar: userStore.profile?.avatar ?? '🛖',
      recvID: peer.value.userID,
    };

    sending.value = true;
    const optimistic = buildLocalMessage({
      contentType: SINGLE_CONTENT_TYPE.PICTURE,
      content: '',
      ctx,
      pictureElem: { sourcePath: imagePath },
    });
    optimistic.status = 'sending';
    appendMessage(optimistic);

    const { ok, message } = await sendSingleImageMessage(imagePath, ctx);
    finalizeMessage(optimistic, message, ok);
    sending.value = false;
  }

  // ===========================================================
  // 私有：消息列表维护
  // ===========================================================

  /**
   * 追加消息到列表尾部（去重）
   */
  function appendMessage(msg: SingleChatMessage): void {
    if (messages.value.some((m) => m.clientMsgID === msg.clientMsgID)) return;
    messages.value.push(msg);
  }

  /**
   * 把乐观发送的消息状态更新为最终结果
   */
  function finalizeMessage(
    optimistic: SingleChatMessage,
    sdkMessage: RawSingleMessage | null,
    ok: boolean,
  ): void {
    if (!sdkMessage) {
      optimistic.status = 'failed';
      return;
    }
    optimistic.clientMsgID = sdkMessage.clientMsgID || optimistic.clientMsgID;
    optimistic.sendTime = sdkMessage.sendTime || optimistic.sendTime;
    optimistic.status = ok ? 'success' : 'failed';
  }

  /**
   * 构造本地乐观消息
   */
  function buildLocalMessage(opts: {
    contentType: number;
    content: string;
    ctx: { sendID: string; sendName: string; sendAvatar: string; recvID: string };
    pictureElem?: { sourcePath?: string };
  }): SingleChatMessage {
    const { contentType, content, ctx, pictureElem } = opts;
    const clientMsgID = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let renderType: SingleChatMessage['renderType'] = 'text';
    let body: SingleChatMessage['body'] = { text: '' } as TextMessageBody;

    if (contentType === SINGLE_CONTENT_TYPE.FACE) {
      renderType = 'emoji';
      let emoji = '🙂';
      try {
        const parsed = JSON.parse(content);
        if (parsed?.emoji) emoji = String(parsed.emoji);
      } catch {
        /* ignore */
      }
      body = { emoji } as EmojiMessageBody;
    } else if (contentType === SINGLE_CONTENT_TYPE.PICTURE) {
      renderType = 'image';
      body = {
        sourcePath: pictureElem?.sourcePath,
      } as ImageMessageBody;
    } else {
      let text = content;
      try {
        const parsed = JSON.parse(content);
        if (parsed?.text) text = String(parsed.text);
      } catch {
        /* ignore */
      }
      body = { text } as TextMessageBody;
    }

    return {
      clientMsgID,
      sendID: ctx.sendID,
      sendName: ctx.sendName,
      sendAvatar: ctx.sendAvatar,
      recvID: ctx.recvID,
      sessionType: 1,
      renderType,
      contentType: contentType as SingleChatMessage['contentType'],
      rawContent: content,
      body,
      sendTime: Date.now(),
      isSelf: true,
      status: 'sending',
    };
  }

  // ===========================================================
  // 私有：SDK 事件订阅
  // ===========================================================

  /**
   * 订阅 OpenIM newMessage 事件，过滤出当前 peer 的消息
   */
  function subscribeIncoming(targetUserID: string): void {
    unsubscribeIncoming();

    unsubNewMessage = im.on(IM_EVENTS.NEW_MESSAGE, (data: unknown) => {
      if (!peer.value) return;
      const raw = data as RawSingleMessage | undefined;
      if (!raw) return;

      // 仅处理单聊 + 与当前 peer 相关
      if (Number(raw.sessionType) !== 1) return;
      const isRelated =
        (raw.sendID === targetUserID && raw.recvID === peer.value.userID) ||
        (raw.sendID === peer.value.userID && raw.recvID === targetUserID);
      if (!isRelated) return;

      const userStore = useUserStore();
      const parsed = parseSingleMessage(raw, userStore.profile?.id ?? '');
      appendMessage(parsed);
    });

    // 会话变更：刷新当前会话的未读（防御性，正常场景已被 enterChat 清零）
    unsubConvChanged = im.on(IM_EVENTS.CONVERSATION_CHANGED, async () => {
      if (!peer.value?.conversationID) return;
      try {
        await im.markConversationRead(peer.value.conversationID);
        const imStore = useImStore();
        await imStore.refreshUnreadCount();
      } catch {
        /* ignore */
      }
    });
  }

  function unsubscribeIncoming(): void {
    if (unsubNewMessage) {
      unsubNewMessage();
      unsubNewMessage = null;
    }
    if (unsubConvChanged) {
      unsubConvChanged();
      unsubConvChanged = null;
    }
  }

  return {
    // state
    peer,
    messages,
    sending,
    loadingHistory,
    hasMoreHistory,
    // getters
    inChat,
    canLoadMore,
    // actions
    enterChat,
    leaveChat,
    loadHistory,
    sendText,
    sendEmoji,
    sendImage,
  };
});