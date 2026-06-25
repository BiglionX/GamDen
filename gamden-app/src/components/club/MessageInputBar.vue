<script setup lang="ts">
/**
 * MessageInputBar - 聊天输入栏
 * ----------------------------------------------------------------------
 * 组成：
 *   [输入框]            [表情按钮] [更多按钮]
 *   [表情面板：分类切换 + 表情网格 + 搜索]
 *
 * Props:
 *   - modelValue  输入文本（v-model）
 *   - placeholder
 *   - disabled    是否禁用（游客态）
 *   - sending     是否发送中
 *
 * Emits:
 *   - update:modelValue
 *   - send       触发文本发送
 *   - emoji      触发表情发送（emoji char）
 */
import { computed, ref } from 'vue';
import { EMOJI_CATEGORIES, searchEmoji, type EmojiCategory } from '@/utils/emoji';

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  /** 是否展示图片按钮（私聊场景） */
  showImage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '说点什么...',
  disabled: false,
  sending: false,
  showImage: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'send', text: string): void;
  (e: 'emoji', char: string, index?: number): void;
  (e: 'image'): void;
}>();

const emojiPanelOpen = ref(false);
const activeCategory = ref<string>(EMOJI_CATEGORIES[0].id);
const emojiKeyword = ref('');

const visibleCategory = computed<EmojiCategory | null>(() => {
  return EMOJI_CATEGORIES.find((c) => c.id === activeCategory.value) ?? null;
});

const searchedEmojis = computed(() => {
  if (!emojiKeyword.value.trim()) return [];
  return searchEmoji(emojiKeyword.value, 48);
});

function handleInput(e: unknown) {
  // 兼容 uniapp 的 e.detail.value 与 h5 的 e.target.value
  let value = '';
  if (typeof e === 'object' && e !== null) {
    const anyE = e as Record<string, unknown>;
    const detail = anyE.detail as { value?: unknown } | undefined;
    if (detail && typeof detail.value === 'string') {
      value = detail.value;
    } else {
      const target = anyE.target as { value?: unknown } | undefined;
      if (target && typeof target.value === 'string') {
        value = target.value;
      }
    }
  }
  emit('update:modelValue', value);
}

function handleSend() {
  const text = props.modelValue.trim();
  if (!text || props.sending) return;
  emit('send', text);
  emit('update:modelValue', '');
  emojiPanelOpen.value = false;
}

function toggleEmojiPanel() {
  emojiPanelOpen.value = !emojiPanelOpen.value;
}

function pickCategory(id: string) {
  activeCategory.value = id;
  emojiKeyword.value = '';
}

function pickEmoji(char: string, index?: number) {
  emit('emoji', char, index);
}

function handleImage() {
  emit('image');
}

function handleMore() {
  // 默认更多按钮走图片（如果有 showImage）或 ActionSheet（俱乐部群聊场景）
  if (props.showImage) {
    emit('image');
    return;
  }
  // 预留：图片 / 语音 / 文件
  uni.showActionSheet({
    itemList: ['图片（开发中）', '语音（开发中）', '文件（开发中）'],
    success: () => {
      uni.showToast({ title: '功能开发中', icon: 'none' });
    },
  });
}

function handleFocus() {
  emojiPanelOpen.value = false;
}
</script>

