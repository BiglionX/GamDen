<script setup lang="ts">
/**
 * 会话列表（pages/im/messages）
 * ----------------------------------------------------------------------
 * 核心：从 OpenIM SDK 拉取真实会话列表（含单聊 + 群聊），UI 重点展示单聊：
 *   - 单聊：会话项样式（头像 + 昵称 + 最近消息 + 未读 + 时间）
 *   - 群聊（俱乐部）：单独分组，UI 与单聊区分
 *   - 点击进入对应聊天窗口
 *
 * 数据源：openim-uniapp-polyfill getAllConversationList
 * 实时性：订阅 onConversationChanged 自动刷新
 */
import { computed, ref, watchEffect } from 'vue';
import { onShow, onPullDownRefresh, onUnload } from '@dcloudio/uni-app';
import { useImStore } from '@/stores/im';
import {
  ensureSingleChatConversation,
  formatLatestMsg,
  formatLatestTime,
} from '@/utils/im-single-chat';
import { IM_EVENTS } from '@/utils/im-config';
import im from '@/utils/im';
import type { ConversationListItem } from '@/types/im';
import { useUserStore } from '@/stores/user';

const imStore = useImStore();
const userStore = useUserStore();

/** 单聊会话项 */
type SingleConv = ConversationListItem;
/** 群聊会话项（最小所需字段） */
type GroupConv = {
  conversationID: string;
  userID: string;
  showName: string;
  faceURL: string;
  unreadCount: number;
  latestMsg: string;
  latestMsgSendTime: number;
  sessionType: 2;
  isPinned: boolean;
};

// =========================================================
// State
// =========================================================
const conversations = ref<SingleConv[]>([]);
const groupConversations = ref<GroupConv[]>([]);
const loading = ref(false);
const filterMode = ref<'all' | 'single' | 'group'>('all');

// =========================================================
// Computed
// =========================================================
const connectionLabel = computed(() => {
  switch (imStore.connectionStatus) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中...';
    case 'kickedOffline':
      return '被踢下线';
    case 'tokenExpired':
      return 'Token 过期';
    default:
      return '未连接';
  }
});

const connectionColor = computed(() => {
  switch (imStore.connectionStatus) {
    case 'connected':
      return '#67c23a';
    case 'connecting':
      return '#e6a23c';
    case 'kickedOffline':
    case 'tokenExpired':
      return '#f56c6c';
    default:
      return '#909399';
  }
});

/** 视图层展示的会话（统一类型，便于模板遍历） */
interface DisplayConv {
  conversationID: string;
  userID: string;
  showName: string;
  faceURL: string;
  unreadCount: number;
  latestMsg: string;
  latestMsgSendTime: number;
  sessionType: 1 | 2;
  isPinned: boolean;
}

const visibleConversations = computed<DisplayConv[]>(() => {
  const list: DisplayConv[] = [];
  if (filterMode.value === 'all' || filterMode.value === 'single') {
    conversations.value.forEach((c) =>
      list.push({ ...c, sessionType: 1 as const, isPinned: !!c.isPinned }),
    );
  }
  if (filterMode.value === 'all' || filterMode.value === 'group') {
    groupConversations.value.forEach((c) => list.push({ ...c }));
  }
  return list;
});

const totalUnread = computed(() => imStore.unreadDisplay || '0');

// =========================================================
// Lifecycle
// =========================================================
onShow(async () => {
  if (userStore.isGuest) {
    conversations.value = [];
    groupConversations.value = [];
    return;
  }
  await loadConversations();
});

onUnload(() => {
  unsubscribeEvents();
});

// 下拉刷新
onPullDownRefresh(async () => {
  await loadConversations();
  uni.stopPullDownRefresh();
});

// IM 就绪后启动订阅 + 拉数据
watchEffect(() => {
  if (imStore.isIMReady) {
    subscribeEvents();
    loadConversations().catch(() => {});
  } else {
    unsubscribeEvents();
  }
});

