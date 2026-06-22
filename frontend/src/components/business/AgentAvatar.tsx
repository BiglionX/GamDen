import React from 'react';

export type GuardianType = 'mechanic' | 'elf' | 'astrologer' | 'unknown';

const agentColorMap: Record<GuardianType, { from: string; to: string; glow: string }> = {
  mechanic: {
    from: '#5A7A8F',
    to: '#2A4258',
    glow: 'rgba(90, 122, 143, 0.6)',
  },
  elf: {
    from: '#7CA67C',
    to: '#3F6B4D',
    glow: 'rgba(124, 166, 124, 0.6)',
  },
  astrologer: {
    from: '#8F6FA8',
    to: '#4A3A60',
    glow: 'rgba(143, 111, 168, 0.6)',
  },
  unknown: {
    from: '#5A8F6C',
    to: '#2A322B',
    glow: 'rgba(90, 143, 108, 0.4)',
  },
};

const agentEmojiMap: Record<GuardianType, string> = {
  mechanic: '⚙',
  elf: '✦',
  astrologer: '☽',
  unknown: '○',
};

const agentNameMap: Record<GuardianType, string> = {
  mechanic: '机械师',
  elf: '精灵',
  astrologer: '占星师',
  unknown: '守护灵',
};

interface AgentAvatarProps {
  type: GuardianType | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

/**
 * 守护灵头像 - 类型色渐变 + 光晕脉冲
 */
export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  type,
  size = 'md',
  animated = true,
  className = '',
}) => {
  const safeType: GuardianType = (agentColorMap as any)[type] ? (type as GuardianType) : 'unknown';
  const colors = agentColorMap[safeType];
  const sizeMap = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-5xl',
    xl: 'w-32 h-32 text-7xl',
  };

  return (
    <div
      className={[
        'relative inline-flex items-center justify-center rounded-full font-serif text-brand-paper select-none',
        sizeMap[size],
        animated ? 'animate-glow' : '',
        className,
      ].join(' ')}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colors.from}, ${colors.to})`,
        boxShadow: `0 0 16px ${colors.glow}, inset 0 -2px 8px rgba(0,0,0,0.4)`,
      }}
      aria-label={`守护灵 ${agentNameMap[safeType]}`}
    >
      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        {agentEmojiMap[safeType]}
      </span>
      {animated && (
        <span
          className="absolute inset-0 rounded-full opacity-50 animate-pulse-soft pointer-events-none"
          style={{
            background: `radial-gradient(circle, transparent 60%, ${colors.glow} 100%)`,
          }}
        />
      )}
    </div>
  );
};

export const getGuardianName = (type: string) =>
  (agentNameMap as any)[type] || '守护灵';

export const getGuardianEmoji = (type: string) =>
  (agentEmojiMap as any)[type] || '○';