<template>
  <view class="input-bar">
    <view class="input-bar__row">
      <!-- 文本输入 -->
      <textarea
        class="input-bar__textarea"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="500"
        auto-height
        :show-confirm-bar="false"
        @input="handleInput"
        @focus="handleFocus"
        @confirm="handleSend"
      />

      <!-- 表情按钮 -->
      <view
        class="input-bar__icon-btn"
        :class="{ 'input-bar__icon-btn--active': emojiPanelOpen }"
        @tap="toggleEmojiPanel"
      >
        <text>😊</text>
      </view>

      <!-- 图片按钮（仅私聊场景） -->
      <view
        v-if="showImage && !modelValue.trim()"
        class="input-bar__icon-btn"
        @tap="handleImage"
      >
        <text>🖼️</text>
      </view>

      <!-- 发送按钮 / 更多按钮 -->
      <view v-if="modelValue.trim()" class="input-bar__send-btn" @tap="handleSend">
        <text>{{ sending ? '...' : '发送' }}</text>
      </view>
      <view v-else class="input-bar__icon-btn" @tap="handleMore">
        <text>＋</text>
      </view>
    </view>

    <!-- 表情面板 -->
    <view v-if="emojiPanelOpen" class="emoji-panel">
      <!-- 搜索 -->
      <view class="emoji-panel__search">
        <input
          v-model="emojiKeyword"
          class="emoji-panel__search-input"
          placeholder="搜索表情"
          placeholder-class="emoji-panel__search-placeholder"
          :maxlength="20"
        />
      </view>

      <!-- 搜索结果 -->
      <scroll-view
        v-if="emojiKeyword.trim()"
        scroll-y="true"
        class="emoji-panel__grid-scroll"
      >
        <view class="emoji-panel__grid">
          <view
            v-for="(e, idx) in searchedEmojis"
            :key="`s_${e.char}_${idx}`"
            class="emoji-panel__item"
            @tap="pickEmoji(e.char)"
          >
            <text class="emoji-panel__emoji">
              {{ e.char }}
            </text>
            <text class="emoji-panel__name">
              {{ e.name }}
            </text>
          </view>
          <view v-if="searchedEmojis.length === 0" class="emoji-panel__empty">
            <text>无匹配表情</text>
          </view>
        </view>
      </scroll-view>

      <!-- 分类列表 -->
      <template v-else-if="visibleCategory">
        <view class="emoji-panel__grid-scroll-wrap">
          <scroll-view scroll-y="true" class="emoji-panel__grid-scroll">
            <view class="emoji-panel__grid">
              <view
                v-for="e in visibleCategory.emojis"
                :key="e.char"
                class="emoji-panel__item"
                @tap="pickEmoji(e.char)"
              >
                <text class="emoji-panel__emoji">
                  {{ e.char }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 分类切换 tab -->
        <view class="emoji-panel__tabs">
          <view
            v-for="c in EMOJI_CATEGORIES"
            :key="c.id"
            class="emoji-panel__tab"
            :class="{ 'emoji-panel__tab--active': c.id === activeCategory }"
            @tap="pickCategory(c.id)"
          >
            <text>{{ c.icon }}</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.input-bar {
  background: linear-gradient(180deg, #262d27 0%, #1e241f 100%);
  border-top: 1rpx solid rgba(201, 168, 124, 0.3);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));

  &__row {
    display: flex;
    align-items: flex-end;
    gap: 16rpx;
  }

  &__textarea {
    flex: 1;
    min-height: 64rpx;
    max-height: 200rpx;
    background: rgba(0, 0, 0, 0.3);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    color: $u-main-color;
    font-size: 28rpx;
    line-height: 1.5;
  }

  &__icon-btn {
    width: 72rpx;
    height: 72rpx;
    flex-shrink: 0;
    border-radius: 16rpx;
    background: rgba(201, 168, 124, 0.1);
    border: 1rpx solid rgba(201, 168, 124, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: $u-main-color;
    font-size: 36rpx;
    &:active {
      background: rgba(201, 168, 124, 0.25);
      transform: scale(0.95);
    }
    &--active {
      background: rgba(201, 168, 124, 0.3);
      border-color: #C9A87C;
    }
  }

  &__send-btn {
    flex-shrink: 0;
    height: 72rpx;
    padding: 0 28rpx;
    border-radius: 16rpx;
    background: linear-gradient(135deg, #C9A87C 0%, #A8895F 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(201, 168, 124, 0.4);
    text {
      color: #1E241F;
      font-size: 28rpx;
      font-weight: 600;
      letter-spacing: 2rpx;
    }
    &:active {
      transform: scale(0.95);
    }
  }
}

.emoji-panel {
  margin-top: 16rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16rpx;
  padding: 16rpx;

  &__search {
    margin-bottom: 12rpx;
  }
  &__search-input {
    background: rgba(38, 45, 39, 0.8);
    border: 1rpx solid rgba(201, 168, 124, 0.25);
    border-radius: 10rpx;
    padding: 12rpx 20rpx;
    color: $u-main-color;
    font-size: 24rpx;
  }
  &__search-placeholder {
    color: $u-tips-color;
  }

  &__grid-scroll-wrap {
    display: flex;
    flex-direction: column;
    height: 360rpx;
  }
  &__grid-scroll {
    flex: 1;
    height: 360rpx;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8rpx;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12rpx 4rpx;
    border-radius: 8rpx;
    &:active { background: rgba(201, 168, 124, 0.2); }
  }

  &__emoji {
    font-size: 44rpx;
    line-height: 1;
  }

  &__name {
    font-size: 18rpx;
    color: $u-tips-color;
    margin-top: 4rpx;
  }

  &__empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40rpx 0;
    color: $u-tips-color;
    font-size: 24rpx;
  }

  &__tabs {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 12rpx 0 4rpx;
    margin-top: 8rpx;
    border-top: 1rpx solid rgba(201, 168, 124, 0.2);
  }

  &__tab {
    flex: 1;
    text-align: center;
    padding: 8rpx 0;
    font-size: 32rpx;
    opacity: 0.5;
    &:active { opacity: 0.8; }
    &--active {
      opacity: 1;
      position: relative;
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background: #C9A87C;
        border-radius: 2rpx;
      }
    }
  }
}
</style>
