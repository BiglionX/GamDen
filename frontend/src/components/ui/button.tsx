import React, { useState } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

/**
 * 古风巢穴 Button - 领地金主色 / 涟漪反馈 / 像素倒角
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  fullWidth = false,
  icon,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-nest-sm transition-all overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-ink disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-brand-gold text-brand-ink hover:bg-brand-gold-light active:bg-brand-gold-deep focus:ring-brand-gold shadow-glow-gold',
    secondary:
      'bg-brand-ink-raised text-brand-paper hover:bg-brand-ink border border-brand-gold-deep focus:ring-brand-gold-deep',
    outline:
      'bg-transparent text-brand-gold border-2 border-brand-gold hover:bg-brand-gold/10 active:bg-brand-gold/20 focus:ring-brand-gold',
    ghost:
      'bg-transparent text-brand-paper-mute hover:bg-brand-ink-raised hover:text-brand-paper focus:ring-brand-mute',
    danger:
      'bg-brand-beacon text-brand-paper hover:brightness-110 active:brightness-90 focus:ring-brand-beacon shadow-glow-beacon',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
    onClick?.(e);
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!loading && icon && <span className="inline-flex">{icon}</span>}
      <span>{children}</span>
      {/* 涟漪效果 */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/40 pointer-events-none animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: 20,
            height: 20,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};