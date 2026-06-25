<script setup lang="ts">
/**
 * ConfettiCanvas —— 古风撒花 / 金色粒子动画组件
 *
 * 设计要点：
 *  - 使用新版 Canvas 2D API（<canvas type="2d">），跨端兼容 H5/小程序/App
 *  - 性能优化：粒子数 40（低端机友好），requestAnimationFrame 驱动
 *  - 默认颜色 GamDen 古风金 + 生机绿
 *  - 通过 v-model:visible 双向控制显示
 *
 * 依赖：composables/useConfetti.ts
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useConfetti, type ConfettiOptions } from '@/composables/useConfetti';

const props = withDefaults(
  defineProps<{
    /** 是否可见（true 时启动动画，false 时停止） */
    visible: boolean;
    /** 动画持续时间（ms） */
    duration?: number;
    /** 粒子数 */
    particleCount?: number;
    /** 调色板 */
    colors?: string[];
    /** 粒子尺寸范围 */
    sizeRange?: [number, number];
  }>(),
  {
    duration: 2000,
    particleCount: 40,
    colors: () => ['#C9A87C', '#D8BE95', '#F5DCAE', '#5A8F6C', '#7AA06E'],
    sizeRange: () => [6, 14] as [number, number],
  },
);

const emit = defineEmits<{
  /** 动画结束 */
  (e: 'finished'): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const confetti = useConfetti();

/**
 * 启动/停止动画
 */
function applyVisible(visible: boolean): void {
  if (visible) {
    startAnimation();
  } else {
    confetti.stop();
  }
}

/**
 * 从 canvas 实例直接获取 2D context（绕开 selectorQuery.exec 的类型问题）
 */
function getCanvas2D(
  canvas: HTMLCanvasElement,
): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  // 优先取 canvas 自身尺寸；fallback 用 viewport
  const sys =
    typeof uni !== 'undefined' && typeof uni.getSystemInfoSync === 'function'
      ? uni.getSystemInfoSync()
      : null;
  const fallbackW = sys?.windowWidth ?? 375;
  const fallbackH = sys?.windowHeight ?? 667;
  const rect =
    typeof canvas.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : null;
  const width = rect?.width || canvas.width || fallbackW;
  const height = rect?.height || canvas.height || fallbackH;

  // dpr 适配（H5 / APP-PLUS 有效）
  const dpr =
    (typeof window !== 'undefined'
      ? (window as unknown as { devicePixelRatio?: number }).devicePixelRatio
      : 1) ?? 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

/**
 * 启动动画（通过 Vue ref 拿到 canvas DOM）
 */
function startAnimation(): void {
  const canvas = canvasRef.value as HTMLCanvasElement | null | undefined;
  if (!canvas) {
    // 节点未挂载，等下一帧再试
    nextTick(() => tryLaunch());
    return;
  }
  tryLaunch();

  function tryLaunch(): void {
    const node = canvasRef.value as HTMLCanvasElement | null;
    if (!node) {
      // 兜底：使用 selectorQuery（运行时接收 (res, err)，但 TS 期望 (result)）
      runSelectorFallback();
      return;
    }
    const result = getCanvas2D(node);
    if (!result) return;
    const opts: ConfettiOptions = {
      duration: props.duration,
      particleCount: props.particleCount,
      colors: props.colors,
      sizeRange: props.sizeRange,
    };
    confetti.start(result.ctx, result.width, result.height, opts);
    setTimeout(() => emit('finished'), props.duration);
  }
}

/**
 * 兜底：用 selectorQuery 拿 canvas 节点（兼容未通过 ref 暴露的场景）
 * - 使用 (query as any) 绕开项目里 uni .exec() 类型签名不一致的问题
 */
function runSelectorFallback(): void {
  try {
    const query = uni.createSelectorQuery();
    // #ifdef MP-WEIXIN || H5
    (query as any)
      .select('#confetti-canvas')
      .fields({ node: true, size: true })
      .exec((res: any) => {
        handleSelectorResult(res);
      });
    // #endif
    // #ifdef APP-PLUS
    setTimeout(() => {
      const q2 = uni.createSelectorQuery();
      (q2 as any)
        .select('#confetti-canvas')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          handleSelectorResult(res);
        });
    }, 50);
    // #endif
  } catch (e) {
    console.warn('[ConfettiCanvas] selectorQuery fallback 失败:', e);
  }
}

function handleSelectorResult(rawRes: unknown): void {
  const res = rawRes as Array<{
    node?: HTMLCanvasElement;
    width?: number;
    height?: number;
  }>;
  const field = res?.[0];
  if (!field?.node) {
    console.warn('[ConfettiCanvas] selectorQuery 未能取得 canvas 节点');
    return;
  }
  const result = getCanvas2D(field.node);
  if (!result) return;
  const opts: ConfettiOptions = {
    duration: props.duration,
    particleCount: props.particleCount,
    colors: props.colors,
    sizeRange: props.sizeRange,
  };
  confetti.start(result.ctx, result.width, result.height, opts);
  setTimeout(() => emit('finished'), props.duration);
}

watch(
  () => props.visible,
  (v) => applyVisible(v),
  { immediate: false },
);

onMounted(() => {
  if (props.visible) startAnimation();
});

onUnmounted(() => {
  confetti.stop();
});
</script>

<template>
  <view v-if="visible" class="confetti-wrap" :style="{ pointerEvents: 'none' }">
    <canvas
      id="confetti-canvas"
      ref="canvasRef"
      type="2d"
      class="confetti-canvas"
    />
  </view>
</template>

<style lang="scss" scoped>
.confetti-wrap {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
}
.confetti-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
