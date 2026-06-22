import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * 古风巢穴 Textarea - 与 Input 视觉统一
 */
export const Textarea: React.FC<TextareaProps> = ({
  label,
  hint,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `ta-${Math.random().toString(36).slice(2, 9)}`;
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
      <textarea
        id={inputId}
        className={[
          'w-full px-3 py-2 rounded-nest-sm text-base nest-input resize-y',
          error ? 'border-brand-beacon' : '',
          className,
        ].join(' ')}
        {...props}
      />
      {(hint || error) && (
        <p
          className={[
            'mt-1 text-xs',
            error ? 'text-brand-beacon' : 'text-brand-mute',
          ].join(' ')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};