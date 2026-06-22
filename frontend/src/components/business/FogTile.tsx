import React from 'react';

interface FogTileProps {
  size: number;
  hasBeast?: boolean;
  intensity?: number;
  className?: string;
}

/**
 * 迷雾格 - 暗色叠加 + 边缘微光
 * V2.0 野兽玩法预留视觉钩子
 */
export const FogTile: React.FC<FogTileProps> = ({
  size,
  hasBeast = false,
  intensity = 1,
  className = '',
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at center, rgba(22, 27, 23, ${
          0.85 * intensity
        }) 0%, rgba(30, 36, 31, ${0.95 * intensity}) 100%)`,
      }}
      aria-label={hasBeast ? '野兽出没' : '未探索'}
    >
      {/* 网格线 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201, 168, 124, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201, 168, 124, 0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%',
        }}
      />
      {/* 野兽微光提示 */}
      {hasBeast && (
        <div
          className="absolute inset-0 animate-pulse-soft pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(192, 57, 43, 0.3) 0%, transparent 70%)',
          }}
        />
      )}
      {/* 边缘微光 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 4px rgba(201, 168, 124, 0.08)',
        }}
      />
    </div>
  );
};