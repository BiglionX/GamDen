import React from 'react';

interface CoinBadgeProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 金币徽章 - 领地金底色 + 古币符号
 */
export const CoinBadge: React.FC<CoinBadgeProps> = ({
  amount,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const s = iconSize[size];

  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-nest-sm',
        'bg-brand-gold/15 text-brand-gold border border-brand-gold/40',
        sizeMap[size],
        className,
      ].join(' ')}
      aria-label={`${amount} 金币`}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" fill="#C9A87C" stroke="#A8865E" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#A8865E" strokeWidth="1.2" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="9"
          fill="#1E241F"
          fontWeight="bold"
        >
          金
        </text>
      </svg>
      <span className="font-mono tabular-nums">{amount.toLocaleString()}</span>
    </span>
  );
};