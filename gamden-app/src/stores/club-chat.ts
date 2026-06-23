import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  ChatMessage,
  Club,
  ClubMember,
  MemberPanelState,
} from '@/types/club';
import {
  buildEmojiMessage,
  buildGuardianNotice,
  buildTextMessage,
  buildWelcomeMessage,
  CUSTOM_MSG_TYPE,
  GUARDIAN_COLOR,
  GUARDIAN_ICON,
  GUARDIAN_NAME,
  parseCustomMessage,
  sendMessageViaSDK,
  type RawIMMessage,
} from '@/utils/im-custom-msg';
import im from '@/utils/im';
import { IM_EVENTS } from '@/utils/im-config';
import { useUserStore } from '@/stores/user';

/**
 * 俱乐部会话 store
 * ----------------------------------------------------------------------
 * - 维护当前打开的俱乐部 ID + 消息列表 + 成员面板
 * - 订阅 OpenIM SDK 的 newMessage 事件，过滤当前 groupID 后入列
 * - 提供 sendText / sendEmoji / sendGuardianNotice / sendWelcome 四个动作
 *
 * 注：所有 IM 调用走 im-config-bridge（统一管理 SDK 加载），
 *    不直接 import openim-uniapp-polyfill，方便本地 mock fallback。
 */

// =========================================================
// 俱乐部 mock 数据（V1.0 - 真实接入后替换为后端接口）
// =========================================================
const CLUB_DATA: Record<string, Club> = {
  c1: {
    id: 'c1',
    groupID: 'group_c1',
    name: '原神·提瓦特茶摊',
    gameTag: '原神',
    description: '讨论角色、武器、深渊配队',
    icon: '🏯',
    memberCount: 1284,
    todayNewPosts: 56,
    ownerID: 'u_owner_genshin',
    createdAt: Date.now() - 86400000 * 90,
  },
  c2: {
    id: 'c2',
    groupID: 'group_c2',
    name: '艾尔登法环·褪色者集会',
    gameTag: '艾尔登法环',
    description: 'Boss 攻略、构筑分享、新手答疑',
    icon: '⚔️',
    memberCount: 892,
    todayNewPosts: 31,
    ownerID: 'u_owner_elden',
    createdAt: Date.now() - 86400000 * 60,
  },
  c3: {
    id: 'c3',
    groupID: 'group_c3',
    name: '黑神话·天命人茶馆',
    gameTag: '黑神话悟空',
    description: '通关路线、隐藏任务、剧情讨论',
    icon: '🐒',
    memberCount: 2156,
    todayNewPosts: 88,
    ownerID: 'u_owner_wukong',
    createdAt: Date.now() - 86400000 * 45,
  },
  c4: {
    id: 'c4',
    groupID: 'group_c4',
    name: '赛博朋克·夜之城酒吧',
    gameTag: '赛博朋克2077',
    description: 'MOD 分享、剧情线讨论',
    icon: '🌃',
    memberCount: 567,
    todayNewPosts: 19,
    ownerID: 'u_owner_cyber',
    createdAt: Date.now() - 86400000 * 30,
  },
};

// =========================================================
// mock 成员 + 消息（仅在真实 SDK 未连接时使用）
// =========================================================
const MOCK_MEMBERS: ClubMember[] = [
  { userID: 'u_owner_genshin', nickname: '钟离先生', avatar: '🪨', role: 1, guardianType: 'astrologer', online: true, joinedAt: Date.now() - 86400000 * 90 },
  { userID: 'u_hutao_cat', nickname: '胡桃的猫', avatar: '🐱', role: 2, guardianType: 'elf', online: true, joinedAt: Date.now() - 86400000 * 60 },
  { userID: 'u_traveler', nickname: '提瓦特旅人', avatar: '🧳', role: 3, guardianType: 'mechanical', online: false, joinedAt: Date.now() - 86400000 * 30 },
  { userID: 'u_xiao', nickname: '夜叉护卫', avatar: '🌬️', role: 3, guardianType: 'elf', online: true, joinedAt: Date.now() - 86400000 * 14 },
  { userID: 'u_ganyu', nickname: '甘雨姐姐', avatar: '❄️', role: 3, guardianType: 'astrologer', online: false, joinedAt: Date.now() - 86400000 * 7 },
  { userID: 'u_zhongli_fan', nickname: '璃月厨', avatar: '🍵', role: 3, guardianType: 'astrologer', online: true, joinedAt: Date.now() - 86400000 * 3 },
  { userID: 'u_shenhe', nickname: '申鹤小姐', avatar: '🦢', role: 3, guardianType: 'elf', online: false, joinedAt: Date.now() - 86400000 * 1 },
];

