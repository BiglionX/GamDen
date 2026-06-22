import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gold' | 'vitality';
  className?: string;
}

/**
 * 古风进度条 - 金色填充 + 暗色凹陷底
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  showValue = true,
  size = 'md',
  variant = 'gold',
  className = '',
}) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const sizeMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const barColor =
    variant === 'gold'
      ? 'bg-gradient-to-r from-brand-gold-deep via-brand-gold to-brand-gold-light'
      : 'bg-gradient-to-r from-brand-vitality to-brand-vitality/70';

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5 text-xs">
          {label && (
            <span className="text-brand-paper-mute font-medium">{label}</span>
          )}
          {showValue && (
            <span className="text-brand-gold font-mono tabular-nums">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className={[
          'w-full bg-brand-ink-deep rounded-full overflow-hidden border border-brand-gold-deep/30',
          sizeMap[size],
        ].join(' ')}
      >
        <div
          className={`${barColor} ${sizeMap[size]} rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(201,168,124,0.3)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};