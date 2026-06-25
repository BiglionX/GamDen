<script setup lang="ts">
/**
 * HelpCenterSheet —— 教程与帮助底部弹窗
 *
 * 用途：在"我的小程序"中心页每个状态视图底部固定显示
 * 触发：点击后从底部弹出半屏面板（bottom-sheet）
 *
 * 内容（3 个 Tab）：
 *  1. 📖 教程：从后端 API（GET /mini-program/tutorials）拉取，无数据时显示内置静态 fallback
 *  2. ❓ 常见问题：5 条静态 FAQ，支持展开 / 折叠
 *  3. 💬 联系客服：多端处理（H5 复制微信号 / APP openURL / MP-WEIXIN button open-type="contact"）
 *
 * 设计要点：
 *  - 入口按钮内嵌在组件内，父级仅需 <HelpCenterSheet /> 一行
 *  - sheet 动画：mask 淡入 + sheet 底部上推
 *  - 教程点击跳转：H5 window.open / APP plus.runtime.openURL / MP 复制链接
 */
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserMiniProgramStore } from '@/stores/user-mini-program';
import type { TutorialItem } from '@/types/mini-program';
import { track, TrackEvent } from '@/utils/track';

/* ======================== Props ======================== */

interface Props {
  /** 是否在底部显示入口按钮（默认 true） */
  showEntry?: boolean;
  /** V1.0 客服微信号（用于 H5 / APP fallback） */
  customerServiceWechat?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showEntry: true,
  customerServiceWechat: 'gamden-cs',
});

/* ======================== Store ======================== */

const store = useUserMiniProgramStore();
const { tutorials } = storeToRefs(store);

/* ======================== State ======================== */

type TabKey = 'tutorial' | 'faq' | 'service';
const currentTab = ref<TabKey>('tutorial');
const sheetVisible = ref(false);
const expandedFaq = ref<string | null>(null);

/* ======================== 内置静态 Fallback 教程 ======================== */

interface StaticTutorial extends TutorialItem {
  /** 步骤化内容（fallback 用，API 无数据时显示） */
  steps?: string[];
}

const STATIC_TUTORIALS: StaticTutorial[] = [
  {
    id: 'static-register',
    title: '1. 如何注册微信小程序账号',
    type: 'article',
    url: 'https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN',
    summary: '前往微信公众平台，选择"小程序"类型完成注册',
    steps: [
      '打开微信公众平台 mp.weixin.qq.com',
      '点击右上角"立即注册"',
      '选择账号类型：小程序',
      '填写邮箱（未被微信注册过）、密码、验证码',
      '激活邮箱后进入主体信息登记',
    ],
  },
  {
    id: 'static-verify',
    title: '2. 如何完成微信认证',
    type: 'article',
    url: 'https://mp.weixin.qq.com/',
    summary: '个人 30 元 / 年，企业 300 元 / 年，微信扫码支付',
    steps: [
      '登录微信公众平台 → 设置 → 微信认证',
      '选择认证类型（个人 / 企业）',
      '个人：身份证正反面 + 微信扫码验证',
      '企业：营业执照 + 对公账户打款验证（1-3 个工作日）',
      '支付认证费用，等待微信审核',
    ],
  },
  {
    id: 'static-appid',
    title: '3. 如何获取 AppID',
    type: 'article',
    url: 'https://mp.weixin.qq.com/',
    summary: '开发管理 → 开发设置 → 复制 AppID 与 AppSecret',
    steps: [
      '登录微信公众平台后台',
      '左侧菜单：开发 → 开发管理',
      '顶部 Tab：开发设置',
      '找到"开发者ID"区域',
      '复制 AppID（wx 开头的 18 位字符串）',
      '生成并复制 AppSecret（32 位字符串）',
    ],
  },
  {
    id: 'static-review',
    title: '4. 如何提交代码审核',
    type: 'article',
    url: 'https://mp.weixin.qq.com/',
    summary: '由平台代为提交，无需你手动操作（认证通过后）',
    steps: [
      '完成 AppID 提交后，平台会在后台为你提交代码',
      '状态进入"代码审核中"（1-7 个工作日）',
      '你可以在中心页查看审核进度',
      '审核期间你也可以预览体验版（如有）',
    ],
  },
  {
    id: 'static-publish',
    title: '5. 如何发布上线',
    type: 'article',
    url: 'https://mp.weixin.qq.com/',
    summary: '审核通过后平台自动发布，你可以在中心页查看小程序码',
    steps: [
      '微信审核通过后，平台会收到回调',
      '状态自动更新为"已上线"',
      '前往"我的小程序"中心页查看小程序码',
      '长按二维码保存到相册，分享给好友',
    ],
  },
];