// =========================================================
// 数据加载
// =========================================================
async function loadConversations() {
  if (userStore.isGuest) return;
  if (!imStore.isIMReady) {
    return;
  }
  loading.value = true;
  try {
    const list = await im.getConversationList();
    const single: SingleConv[] = [];
    const group: GroupConv[] = [];
    for (const c of list) {
      const isSingle = Number(c.conversationType ?? c.sessionType) === 1;
      const common = {
        conversationID: c.conversationID,
        userID: c.userID || '',
        showName: c.showName || c.userID || '未知巢友',
        faceURL: c.faceURL || '',
        unreadCount: Number(c.unreadCount || 0),
        latestMsg: formatLatestMsg(c.latestMsg, c.contentType),
        latestMsgSendTime: Number(c.latestMsgSendTime || 0),
        isPinned: !!c.isPinned,
      };
      if (isSingle) {
        single.push({ ...common, sessionType: 1 as const });
      } else {
        group.push({ ...common, sessionType: 2 as const });
      }
    }
    // 排序：置顶 → 时间倒序
    const sortByPinnedTime = <T extends { latestMsgSendTime: number; isPinned?: boolean }>(
      a: T,
      b: T,
    ) => {
      const ap = !!a.isPinned;
      const bp = !!b.isPinned;
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return b.latestMsgSendTime - a.latestMsgSendTime;
    };
    conversations.value = single.sort(sortByPinnedTime);
    groupConversations.value = group.sort(sortByPinnedTime);

    // 同步刷新总未读
    await imStore.refreshUnreadCount();
  } catch (e) {
    console.error('[messages] loadConversations 失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 切换过滤器 */
function setFilter(mode: 'all' | 'single' | 'group') {
  filterMode.value = mode;
}

// =========================================================
// 事件订阅
// =========================================================
let unsubConv: (() => void) | null = null;

function subscribeEvents() {
  unsubscribeEvents();
  const onChange = () => {
    loadConversations().catch(() => {});
  };
  unsubConv = im.on(IM_EVENTS.CONVERSATION_CHANGED, onChange);
}

function unsubscribeEvents() {
  if (unsubConv) {
    unsubConv();
    unsubConv = null;
  }
}

// =========================================================
// Actions
// =========================================================
async function enterConversation(conv: DisplayConv) {
  if (conv.sessionType === 1) {
    // 单聊 → 跳单聊页
    if (userStore.isGuest) {
      uni.showModal({
        title: '入驻巢穴',
        content: '私聊功能需要先入驻巢穴，是否前往？',
        confirmText: '去入驻',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/auth/login' });
          }
        },
      });
      return;
    }

    const peer = await ensureSingleChatConversation({
      userID: conv.userID,
      nickname: conv.showName,
      avatar: conv.faceURL || '🛖',
      conversationID: conv.conversationID,
    });

    uni.navigateTo({
      url: '/pages/im/chat',
      query: {
        userID: peer.userID,
        nickname: encodeURIComponent(peer.nickname),
        avatar: encodeURIComponent(peer.avatar),
        conversationID: peer.conversationID,
        guardianType: peer.guardianType || '',
      },
    });
  } else {
    // 群聊 → 跳俱乐部详情（保留原行为）
    uni.navigateTo({
      url: `/pages/club/detail?id=${encodeURIComponent(conv.userID)}`,
    });
  }
}

/** 跳登录 */
function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' });
}
</script>

