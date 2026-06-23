<script setup lang="ts">
import { computed } from 'vue';
import type { NeighborNode } from '@/types/territory';
import { TERRITORY_VISUALS } from '@/types/territory';

interface Props {
  node: NeighborNode;
  /** 节点中心 X 坐标（相对地图中心，已叠加 viewport.centerX） */
  centerX: number;
  /** 节点中心 Y 坐标 */
  centerY: number;
  /** 单格像素尺寸（来自 viewport.cellSize） */
  cellSize: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'tap', node: NeighborNode): void;
}>();

const visual = computed(() => TERRITORY_VISUALS[props.node.level]);

const style = computed(() => {
  const dx = (props.node.coordX - props.centerX) * props.cellSize;
  const dy = (props.node.coordY - props.centerY) * props.cellSize;
  return {
    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
    width: `${visual.value.size}px`,
    height: `${visual.value.size}px`,
    backgroundColor: visual.value.bgColor,
    borderColor: visual.value.borderColor,
  };
});

function handleTap() {
  emit('tap', props.node);
}
</script>

<template>
  <view
    class="t-node"
    :class="{
      't-node--own': node.isOwn,
      't-node--pulse': visual.pulse && !node.isOwn,
    }"
    :style="style"
    @tap="handleTap"
  >
    <text class="t-node__emoji">{{ visual.emoji }}</text>
    <text v-if="node.isOwn" class="t-node__label">我的领地</text>
    <text v-else class="t-node__level">Lv.{{ node.level }}</text>
  </view>
</template>

<style lang="scss" scoped>
.t-node {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-width: 2rpx;
  border-style: solid;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.18s ease;
  user-select: none;
  box-shadow: 0 0 16rpx rgba(0, 0, 0, 0.4);

  &__emoji { font-size: 36rpx; line-height: 1; }
  &__label {
    font-size: 18rpx;
    color: #1e241f;
    margin-top: 2rpx;
    font-weight: 600;
  }
  &__level {
    font-size: 16rpx;
    color: #c9a87c;
    margin-top: 2rpx;
  }

  &--own {
    background: radial-gradient(circle, #d8be95 0%, #c9a87c 100%) !important;
    box-shadow:
      0 0 24rpx rgba(201, 168, 124, 0.6),
      inset 0 0 12rpx rgba(245, 240, 230, 0.3);
    animation: t-pulse 2.4s ease-in-out infinite;
  }

  &--pulse {
    animation: t-pulse 2.4s ease-in-out infinite;
  }

  &:active {
    transform: scale(1.12);
  }
}

@keyframes t-pulse {
  0%, 100% {
    box-shadow: 0 0 16rpx rgba(201, 168, 124, 0.4);
  }
  50% {
    box-shadow: 0 0 32rpx rgba(201, 168, 124, 0.85);
  }
}
</style>