/* ======================== 内置 FAQ ======================== */

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'fee',
    question: '费用是多少？',
    answer:
      '由微信公众平台收取，与个人 / 企业类型相关：个人 30 元 / 年，企业或个体工商户 300 元 / 年。这笔费用支付给微信，不归 GamDen 平台。',
  },
  {
    id: 'duration',
    question: '需要多久？',
    answer:
      '完整流程约 3-15 个工作日：微信认证审核 1-3 天，代码审核 1-7 天。期间你可以在 GamDen 继续邀请好友、扩大领地。',
  },
  {
    id: 'purpose',
    question: '小程序有什么用？',
    answer:
      '你的专属小程序是领地 + 邀请的移动端入口，包含你的领地缩略图、邀请进度、下载 App 引导。可分享给微信好友，扩大你的巢友网络。',
  },
  {
    id: 'why-appid',
    question: '为什么需要 AppID？',
    answer:
      'AppID 是微信分配给你小程序的唯一标识，平台需要用它来提交代码、配置服务器域名、获取小程序码。GamDen 不会存储或外泄你的 AppSecret。',
  },
  {
    id: 'rename',
    question: '可以改名字吗？',
    answer:
      '小程序名称每年可修改 5 次（个人主体 2 次 / 年）。修改入口在微信公众平台 → 设置 → 基本信息。注意：名称修改不会影响你的 AppID。',
  },
];

/* ======================== Computed ======================== */

/**
 * 教程列表：优先使用 API 数据，为空时回退到内置静态内容
 * - 用 !tutorials.value || .length === 0 判断无数据
 */
const displayTutorials = computed<StaticTutorial[]>(() => {
  if (tutorials.value && tutorials.value.length > 0) {
    // API 数据优先：若没有 steps 字段则补全（防御性 fallback）
    return tutorials.value.map((t) => ({
      ...t,
      steps: (t as StaticTutorial).steps,
    }));
  }
  return STATIC_TUTORIALS;
});

/* ======================== 弹窗控制 ======================== */

function openSheet(tab: TabKey = 'tutorial'): void {
  currentTab.value = tab;
  sheetVisible.value = true;
  // 拉取最新教程（store 内部有缓存）
  void store.fetchTutorials();
  // 埋点：mp_guide_viewed（打开教程与帮助 sheet）
  track(TrackEvent.MpGuideViewed, { guide_type: tab });
}

function closeSheet(): void {
  sheetVisible.value = false;
}

defineExpose({
  openSheet,
  closeSheet,
});

function switchTab(tab: TabKey): void {
  currentTab.value = tab;
}

/* ======================== 教程点击：跨端打开 ======================== */

function openTutorial(t: StaticTutorial): void {
  const url = t.url;
  if (!url) {
    uni.showToast({ title: '教程链接暂未配置', icon: 'none' });
    return;
  }
  // #ifdef H5
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
  // #endif
  // #ifdef APP-PLUS
  plus.runtime.openURL(
    url,
    () => uni.showToast({ title: '打开失败', icon: 'none' }),
  );
  // #endif
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: url,
    success: () =>
      uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' }),
  });
  // #endif
}

/* ======================== FAQ 折叠 ======================== */

function toggleFaq(id: string): void {
  expandedFaq.value = expandedFaq.value === id ? null : id;
}

/* ======================== 客服入口：多端处理 ======================== */

