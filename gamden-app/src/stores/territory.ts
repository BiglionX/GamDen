import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Territory, NeighborNode, MapViewport } from '@/types/territory';
import { territoryApi } from '@/utils/territory-api';

const DEFAULT_RANGE = 10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const DEFAULT_CELL_SIZE = 64;

/**
 * 领地地图状态管理
 * - 当前用户领地（中心）
 * - 邻居列表
 * - 视口参数（缩放 / 中心 / 半径）
 * - 加载 / 错误状态
 */
export const useTerritoryStore = defineStore('territory', () => {
  // ---- 状态 ----

  /** 我的领地 */
  const mine = ref<Territory | null>(null);

  /** 邻居列表（不含自己） */
  const neighbors = ref<NeighborNode[]>([]);

  /** 视口 */
  const viewport = ref<MapViewport>({
    centerX: 0,
    centerY: 0,
    range: DEFAULT_RANGE,
    scale: 1,
    cellSize: DEFAULT_CELL_SIZE,
  });

  /** 加载状态 */
  const loading = ref(false);

  /** 最后一次错误 */
  const error = ref<string | null>(null);

  // ---- 计算 ----

  /** 当前地图上显示的所有节点（自己 + 邻居） */
  const allNodes = computed<NeighborNode[]>(() => {
    const list: NeighborNode[] = [];
    if (mine.value) {
      list.push({
        ...mine.value,
        isOwn: true,
        gameTags: [],
      });
    }
    list.push(...neighbors.value);
    return list;
  });

  const scale = computed({
    get: () => viewport.value.scale,
    set: (v: number) => {
      viewport.value.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));
    },
  });

  // ---- 动作 ----

  /**
   * 初始化：加载我的领地 + 邻居
   * - 游客态：跳过我的领地，只加载模拟邻居
   * - 注册态：先 GET /territories/me 拿自己的坐标，再拉邻居
   */
  async function loadAll(isGuest: boolean): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      if (!isGuest) {
        const mineData = await territoryApi.getMyTerritory();
        mine.value = mineData;
        viewport.value.centerX = mineData.coordX;
        viewport.value.centerY = mineData.coordY;
      }
      const list = await territoryApi.getNeighbors(
        viewport.value.centerX,
        viewport.value.centerY,
        viewport.value.range,
      );
      neighbors.value = list;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '领地数据加载失败';
      // 失败时使用 mock 数据兜底（开发体验）
      if (neighbors.value.length === 0) {
        neighbors.value = getMockNeighbors();
      }
    } finally {
      loading.value = false;
    }
  }

  /** 重新拉取（用于下拉刷新） */
  async function refresh(isGuest: boolean): Promise<void> {
    await loadAll(isGuest);
  }

  /** 缩放控制 */
  function zoomIn(): void {
    scale.value = Math.min(scale.value + 0.25, MAX_SCALE);
  }

  function zoomOut(): void {
    scale.value = Math.max(scale.value - 0.25, MIN_SCALE);
  }

  function setScale(v: number): void {
    scale.value = v;
  }

  /** 重置视图：以我的领地为视口中心 */
  function resetViewport(): void {
    if (mine.value) {
      viewport.value.centerX = mine.value.coordX;
      viewport.value.centerY = mine.value.coordY;
    }
    viewport.value.scale = 1;
  }

  // ---- Mock 兜底（API 不可用时） ----

  function getMockNeighbors(): NeighborNode[] {
    return [
      { id: 't1', userId: 'u1', nickname: '暗夜猎人',     coordX: -2, coordY:  1, level: 2, exp: 120, guardianType: 'mechanical', invitedCount: 1, isOwn: false, gameTags: ['原神', '艾尔登法环'] },
      { id: 't2', userId: 'u2', nickname: '月下老人',     coordX:  3, coordY: -1, level: 3, exp: 380, guardianType: 'elf',       invitedCount: 4, isOwn: false, gameTags: ['原神', '崩坏3'] },
      { id: 't3', userId: 'u3', nickname: '星轨观察者',   coordX: -1, coordY: -3, level: 1, exp:  30, guardianType: 'astrologer', invitedCount: 0, isOwn: false, gameTags: ['星轨'] },
      { id: 't4', userId: 'u4', nickname: '永夜远征军',   coordX:  4, coordY:  4, level: 4, exp: 520, guardianType: 'mechanical', invitedCount: 7, isOwn: false, gameTags: ['黑神话悟空'] },
      { id: 't5', userId: 'u5', nickname: '桃林隐士',     coordX: -4, coordY:  2, level: 2, exp: 200, guardianType: 'elf',       invitedCount: 2, isOwn: false, gameTags: ['原神', '塞尔达'] },
    ];
  }

  return {
    // state
    mine,
    neighbors,
    viewport,
    loading,
    error,
    // getters
    allNodes,
    scale,
    // actions
    loadAll,
    refresh,
    zoomIn,
    zoomOut,
    setScale,
    resetViewport,
  };
});
