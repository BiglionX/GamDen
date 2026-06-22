import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

/**
 * 古风巢穴 Input - 凹陷底色 / 聚焦金色光晕
 */
export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const hasError = !!error;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-sm font-medium text-brand-paper-mute"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mute pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'w-full px-3 py-2 rounded-nest-sm text-base nest-input',
            icon ? 'pl-10' : '',
            hasError
              ? 'border-brand-beacon focus:border-brand-beacon focus:shadow-[0_0_0_2px_rgba(192,57,43,0.2)]'
              : '',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {(hint || error) && (
        <p
          className={[
            'mt-1 text-xs',
            hasError ? 'text-brand-beacon' : 'text-brand-mute',
          ].join(' ')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};