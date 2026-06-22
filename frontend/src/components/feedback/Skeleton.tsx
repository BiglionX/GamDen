import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const ROUNDED_MAP = {
  none: '',
  sm: 'rounded-nest-sm',
  md: 'rounded-nest-md',
  lg: 'rounded-nest-lg',
  full: 'rounded-full',
};

/**
 * 巢穴色骨架屏 - 与品牌色板一致
 * 替代 CSS nest-skeleton，更灵活可控
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  rounded = 'sm',
  className = '',
  style,
  ...rest
}) => {
  return (
    <div
      className={[
        'nest-skeleton',
        ROUNDED_MAP[rounded],
        className,
      ].join(' ')}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
};

/** 文本行骨架（默认 16px 高度） */
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={14}
        width={i === lines - 1 ? '60%' : '100%'}
        rounded="sm"
      />
    ))}
  </div>
);

/** 卡片骨架（领地卡 / 俱乐部卡） */
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={[
      'bg-brand-ink-raised border border-brand-gold-deep/30 rounded-nest-md p-5',
      className,
    ].join(' ')}
  >
    <div className="flex items-center gap-3 mb-4">
      <Skeleton width={48} height={48} rounded="md" />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={12} />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);