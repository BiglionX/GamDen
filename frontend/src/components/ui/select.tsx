import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  error,
  options,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `sel-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block mb-1.5 text-sm font-medium text-brand-paper-mute"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          'w-full px-3 py-2 rounded-nest-sm text-base nest-input',
          error ? 'border-brand-beacon' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
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