function handleContactService(): void {
  // 埋点：mp_help_clicked（用户点击联系客服）
  track(TrackEvent.MpHelpClicked);
  // #ifdef MP-WEIXIN
  // 小程序端：使用 open-type="contact" 按钮（由父模板渲染），这里无需处理
  // #endif
  // #ifdef H5
  uni.setClipboardData({
    data: props.customerServiceWechat,
    success: () =>
      uni.showToast({
        title: `已复制客服微信：${props.customerServiceWechat}`,
        icon: 'none',
      }),
  });
  // #endif
  // #ifdef APP-PLUS
  // 尝试拉起微信（如果安装了）
  plus.runtime.openURL(
    `weixin://`,
    () => {
      uni.showModal({
        title: '联系客服',
        content: `请添加客服微信：${props.customerServiceWechat}`,
        confirmText: '已复制',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            uni.setClipboardData({
              data: props.customerServiceWechat,
              success: () =>
                uni.showToast({
                  title: '已复制客服微信',
                  icon: 'success',
                }),
            });
          }
        },
      });
    },
  );
  // #endif
}
</script>

<template>
  <!-- 底部固定入口按钮 -->
  <view v-if="showEntry" class="hcs-entry-wrap">
    <view
      class="hcs-entry"
      hover-class="hcs-entry--hover"
      @tap="openSheet('tutorial')"
    >
      <text class="hcs-entry__icon">
        💬
      </text>
      <text class="hcs-entry__text">
        教程与帮助
      </text>
    </view>
  </view>

  <!-- 遮罩 + 半屏 sheet -->
  <view v-if="sheetVisible" class="hcs-mask" @tap="closeSheet">
    <view class="hcs-sheet" @tap.stop>
      <!-- 顶部拖拽条 + 关闭 -->
      <view class="hcs-sheet__handle">
        <view class="hcs-sheet__bar" />
      </view>
      <view class="hcs-sheet__header">
        <text class="hcs-sheet__title">
          教程与帮助
        </text>
        <view
          class="hcs-sheet__close"
          hover-class="hcs-sheet__close--hover"
          @tap="closeSheet"
        >
          <text>×</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="hcs-tabs">
        <view
          v-for="t in [
            { key: 'tutorial', label: '📖 教程', count: displayTutorials.length },
            { key: 'faq', label: '❓ 常见问题', count: FAQS.length },
            { key: 'service', label: '💬 联系客服', count: 0 },
          ]"
          :key="t.key"
          class="hcs-tab"
          :class="{ 'hcs-tab--active': currentTab === t.key }"
          hover-class="hcs-tab--hover"
          @tap="switchTab(t.key as TabKey)"
        >
          <text>{{ t.label }}</text>
          <text v-if="t.count > 0" class="hcs-tab__count">
            {{ t.count }}
          </text>
        </view>
      </view>

      <!-- 内容区 -->
      <scroll-view
        scroll-y
        class="hcs-scroll"
        :enhanced="true"
        :show-scrollbar="false"
      >
        <!-- ===== 教程 Tab ===== -->
        <view v-if="currentTab === 'tutorial'" class="hcs-content">
          <view
            v-for="t in displayTutorials"
            :key="t.id"
            class="hcs-tutorial"
            hover-class="hcs-tutorial--hover"
            @tap="openTutorial(t)"
          >
            <view class="hcs-tutorial__head">
              <text class="hcs-tutorial__icon">
                {{ t.type === 'video' ? '🎬' : '📄' }}
              </text>
              <view class="hcs-tutorial__body">
                <text class="hcs-tutorial__title">
                  {{ t.title }}
                </text>
                <text class="hcs-tutorial__summary">
                  {{ t.summary }}
                </text>
              </view>
              <text class="hcs-tutorial__arrow">
                ›
              </text>
            </view>
            <!-- 步骤化内容（fallback 静态教程有，API 教程可能没有） -->
            <view v-if="t.steps && t.steps.length > 0" class="hcs-tutorial__steps">
              <view
                v-for="(step, idx) in t.steps"
                :key="idx"
                class="hcs-step"
              >
                <text class="hcs-step__num">
                  {{ idx + 1 }}
                </text>
                <text class="hcs-step__text">
                  {{ step }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== FAQ Tab ===== -->
        <view v-else-if="currentTab === 'faq'" class="hcs-content">
          <view
            v-for="f in FAQS"
            :key="f.id"
            class="hcs-faq"
            :class="{ 'hcs-faq--expanded': expandedFaq === f.id }"
            @tap="toggleFaq(f.id)"
          >
            <view class="hcs-faq__head">
              <text class="hcs-faq__q">
                ❓ {{ f.question }}
              </text>
              <text class="hcs-faq__toggle">
                {{ expandedFaq === f.id ? '−' : '+' }}
              </text>
            </view>
            <view v-if="expandedFaq === f.id" class="hcs-faq__body">
              <text class="hcs-faq__a">
                {{ f.answer }}
              </text>
            </view>
          </view>
        </view>

        <!-- ===== 客服 Tab ===== -->
        <view v-else class="hcs-content">
          <view class="hcs-service">
            <view class="hcs-service__icon">
              <text>🎧</text>
            </view>
            <text class="hcs-service__title">
              遇到问题？联系客服
            </text>
            <text class="hcs-service__desc">
              我们将在工作日 30 分钟内回复你。
            </text>
            <text class="hcs-service__wechat">
              客服微信：{{ customerServiceWechat }}
            </text>

            <!-- H5 / APP：按钮触发 handleContactService -->
            <!-- #ifndef MP-WEIXIN -->
            <view
              class="hcs-service__btn"
              hover-class="hcs-service__btn--hover"
              @tap="handleContactService"
            >
              <text>💬 联系客服</text>
            </view>
            <!-- #endif -->

            <!-- MP-WEIXIN：使用 button open-type="contact" 唤起微信客服 -->
            <!-- #ifdef MP-WEIXIN -->
            <button
              class="hcs-service__btn hcs-service__btn--mp"
              open-type="contact"
              hover-class="hcs-service__btn--hover"
            >
              💬 唤起微信客服
            </button>
            <!-- #endif -->
          </view>

          <view class="hcs-service__tip">
            <text class="hcs-service__tip-line">
              💡 客服工作时间：周一至周五 10:00-19:00
            </text>
            <text class="hcs-service__tip-line">
              非工作时间请留言，我们会在上班后第一时间回复。
            </text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* ======================== 底部入口按钮 ======================== */
.hcs-entry-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24rpx;
  z-index: 90;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.hcs-entry {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: rgba(30, 36, 31, 0.92);
  border: 1rpx solid rgba(201, 168, 124, 0.4);
  color: #c9a87c;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8rpx);
  transition: all 0.15s ease;
  &--hover {
    transform: scale(0.97);
    opacity: 0.9;
  }
  &__icon { font-size: 28rpx; }
  &__text { letter-spacing: 1rpx; }
}

/* ======================== 遮罩 ======================== */
.hcs-mask {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(15, 20, 16, 0.78);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: hcs-mask-in 0.25s ease-out;
}

/* ======================== 半屏 Sheet ======================== */
.hcs-sheet {
  width: 100%;
  max-width: 750rpx;
  max-height: 85vh;
  background: linear-gradient(180deg, #2a3128 0%, #1e241f 100%);
  border-top: 2rpx solid #c9a87c;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  display: flex;
  flex-direction: column;
  animation: hcs-sheet-in 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  padding-bottom: env(safe-area-inset-bottom, 0);

  &__handle {
    display: flex;
    justify-content: center;
    padding: 16rpx 0 8rpx;
  }
  &__bar {
    width: 80rpx;
    height: 8rpx;
    border-radius: 4rpx;
    background: rgba(201, 168, 124, 0.4);
  }
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 32rpx 16rpx;
  }
  &__title {
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
  }
  &__close {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.15);
    color: #c9a87c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36rpx;
    line-height: 1;
    transition: all 0.15s ease;
    &--hover { opacity: 0.7; }
  }
}

