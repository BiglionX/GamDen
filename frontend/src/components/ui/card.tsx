import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'sunken' | 'scroll';
  glow?: boolean;
}

/**
 * 古风巢穴 Card - 暗色卡 / 卷轴卡 / 凹陷卡
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  glow = false,
}) => {
  const variantStyles = {
    default:
      'bg-brand-ink-raised border border-brand-gold-deep/40 shadow-nest-card',
    sunken:
      'bg-brand-ink-deep border border-brand-gold-deep/20 shadow-nest-deep',
    scroll:
      'bg-brand-ink-raised/80 border border-brand-gold/30 nest-border shadow-nest-card',
  } as const;

  const interactive = !!onClick;

  return (
    <div
      className={[
        'relative rounded-nest-md transition-all duration-200',
        variantStyles[variant],
        interactive ? 'cursor-pointer hover:border-brand-gold hover:shadow-glow-gold' : '',
        glow ? 'shadow-glow-gold' : '',
        'animate-fade-in',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={[
      'px-5 py-4 border-b border-brand-gold-deep/30 text-brand-paper font-serif',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={['px-5 py-4 text-brand-paper-mute', className].join(' ')}>
    {children}
  </div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h3
    className={[
      'text-lg font-serif font-medium text-brand-paper',
      className,
    ].join(' ')}
  >
    {children}
  </h3>
);