const MOCK_INITIAL_MESSAGES = (groupID: string): ChatMessage[] => [
  {
    clientMsgID: 'mock_wel_1',
    sendID: 'system',
    sendName: '巢穴',
    sendAvatar: '🏯',
    groupID,
    sessionType: 2,
    renderType: 'welcome',
    contentType: CUSTOM_MSG_TYPE.WELCOME,
    rawContent: '',
    body: {
      newMemberName: '夜叉护卫',
      guardianType: 'elf',
      avatar: '🌬️',
      greeting: '欢迎加入【原神·提瓦特茶摊】，请遵守领地公约，文明发言～',
      joinedAt: Date.now() - 3600_000 * 2,
    },
    sendTime: Date.now() - 3600_000 * 2,
    isSelf: false,
  },
  {
    clientMsgID: 'mock_grd_1',
    sendID: 'system',
    sendName: '守护灵',
    sendAvatar: GUARDIAN_ICON.astrologer,
    groupID,
    sessionType: 2,
    renderType: 'guardian',
    contentType: CUSTOM_MSG_TYPE.GUARDIAN_NOTICE,
    rawContent: '',
    body: {
      kind: 'levelUp',
      actorName: '钟离先生',
      guardianType: 'astrologer',
      title: '领地升级',
      content: '已达 Lv.8，解锁【秘银矿井】与【群山矿脉】',
      level: 8,
      timestamp: Date.now() - 3600_000,
    },
    sendTime: Date.now() - 3600_000,
    isSelf: false,
  },
  {
    clientMsgID: 'mock_txt_1',
    sendID: 'u_hutao_cat',
    sendName: '胡桃的猫',
    sendAvatar: '🐱',
    groupID,
    sessionType: 2,
    renderType: 'text',
    contentType: CUSTOM_MSG_TYPE.TEXT,
    rawContent: '',
    body: { text: '刚抽到夜兰，分享下配队思路：夜行、雷神、班尼特、香菱。' },
    sendTime: Date.now() - 1800_000,
    isSelf: false,
  },
  {
    clientMsgID: 'mock_emo_1',
    sendID: 'u_xiao',
    sendName: '夜叉护卫',
    sendAvatar: '🌬️',
    groupID,
    sessionType: 2,
    renderType: 'emoji',
    contentType: CUSTOM_MSG_TYPE.EMOJI,
    rawContent: '',
    body: { emoji: '🔥' },
    sendTime: Date.now() - 1500_000,
    isSelf: false,
  },
  {
    clientMsgID: 'mock_txt_2',
    sendID: 'u_owner_genshin',
    sendName: '钟离先生',
    sendAvatar: '🪨',
    groupID,
    sessionType: 2,
    renderType: 'text',
    contentType: CUSTOM_MSG_TYPE.TEXT,
    rawContent: '',
    body: { text: '4.5 版本深渊攻略，12 层无伤满星攻略已更新到 B 站。' },
    sendTime: Date.now() - 600_000,
    isSelf: false,
  },
];

