<script setup lang="ts">
/**
 * ClubMemberList - 群成员列表面板
 * ----------------------------------------------------------------------
 * 设计为右侧抽屉（从右滑入），覆盖聊天区右半部分：
 *   - 顶部搜索框（按昵称筛选）
 *   - 群主 / 管理员 / 普通成员分组
 *   - 每个成员：头像 + 昵称 + 角色徽章 + 守护灵图标 + 在线状态
 *
 * Props:
 *   - visible   是否可见
 *   - members   成员列表
 *   - loading   是否加载中
 *
 * Emits:
 *   - close     关闭面板
 *   - select    点击成员（@提及）
 */
import { computed, ref } from 'vue';
import type { ClubMember } from '@/types/club';
import {
  GUARDIAN_COLOR,
  GUARDIAN_ICON,
  GUARDIAN_NAME,
} from '@/utils/im-custom-msg';

interface Props {
  visible: boolean;
  members: ClubMember[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', member: ClubMember): void;
  (e: 'private-chat', member: ClubMember): void;
}>();

const keyword = ref('');

// 分组
const grouped = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const filtered = props.members.filter((m) =>
    !kw || m.nickname.toLowerCase().includes(kw),
  );
  const owner = filtered.filter((m) => m.role === 1);
  const admin = filtered.filter((m) => m.role === 2);
  const normal = filtered.filter((m) => m.role === 3);
  return [
    { id: 'owner', label: '群主', items: owner, color: '#C9A87C' },
    { id: 'admin', label: '管理员', items: admin, color: '#9B8AC4' },
    { id: 'normal', label: '巢友', items: normal, color: '#7AA06E' },
  ].filter((g) => g.items.length > 0);
});

function handleClose() {
  emit('close');
}

function handleSelect(m: ClubMember) {
  emit('select', m);
}

function handlePrivateChat(m: ClubMember) {
  emit('private-chat', m);
}

function getGuardianIcon(m: ClubMember): string {
  return m.guardianType ? GUARDIAN_ICON[m.guardianType] : '';
}
function getGuardianColor(m: ClubMember): string {
  return m.guardianType ? GUARDIAN_COLOR[m.guardianType] : '#8a7f63';
}
function getGuardianName(m: ClubMember): string {
  return m.guardianType ? GUARDIAN_NAME[m.guardianType] : '';
}

/** 是否可以对当前用户发起私聊（不能和自己私聊） */
function canPrivateChat(m: ClubMember): boolean {
  // 借助 userStore 排除自己（外部传入或读 store；这里通过角色 + UI 习惯展示）
  // V1.0: 直接展示给所有成员（自己私聊时 store 端会拦截）
  return true;
}

function handleMaskClick() {
  handleClose();
}
</script>

<template>
  <view v-if="visible" class="member-panel-mask" @tap="handleMaskClick">
    <view class="member-panel" @tap.stop>
      <!-- 顶部 -->
      <view class="member-panel__header">
        <text class="member-panel__title">
          群成员 · {{ members.length }}
        </text>
        <view class="member-panel__close" @tap="handleClose">
          <text>✕</text>
        </view>
      </view>

      <!-- 搜索 -->
      <view class="member-panel__search">
        <input
          v-model="keyword"
          class="member-panel__search-input"
          placeholder="搜索巢友昵称"
          placeholder-class="member-panel__search-placeholder"
          :maxlength="20"
          confirm-type="search"
        />
      </view>

      <!-- 加载态 -->
      <view v-if="loading" class="member-panel__loading">
        <text>加载中...</text>
      </view>

      <!-- 分组列表 -->
      <scroll-view
        v-else
        scroll-y="true"
        class="member-panel__scroll"
        :show-scrollbar="true"
      >
        <view v-for="group in grouped" :key="group.id" class="member-panel__group">
          <view class="member-panel__group-header" :style="{ borderLeftColor: group.color }">
            <text class="member-panel__group-label">
              {{ group.label }}
            </text>
            <text class="member-panel__group-count">
              {{ group.items.length }}
            </text>
          </view>
          <view
            v-for="m in group.items"
            :key="m.userID"
            class="member-panel__item"
          >
            <view class="member-panel__item-main" @tap="handleSelect(m)">
              <view class="member-panel__avatar">
                <text>{{ m.avatar }}</text>
                <view v-if="m.online" class="member-panel__online-dot" />
              </view>
              <view class="member-panel__meta">
                <view class="member-panel__name-row">
                  <text class="member-panel__name">
                    {{ m.nickname }}
                  </text>
                  <text v-if="m.role === 1" class="member-panel__role-tag member-panel__role-tag--owner">
                    群主
                  </text>
                  <text v-else-if="m.role === 2" class="member-panel__role-tag member-panel__role-tag--admin">
                    管理
                  </text>
                </view>
                <view v-if="m.guardianType" class="member-panel__guardian-row">
                  <text
                    class="member-panel__guardian-icon"
                    :style="{ color: getGuardianColor(m) }"
                  >
                    {{ getGuardianIcon(m) }}
                  </text>
                  <text class="member-panel__guardian-name">
                    {{ getGuardianName(m) }}守护
                  </text>
                </view>
              </view>
              <text v-if="!m.online" class="member-panel__offline">
                离线
              </text>
            </view>
            <!-- 私聊按钮 -->
            <view
              v-if="canPrivateChat(m)"
              class="member-panel__dm-btn"
              @tap.stop="handlePrivateChat(m)"
            >
              <text class="member-panel__dm-icon">
                💬
              </text>
              <text class="member-panel__dm-text">
                私聊
              </text>
            </view>
          </view>
        </view>

        <view v-if="grouped.length === 0" class="member-panel__empty">
          <text>无匹配巢友</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.member-panel-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 7000;
  display: flex;
  justify-content: flex-end;
  animation: mask-in 0.25s ease-out;
}