<template>
  <view class="page-messages">
    <!-- 顶部状态栏 -->
    <view class="status-bar">
      <view class="status-bar__item">
        <text class="status-bar__label">IM 状态</text>
        <view class="status-bar__value">
          <view class="dot" :style="{ backgroundColor: connectionColor }" />
          <text>{{ connectionLabel }}</text>
        </view>
      </view>
      <view class="status-bar__item">
        <text class="status-bar__label">未读消息</text>
        <text class="status-bar__value">{{ totalUnread }}</text>
      </view>
      <view class="status-bar__item">
        <text class="status-bar__label">会话</text>
        <text class="status-bar__value">{{ conversations.length + groupConversations.length }}</text>
      </view>
    </view>

    <!-- 过滤 tab -->
    <view class="filter-bar">
      <view
        v-for="f in [
          { id: 'all', label: '全部' },
          { id: 'single', label: '私聊' },
          { id: 'group', label: '群聊' },
        ]"
        :key="f.id"
        class="filter-bar__tab"
        :class="{ 'filter-bar__tab--active': filterMode === f.id }"
        @tap="setFilter(f.id as 'all' | 'single' | 'group')"
      >
        <text>{{ f.label }}</text>
      </view>
    </view>

    <!-- 游客态 -->
    <view v-if="userStore.isGuest" class="empty-card" @tap="goLogin">
      <text class="empty-card__icon">💌</text>
      <text class="empty-card__title">入驻巢穴，开启私聊</text>
      <text class="empty-card__desc">私聊、俱乐部消息、守护灵通知都在这里</text>
      <view class="empty-card__btn">
        <text>立即入驻</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading && conversations.length === 0 && groupConversations.length === 0" class="loading">
      <text>加载中...</text>
    </view>

    <!-- IM 未就绪 -->
    <view v-else-if="!imStore.isIMReady" class="empty-tip">
      <text>{{ imStore.connectionStatus === 'connecting' ? '连接中...' : 'IM 未连接' }}</text>
    </view>

    <!-- 会话列表 -->
    <view v-else class="conv-list">
      <view
        v-for="conv in visibleConversations"
        :key="conv.conversationID"
        class="conv-item"
        @tap="enterConversation(conv)"
      >
        <view class="conv-item__avatar">
          <text>{{ conv.faceURL || (conv.sessionType === 1 ? '🛖' : '🏯') }}</text>
        </view>
        <view class="conv-item__body">
          <view class="conv-item__top">
            <text class="conv-item__name">{{ conv.showName }}</text>
            <text class="conv-item__time">{{ formatLatestTime(conv.latestMsgSendTime) }}</text>
          </view>
          <view class="conv-item__bottom">
            <text class="conv-item__last">{{ conv.latestMsg || '暂无消息' }}</text>
            <text v-if="conv.unreadCount > 0" class="conv-item__badge">
              {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="visibleConversations.length === 0" class="empty-tip">
        <text>{{ filterMode === 'single' ? '还没有私聊会话' : (filterMode === 'group' ? '还没有群聊会话' : '暂无会话') }}</text>
        <text class="empty-tip__sub">到地图点击邻居或在俱乐部成员头像上私聊吧～</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-messages {
  min-height: 100vh;
  background: $u-bg-color;
  padding: 24rpx 24rpx 64rpx;
}

.status-bar {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  display: flex;
  justify-content: space-around;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }
  &__label {
    font-size: 22rpx;
    color: $u-tips-color;
  }
  &__value {
    font-size: 26rpx;
    color: $u-main-color;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  display: inline-block;
}

.filter-bar {
  display: flex;
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;

  &__tab {
    flex: 1;
    text-align: center;
    padding: 14rpx 0;
    font-size: 26rpx;
    color: $u-tips-color;
    border-radius: 10rpx;
    transition: background 0.15s;
    &:active { background: rgba(201, 168, 124, 0.1); }
    &--active {
      background: linear-gradient(135deg, #c9a87c 0%, #a8895f 100%);
      color: #1e241f;
      font-weight: 600;
    }
  }
}

.conv-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.conv-item {
  background: $u-bg-color-light;
  border: 1rpx solid $u-border-color;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  gap: 24rpx;
  align-items: center;
  transition: transform 0.15s;

  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    text {
      font-size: 44rpx;
    }
  }
  &__body {
    flex: 1;
    min-width: 0;
  }
  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }
  &__name {
    font-size: 30rpx;
    color: $u-main-color;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  &__time {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.7;
    flex-shrink: 0;
  }
  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
  }
  &__last {
    font-size: 26rpx;
    color: $u-content-color;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  &__badge {
    flex-shrink: 0;
    background: $u-error;
    color: #fff;
    font-size: 20rpx;
    border-radius: 20rpx;
    padding: 4rpx 12rpx;
    min-width: 32rpx;
    text-align: center;
    line-height: 1.4;
  }

  &:active {
    transform: scale(0.98);
    background: rgba(201, 168, 124, 0.06);
  }
}

.empty-tip {
  text-align: center;
  padding: 80rpx 32rpx;
  color: $u-tips-color;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  &__sub {
    font-size: 22rpx;
    opacity: 0.7;
    letter-spacing: 1rpx;
  }
}

.empty-card {
  background: linear-gradient(135deg, rgba(201, 168, 124, 0.15) 0%, rgba(201, 168, 124, 0.05) 100%);
  border: 2rpx dashed $u-primary;
  border-radius: 20rpx;
  padding: 64rpx 32rpx;
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;

  &__icon { font-size: 64rpx; }
  &__title { font-size: 32rpx; color: $u-primary; font-weight: 600; }
  &__desc { font-size: 24rpx; color: $u-tips-color; text-align: center; }
  &__btn {
    margin-top: 16rpx;
    padding: 14rpx 48rpx;
    background: linear-gradient(135deg, $u-primary 0%, $u-primary-dark 100%);
    color: $u-bg-color;
    border-radius: 36rpx;
    font-size: 26rpx;
    font-weight: 600;
  }
  &:active {
    transform: scale(0.98);
  }
}

.loading {
  text-align: center;
  padding: 80rpx 0;
  color: $u-tips-color;
  font-size: 26rpx;
}
</style>