// =========================================================
// Store
// =========================================================
export const useClubChatStore = defineStore('club-chat', () => {
  // ---------- state ----------
  const currentClubId = ref<string>('');
  const currentClub = ref<Club | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const inputText = ref('');
  const sending = ref(false);
  const memberPanel = ref<MemberPanelState>({
    visible: false,
    loading: false,
    members: [],
  });

  // 计算属性：是否处于某个俱乐部
  const hasClub = computed(() => !!currentClub.value);

  // 订阅句柄（登出时清理）
  let unsubNewMessage: (() => void) | null = null;

  // ---------- actions ----------

  /**
   * 进入俱乐部会话（由 detail.vue onLoad 调用）
   */
  function enterClub(clubId: string): Club | null {
    const club = CLUB_DATA[clubId];
    if (!club) return null;
    currentClubId.value = clubId;
    currentClub.value = club;
    messages.value = MOCK_INITIAL_MESSAGES(club.groupID);
    memberPanel.value.members = MOCK_MEMBERS;
    subscribeIncoming();
    return club;
  }

  /**
   * 离开俱乐部
   */
  function leaveClub(): void {
    unsubscribeIncoming();
    currentClubId.value = '';
    currentClub.value = null;
    messages.value = [];
    memberPanel.value.visible = false;
  }

  /**
   * 切换成员列表面板
   */
  async function toggleMemberPanel(force?: boolean): Promise<void> {
    const next = force ?? !memberPanel.value.visible;
    memberPanel.value.visible = next;
    if (next && memberPanel.value.members.length === 0) {
      await loadMembers();
    }
  }

  /**
   * 加载成员列表（真实 SDK：getGroupMemberList；mock：直接返回）
   */
  async function loadMembers(): Promise<void> {
    if (!currentClub.value) return;
    memberPanel.value.loading = true;
    try {
      // 真实环境：const sdk = im.getSDK(); await sdk.getGroupMemberList({ groupID: currentClub.value.groupID })
      await new Promise((r) => setTimeout(r, 300));
      memberPanel.value.members = MOCK_MEMBERS;
    } finally {
      memberPanel.value.loading = false;
    }
  }

  // ---------- 发送消息 ----------

  /**
   * 发送文本消息
   */
  async function sendText(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || !currentClub.value) return;
    const userStore = useUserStore();
    const ctx = {
      sendID: userStore.profile?.id ?? im.currentUserId() ?? 'anonymous',
      sendName: userStore.profile?.nickname ?? '游客',
      sendAvatar: userStore.profile?.avatar ?? '🛖',
      groupID: currentClub.value.groupID,
    };
    const raw = buildTextMessage(trimmed, ctx);
    await dispatchMessage(raw);
  }

  /**
   * 发送表情消息
   */
  async function sendEmoji(emoji: string, index?: number): Promise<void> {
    if (!emoji || !currentClub.value) return;
    const userStore = useUserStore();
    const ctx = {
      sendID: userStore.profile?.id ?? im.currentUserId() ?? 'anonymous',
      sendName: userStore.profile?.nickname ?? '游客',
      sendAvatar: userStore.profile?.avatar ?? '🛖',
      groupID: currentClub.value.groupID,
    };
    const raw = buildEmojiMessage(emoji, ctx, index);
    await dispatchMessage(raw);
  }

  /**
   * 发送守护灵通知（通常由服务端/系统触发，这里暴露给前端演练）
   */
  async function sendGuardianNotice(payload: Parameters<typeof buildGuardianNotice>[0]): Promise<void> {
    if (!currentClub.value) return;
    const ctx = {
      sendID: 'system',
      sendName: '守护灵',
      sendAvatar: GUARDIAN_ICON[payload.guardianType] ?? GUARDIAN_ICON.mechanical,
      groupID: currentClub.value.groupID,
    };
    const raw = buildGuardianNotice(payload, ctx);
    await dispatchMessage(raw);
  }

  /**
   * 发送入群欢迎（管理/系统触发）
   */
  async function sendWelcome(payload: Parameters<typeof buildWelcomeMessage>[0]): Promise<void> {
    if (!currentClub.value) return;
    const ctx = {
      sendID: 'system',
      sendName: '巢穴',
      sendAvatar: '🏯',
      groupID: currentClub.value.groupID,
    };
    const raw = buildWelcomeMessage(payload, ctx);
    await dispatchMessage(raw);
  }

  // ---------- 私有：消息分发 ----------

  /**
   * 统一的消息发送/入列流程：
   *   1. 立刻在 UI 列表追加（乐观更新）
   *   2. 调 SDK 真正发送
   *   3. 失败时在气泡上加 fail 标记
   */
  async function dispatchMessage(raw: RawIMMessage): Promise<void> {
    const userStore = useUserStore();
    const chatMsg = parseCustomMessage(raw, userStore.profile?.id ?? '');
    messages.value.push({ ...chatMsg, isSelf: true });
    sending.value = true;
    try {
      const ok = await sendMessageViaSDK(raw);
      if (!ok) {
        console.warn('[club-chat] SDK 不可用，本条仅本地展示');
      }
    } finally {
      sending.value = false;
    }
  }

  // ---------- 私有：SDK 事件订阅 ----------

  function subscribeIncoming(): void {
    unsubscribeIncoming();
    unsubNewMessage = im.on(IM_EVENTS.NEW_MESSAGE, (data: unknown) => {
      const msg = data as RawIMMessage | undefined;
      if (!msg || !currentClub.value) return;
      if (msg.groupID !== currentClub.value.groupID) return;
      const userStore = useUserStore();
      const parsed = parseCustomMessage(msg, userStore.profile?.id ?? '');
      // 去重（同 clientMsgID 不重复入列）
      if (!messages.value.some((m) => m.clientMsgID === parsed.clientMsgID)) {
        messages.value.push(parsed);
      }
    });
  }

  function unsubscribeIncoming(): void {
    if (unsubNewMessage) {
      unsubNewMessage();
      unsubNewMessage = null;
    }
  }

  // ---------- 静态数据访问 ----------

  function getClubById(id: string): Club | null {
    return CLUB_DATA[id] ?? null;
  }

  function listClubs(): Club[] {
    return Object.values(CLUB_DATA);
  }

  function searchClubs(keyword: string): Club[] {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return listClubs();
    return listClubs().filter(
      (c) =>
        c.gameTag.toLowerCase().includes(kw) ||
        c.name.toLowerCase().includes(kw),
    );
  }

  return {
    // state
    currentClubId,
    currentClub,
    messages,
    inputText,
    sending,
    memberPanel,
    // getters
    hasClub,
    // actions
    enterClub,
    leaveClub,
    toggleMemberPanel,
    loadMembers,
    sendText,
    sendEmoji,
    sendGuardianNotice,
    sendWelcome,
    getClubById,
    listClubs,
    searchClubs,
    // 暴露视觉常量
    guardianIcon: GUARDIAN_ICON,
    guardianColor: GUARDIAN_COLOR,
    guardianName: GUARDIAN_NAME,
  };
});
