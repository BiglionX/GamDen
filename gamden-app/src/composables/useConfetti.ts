/**
 * Canvas 撒花/粒子动画 Composable
 *
 * 设计目标：
 *  - 低端机友好：粒子数 40（可在调用处覆盖），重力物理简单
 *  - requestAnimationFrame 驱动，组件卸载时自动清理
 *  - 支持自定义颜色集（默认 GamDen 古风金 + 生机绿）
 *  - 暴露 start/stop/clear 三个方法，供组件绑定到 canvas 实例
 *
 * 使用方式（在 Vue 组件中）：
 *   const canvasRef = ref<UniNamespace.CanvasContext | null>(null);
 *   const confetti = useConfetti();
 *   onMounted(() => confetti.start(canvasRef.value!, { duration: 2000 }));
 *   onUnmounted(() => confetti.stop());
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'petal';
  opacity: number;
}

export interface ConfettiOptions {
  /** 动画持续时间（ms），默认 2000 */
  duration?: number;
  /** 粒子总数，默认 40（低端机友好） */
  particleCount?: number;
  /** 调色板，默认 GamDen 金 + 生机绿 */
  colors?: string[];
  /** 粒子尺寸范围（px），默认 [6, 14] */
  sizeRange?: [number, number];
}

const DEFAULT_COLORS = ['#C9A87C', '#D8BE95', '#F5DCAE', '#5A8F6C', '#7AA06E'];

/**
 * 创建 Confetti 控制器
 */
export function useConfetti() {
  let rafId: number | null = null;
  let particles: Particle[] = [];
  let startTime = 0;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let options: Required<ConfettiOptions> = {
    duration: 2000,
    particleCount: 40,
    colors: DEFAULT_COLORS,
    sizeRange: [6, 14],
  };

  /**
   * 生成初始粒子（从顶部中央呈扇形向上喷射）
   */
  function spawnParticles(): void {
    particles = [];
    const cx = canvasWidth / 2;
    const cy = -20; // 从屏幕上方外侧开始
    for (let i = 0; i < options.particleCount; i++) {
      // 扇形角度：-135° ~ -45°（向上喷射）
      const angle = (-Math.PI * 3) / 4 + (Math.random() * Math.PI) / 2;
      // 初速度：6 ~ 14（按 canvas 宽度归一化）
      const speed = (6 + Math.random() * 8) * (canvasWidth / 375);
      const size =
        options.sizeRange[0] +
        Math.random() * (options.sizeRange[1] - options.sizeRange[0]);

      particles.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + Math.random() * 40,
        vx: Math.cos(angle) * speed * 0.6,
        vy: Math.sin(angle) * speed,
        size,
        color: options.colors[Math.floor(Math.random() * options.colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: (['circle', 'square', 'petal'] as const)[
          Math.floor(Math.random() * 3)
        ],
        opacity: 1,
      });
    }
  }

  /**
   * 单帧绘制
   */
  function draw(): void {
    if (!canvasCtx) return;
    canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const gravity = 0.25 * (canvasWidth / 375); // 适配不同屏幕
    const drag = 0.992;
    const fadeStart = options.duration * 0.7; // 后 30% 时间淡出

    const elapsed = performance.now() - startTime;
    const fadeProgress = Math.max(
      0,
      (elapsed - fadeStart) / (options.duration - fadeStart),
    );

    for (const p of particles) {
      // 物理更新
      p.vy += gravity;
      p.vx *= drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - fadeProgress);

      // 绘制
      canvasCtx.save();
      canvasCtx.globalAlpha = p.opacity;
      canvasCtx.translate(p.x, p.y);
      canvasCtx.rotate(p.rotation);
      canvasCtx.fillStyle = p.color;

      if (p.shape === 'circle') {
        canvasCtx.beginPath();
        canvasCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        canvasCtx.fill();
      } else if (p.shape === 'square') {
        canvasCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        // petal：椭圆
        canvasCtx.beginPath();
        canvasCtx.ellipse(0, 0, p.size / 2, p.size / 3, 0, 0, Math.PI * 2);
        canvasCtx.fill();
      }

      canvasCtx.restore();
    }
  }

  /**
   * 启动动画
   * @param canvas  Canvas 2D context（通过 uni.createCanvasContext 获取）
   * @param width   Canvas 宽度（px）
   * @param height  Canvas 高度（px）
   * @param opts    配置项
   */
  function start(
    canvas: CanvasRenderingContext2D,
    width: number,
    height: number,
    opts: ConfettiOptions = {},
  ): void {
    stop();
    canvasCtx = canvas;
    canvasWidth = width;
    canvasHeight = height;
    options = {
      duration: opts.duration ?? 2000,
      particleCount: opts.particleCount ?? 40,
      colors: opts.colors ?? DEFAULT_COLORS,
      sizeRange: opts.sizeRange ?? [6, 14],
    };

    spawnParticles();
    startTime = performance.now();
    const loop = (): void => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= options.duration) {
        stop();
        return;
      }
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  /**
   * 停止动画
   */
  function stop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  return { start, stop };
}