/* ======================== Tab 切换 ======================== */
.hcs-tabs {
  display: flex;
  gap: 12rpx;
  padding: 0 24rpx 16rpx;
  border-bottom: 1rpx solid rgba(201, 168, 124, 0.15);
}
.hcs-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(0, 0, 0, 0.2);
  color: #a89e85;
  font-size: 26rpx;
  font-weight: 600;
  border: 1rpx solid transparent;
  transition: all 0.2s ease;
  &--active {
    background: linear-gradient(135deg, rgba(201, 168, 124, 0.2) 0%, rgba(201, 168, 124, 0.08) 100%);
    border-color: #c9a87c;
    color: #f5dcae;
  }
  &--hover {
    transform: scale(0.98);
    opacity: 0.85;
  }
  &__count {
    background: rgba(201, 168, 124, 0.25);
    color: #c9a87c;
    font-size: 20rpx;
    padding: 2rpx 12rpx;
    border-radius: 12rpx;
    min-width: 32rpx;
    text-align: center;
  }
}

/* ======================== 滚动容器 ======================== */
.hcs-scroll {
  flex: 1;
  min-height: 0;
  padding: 24rpx 24rpx 40rpx;
}

.hcs-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ======================== 教程项 ======================== */
.hcs-tutorial {
  background: rgba(0, 0, 0, 0.2);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 16rpx;
  padding: 24rpx 24rpx 20rpx;
  transition: all 0.15s ease;
  &--hover {
    background: rgba(201, 168, 124, 0.08);
    border-color: rgba(201, 168, 124, 0.4);
  }
  &__head {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  &__icon {
    font-size: 40rpx;
    line-height: 1;
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    background: rgba(201, 168, 124, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__body { flex: 1; min-width: 0; }
  &__title {
    display: block;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 4rpx;
  }
  &__summary {
    display: block;
    color: #a89e85;
    font-size: 22rpx;
    line-height: 1.5;
  }
  &__arrow {
    color: #c9a87c;
    font-size: 36rpx;
    line-height: 1;
  }
  &__steps {
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx dashed rgba(201, 168, 124, 0.15);
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }
}

.hcs-step {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  &__num {
    flex-shrink: 0;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.2);
    color: #c9a87c;
    font-size: 22rpx;
    font-weight: 700;
    line-height: 36rpx;
    text-align: center;
  }
  &__text {
    flex: 1;
    color: #f5f0e6;
    font-size: 24rpx;
    line-height: 1.6;
  }
}

/* ======================== FAQ ======================== */
.hcs-faq {
  background: rgba(0, 0, 0, 0.2);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 16rpx;
  overflow: hidden;
  transition: all 0.2s ease;
  &--expanded {
    border-color: rgba(201, 168, 124, 0.4);
  }
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 24rpx;
  }
  &__q {
    flex: 1;
    color: #f5dcae;
    font-size: 28rpx;
    font-weight: 600;
    line-height: 1.5;
  }
  &__toggle {
    color: #c9a87c;
    font-size: 40rpx;
    line-height: 1;
    width: 48rpx;
    text-align: center;
  }
  &__body {
    padding: 0 24rpx 24rpx;
  }
  &__a {
    display: block;
    color: #f5f0e6;
    font-size: 26rpx;
    line-height: 1.7;
    padding: 16rpx 20rpx;
    background: rgba(201, 168, 124, 0.06);
    border-radius: 12rpx;
  }
}

/* ======================== 客服 ======================== */
.hcs-service {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40rpx 24rpx;
  background: rgba(0, 0, 0, 0.2);
  border: 1rpx solid rgba(201, 168, 124, 0.2);
  border-radius: 16rpx;
  &__icon {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    background: rgba(201, 168, 124, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }
  &__title {
    color: #f5dcae;
    font-size: 32rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }
  &__desc {
    color: #a89e85;
    font-size: 24rpx;
    line-height: 1.6;
    margin-bottom: 12rpx;
  }
  &__wechat {
    color: #c9a87c;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 32rpx;
    padding: 8rpx 24rpx;
    background: rgba(201, 168, 124, 0.1);
    border-radius: 24rpx;
  }
  &__btn {
    width: 100%;
    max-width: 480rpx;
    height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, #c9a87c 0%, #b8975f 100%);
    color: #1e241f;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(201, 168, 124, 0.35);
    transition: all 0.15s ease;
    /* 清除 button 默认样式 */
    border: none;
    margin: 0;
    padding: 0;
    line-height: 88rpx;
    &--mp {
      /* MP 端 button 需重置一些默认样式 */
      &::after { border: none; }
    }
    &--hover {
      transform: scale(0.98);
      opacity: 0.92;
    }
  }
  &__tip {
    margin-top: 24rpx;
    padding: 16rpx 24rpx;
    background: rgba(241, 196, 15, 0.08);
    border: 1rpx solid rgba(241, 196, 15, 0.2);
    border-radius: 12rpx;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  &__tip-line {
    color: #a89e85;
    font-size: 22rpx;
    line-height: 1.6;
    text-align: center;
  }
}

/* ======================== 动画 ======================== */
@keyframes hcs-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes hcs-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
