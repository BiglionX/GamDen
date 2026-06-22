import React from 'react';

interface TerritoryIconProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 像素风格领地图标 - 根据等级显示不同复杂度
 * V1.0 简化方案：使用像素块组合呈现
 */
export const TerritoryIcon: React.FC<TerritoryIconProps> = ({
  level,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-base',
  };

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 80,
  };

  // 用 SVG 绘制像素风格的领地小屋（根据等级增加细节）
  const renderIcon = () => {
    const px = sizePx[size];
    const cells = level >= 4 ? 5 : level >= 2 ? 4 : 3;
    const cellSize = px / cells;
    const houseColor = '#C9A87C';
    const roofColor = '#A8865E';
    const doorColor = '#5A8F6C';

    const elements: React.ReactNode[] = [];

    // 屋顶（顶层）
    for (let r = 0; r < Math.floor(cells / 2); r++) {
      for (let c = r; c < cells - r; c++) {
        elements.push(
          <rect
            key={`roof-${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill={roofColor}
          />
        );
      }
    }

    // 墙体（中下层）
    const bodyStart = Math.floor(cells / 2);
    for (let r = bodyStart; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        elements.push(
          <rect
            key={`body-${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill={houseColor}
          />
        );
      }
    }

    // 门（中下层中央）
    if (level >= 2) {
      const doorCol = Math.floor(cells / 2);
      const doorStart = bodyStart + 1;
      elements.push(
        <rect
          key="door"
          x={doorCol * cellSize}
          y={doorStart * cellSize}
          width={cellSize}
          height={(cells - doorStart) * cellSize}
          fill={doorColor}
        />
      );
    }

    // 烟囱（Lv4+）
    if (level >= 4) {
      elements.push(
        <rect
          key="chimney"
          x={(cells - 1) * cellSize}
          y={0}
          width={cellSize / 2}
          height={cellSize * 1.5}
          fill="#8A8A8A"
        />
      );
    }

    return elements;
  };

  return (
    <div className={`${sizeMap[size]} ${className} inline-flex items-center justify-center`}>
      <svg
        viewBox={`0 0 ${sizePx[size]} ${sizePx[size]}`}
        width={sizePx[size]}
        height={sizePx[size]}
        className="pixel-corners"
        aria-label={`领地 Lv.${level}`}
      >
        <rect width={sizePx[size]} height={sizePx[size]} fill="#1E241F" />
        {renderIcon()}
      </svg>
    </div>
  );
};