.member-panel {
  width: 78%;
  max-width: 600rpx;
  height: 100%;
  background: linear-gradient(180deg, #1E241F 0%, #161A15 100%);
  // 巢穴暗纹
  background-image:
    radial-gradient(circle at 20% 20%, rgba(201, 168, 124, 0.06) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 80%, rgba(201, 168, 124, 0.06) 1rpx, transparent 1rpx);
  background-size: 48rpx 48rpx;
  display: flex;
  flex-direction: column;
  box-shadow: -8rpx 0 32rpx rgba(0, 0, 0, 0.6);
  animation: panel-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx 32rpx 24rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.25);
  }
  &__title {
    font-size: 34rpx;
    font-weight: 600;
    color: $u-main-color;
    letter-spacing: 2rpx;
  }
  &__close {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: $u-main-color;
    font-size: 28rpx;
    &:active { background: rgba(201, 168, 124, 0.3); }
  }

  &__search {
    padding: 20rpx 32rpx;
  }
  &__search-input {
    background: rgba(38, 45, 39, 0.8);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    padding: 16rpx 24rpx;
    color: $u-main-color;
    font-size: 26rpx;
  }
  &__search-placeholder {
    color: $u-tips-color;
  }

  &__loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $u-tips-color;
    font-size: 26rpx;
  }

  &__scroll {
    flex: 1;
    padding: 0 32rpx 64rpx;
  }

  &__group {
    margin-bottom: 24rpx;
  }
  &__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0 12rpx;
    border-left-width: 6rpx;
    border-left-style: solid;
    padding-left: 16rpx;
    margin-bottom: 8rpx;
  }
  &__group-label {
    font-size: 24rpx;
    color: $u-main-color;
    font-weight: 600;
    letter-spacing: 2rpx;
  }
  &__group-count {
    font-size: 22rpx;
    color: $u-tips-color;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 20rpx 8rpx;
    border-radius: 12rpx;
    border-bottom: 1rpx solid rgba(201, 168, 124, 0.08);
  }
  &__item-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 20rpx;
    &:active { opacity: 0.7; }
  }
  &__dm-btn {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rpx;
    padding: 12rpx 16rpx;
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.18), rgba(201, 168, 124, 0.08));
    border: 1rpx solid rgba(201, 168, 124, 0.4);
    border-radius: 16rpx;
    transition: transform 0.15s;
    &:active {
      transform: scale(0.95);
      background: linear-gradient(135deg, rgba(201, 168, 124, 0.3), rgba(201, 168, 124, 0.15));
    }
  }
  &__dm-icon {
    font-size: 26rpx;
    line-height: 1;
  }
  &__dm-text {
    font-size: 18rpx;
    color: #c9a87c;
    font-weight: 600;
    letter-spacing: 1rpx;
  }
  &__avatar {
    position: relative;
    width: 80rpx;
    height: 80rpx;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    border: 2rpx solid rgba(201, 168, 124, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    text {
      font-size: 44rpx;
    }
  }
  &__online-dot {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background: #5A8F6C;
    border: 2rpx solid #1E241F;
  }
  &__meta {
    flex: 1;
    min-width: 0;
  }
  &__name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 4rpx;
  }
  &__name {
    font-size: 28rpx;
    color: $u-main-color;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 280rpx;
  }
  &__role-tag {
    font-size: 18rpx;
    padding: 2rpx 10rpx;
    border-radius: 8rpx;
    &--owner {
      background: linear-gradient(135deg, #C9A87C, #A8895F);
      color: #1E241F;
    }
    &--admin {
      background: linear-gradient(135deg, #9B8AC4, #7B6BA4);
      color: #1E241F;
    }
  }
  &__guardian-row {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }
  &__guardian-icon {
    font-size: 22rpx;
  }
  &__guardian-name {
    font-size: 22rpx;
    color: $u-tips-color;
  }
  &__offline {
    font-size: 20rpx;
    color: $u-tips-color;
    opacity: 0.6;
  }

  &__empty {
    text-align: center;
    padding: 80rpx 0;
    color: $u-tips-color;
    font-size: 26rpx;
  }
}

@keyframes mask-in {
  from { background: rgba(0, 0, 0, 0); }
  to { background: rgba(0, 0, 0, 0.5); }
}
@keyframes panel-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
