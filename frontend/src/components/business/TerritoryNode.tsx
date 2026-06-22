'use client';

import React from 'react';
import { TerritoryIcon } from './TerritoryIcon';
import { AgentAvatar, GuardianType } from './AgentAvatar';

interface TerritoryNodeProps {
  id: string | number;
  level: number;
  nickname: string;
  guardianType?: GuardianType | string;
  isSelf?: boolean;
  isHighlighted?: boolean;
  size?: number;
  pulse?: boolean;
  onClick?: () => void;
}

/**
 * 地图上的单个领地节点
 * 用户自己：金色脉冲光晕
 * 邻居：可点击，悬停时缩放
 */
export const TerritoryNode: React.FC<TerritoryNodeProps> = ({
  level,
  nickname,
  guardianType,
  isSelf = false,
  isHighlighted = false,
  size = 56,
  pulse = false,
  onClick,
}) => {
  const handleClick = () => {
    if (!isSelf && onClick) onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'group relative flex flex-col items-center transition-transform select-none',
        !isSelf && onClick ? 'cursor-pointer hover:scale-110' : 'cursor-default',
        pulse || isHighlighted ? 'animate-pulse-soft' : '',
      ].join(' ')}
      aria-label={`${isSelf ? '我的' : ''}领地 ${nickname}`}
      style={{ width: size + 24 }}
    >
      {/* 自身领地的金色脉冲 */}
      {isSelf && (
        <span
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{
            background: 'rgba(201, 168, 124, 0.3)',
            width: size + 8,
            height: size + 8,
            top: -4,
            left: -4 + 12,
          }}
          aria-hidden="true"
        />
      )}

      {/* 领地小屋 */}
      <div
        className="relative"
        style={{
          filter: isSelf
            ? 'drop-shadow(0 0 8px rgba(201, 168, 124, 0.6))'
            : isHighlighted
            ? 'drop-shadow(0 0 6px rgba(201, 168, 124, 0.4))'
            : 'none',
        }}
      >
        <TerritoryIcon level={level} size={size >= 60 ? 'lg' : size >= 44 ? 'md' : 'sm'} />
        {guardianType && (
          <div
            className="absolute -bottom-1 -right-1 rounded-full border-2 border-brand-ink-deep overflow-hidden"
            style={{ width: size * 0.4, height: size * 0.4 }}
          >
            <AgentAvatar
              type={guardianType}
              size="sm"
              animated={false}
              className="!w-full !h-full"
            />
          </div>
        )}
      </div>

      {/* 昵称 */}
      <span
        className={[
          'mt-1 text-xs font-medium truncate max-w-full',
          isSelf ? 'text-brand-gold text-glow-gold' : 'text-brand-paper',
        ].join(' ')}
        style={{ maxWidth: size + 20 }}
      >
        {isSelf ? '我的巢' : nickname}
      </span>

      {/* 自身标签 */}
      {isSelf && (
        <span className="text-[10px] text-brand-gold-deep font-mono">YOU</span>
      )}
    </button>
  );
};