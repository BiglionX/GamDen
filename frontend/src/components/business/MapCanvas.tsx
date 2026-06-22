import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TerritoryNode } from './TerritoryNode';
import { FogTile } from './FogTile';
import { NeighborPopover, NeighborInfo } from './NeighborPopover';

export interface MapTerritory {
  id: string | number;
  user_id?: number;
  level: number;
  nickname: string;
  guardian_type?: string;
  coord_x: number;
  coord_y: number;
  is_self?: boolean;
}

interface MapCanvasProps {
  selfCoord: { x: number; y: number };
  neighbors: MapTerritory[];
  viewRange?: number; // 显示范围（格子半径）
  cellSize?: number;
  className?: string;
  onGreetNeighbor?: (neighbor: NeighborInfo) => void;
}

/**
 * 2D 网格地图主组件
 * - 用户领地居中
 * - 邻居显示为节点
 * - 无人区迷雾覆盖
 * - 支持：缩放（Ctrl+滚轮或按钮）、平移（拖拽）、点击弹出
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
  selfCoord,
  neighbors,
  viewRange = 6,
  cellSize = 56,
  className = '',
  onGreetNeighbor,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNeighbor, setSelectedNeighbor] = useState<NeighborInfo | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.2, 2));
  }, []);
  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.2, 0.5));
  }, []);
  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // 鼠标拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-territory-node]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 滚轮缩放（按住 Ctrl）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((s) => Math.max(0.5, Math.min(2, s + delta)));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // 网格尺寸
  const gridSize = viewRange * 2 + 1;
  const canvasSize = gridSize * cellSize;

  // 计算邻居在画布上的位置（基于相对坐标）
  const renderNeighbor = (t: MapTerritory) => {
    const dx = t.coord_x - selfCoord.x;
    const dy = t.coord_y - selfCoord.y;
    if (Math.abs(dx) > viewRange || Math.abs(dy) > viewRange) return null;
    const x = (dx + viewRange) * cellSize + cellSize / 2;
    const y = (dy + viewRange) * cellSize + cellSize / 2;
    return { x, y, t };
  };

  // 选中邻居
  const handleSelectNeighbor = (
    t: MapTerritory,
    pos: { x: number; y: number }
  ) => {
    setSelectedNeighbor({
      user_id: t.user_id ?? Number(t.id),
      nickname: t.nickname,
      level: t.level,
      guardian_type: t.guardian_type || 'unknown',
      signature: '',
      territory_coord_x: t.coord_x,
      territory_coord_y: t.coord_y,
    });
    setSelectedPos(pos);
  };

  return (
    <div
      ref={containerRef}
      className={[
        'relative w-full overflow-hidden rounded-nest-md',
        'bg-brand-ink-deep border border-brand-gold-deep/40',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      ].join(' ')}
      style={{
        height: 'calc(100vh - 240px)',
        minHeight: 420,
        touchAction: 'none',
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(42, 50, 43, 0.5), rgba(22, 27, 23, 0.95))',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 地图装饰背景 */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 40%, rgba(201, 168, 124, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(90, 143, 108, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* 画布层（可缩放/平移） */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <div
          className="relative"
          style={{ width: canvasSize, height: canvasSize }}
        >
          {/* 网格 + 迷雾 */}
          {Array.from({ length: gridSize }).map((_, row) =>
            Array.from({ length: gridSize }).map((__, col) => {
              const x = col * cellSize;
              const y = row * cellSize;
              return (
                <div
                  key={`grid-${row}-${col}`}
                  className="absolute"
                  style={{ left: x, top: y }}
                >
                  <FogTile size={cellSize} />
                </div>
              );
            })
          )}

          {/* 邻居领地 */}
          {neighbors.map((t) => {
            const rendered = renderNeighbor(t);
            if (!rendered) return null;
            return (
              <div
                key={t.id}
                data-territory-node
                className="absolute"
                style={{
                  left: rendered.x,
                  top: rendered.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <TerritoryNode
                  id={t.id}
                  level={t.level}
                  nickname={t.nickname}
                  guardianType={t.guardian_type}
                  isSelf={t.is_self}
                  size={cellSize * 0.7}
                  onClick={() =>
                    handleSelectNeighbor(t, { x: rendered.x, y: rendered.y })
                  }
                />
              </div>
            );
          })}

          {/* 自己领地 - 始终居中 */}
          <div
            data-territory-node
            className="absolute"
            style={{
              left: viewRange * cellSize + cellSize / 2,
              top: viewRange * cellSize + cellSize / 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <TerritoryNode
              id="self"
              level={neighbors.find((n) => n.is_self)?.level || 1}
              nickname="我的巢穴"
              guardianType={neighbors.find((n) => n.is_self)?.guardian_type}
              isSelf
              size={cellSize * 0.85}
            />
          </div>
        </div>
      </div>

      {/* 邻居弹出卡 */}
      {selectedNeighbor && selectedPos && containerRef.current && (
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${selectedPos.x * scale + offset.x - viewRange * cellSize - cellSize / 2
              }px), calc(-50% + ${selectedPos.y * scale + offset.y - viewRange * cellSize - cellSize / 2
              }px))`,
          }}
        >
          <NeighborPopover
            neighbor={selectedNeighbor}
            onClose={() => {
              setSelectedNeighbor(null);
              setSelectedPos(null);
            }}
            onGreet={() => {
              onGreetNeighbor?.(selectedNeighbor);
            }}
          />
        </div>
      )}

      {/* 控制按钮 */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-nest-sm bg-brand-ink-raised/90 text-brand-gold border border-brand-gold-deep/40 hover:bg-brand-ink-raised hover:border-brand-gold transition-all shadow-nest-card backdrop-blur-sm"
          aria-label="放大"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-nest-sm bg-brand-ink-raised/90 text-brand-gold border border-brand-gold-deep/40 hover:bg-brand-ink-raised hover:border-brand-gold transition-all shadow-nest-card backdrop-blur-sm"
          aria-label="缩小"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-9 h-9 rounded-nest-sm bg-brand-ink-raised/90 text-brand-paper-mute border border-brand-gold-deep/40 hover:bg-brand-ink-raised hover:text-brand-paper transition-all shadow-nest-card backdrop-blur-sm text-xs"
          aria-label="重置"
        >
          ⌂
        </button>
      </div>

      {/* 比例尺 */}
      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-nest-sm bg-brand-ink-raised/80 backdrop-blur-sm border border-brand-gold-deep/30 text-xs text-brand-paper-mute font-mono">
        {Math.round(scale * 100)}%
      </div>

      {/* 缩放提示 */}
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-nest-sm bg-brand-ink-raised/80 backdrop-blur-sm border border-brand-gold-deep/30 text-xs text-brand-mute">
        Ctrl + 滚轮缩放 · 拖拽平移
      </div>
    </div>
  );
};