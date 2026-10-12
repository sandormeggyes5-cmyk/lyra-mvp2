import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full rounded-md border px-3 py-2 text-body text-neutral-900
          placeholder:text-neutral-400 outline-none transition-colors duration-base ease-standard
          focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-neutral-50 disabled:text-neutral-500
          ${error ? 'border-danger focus:ring-danger' : 'border-neutral-300'}
          ${className}
        `}
      />
      {error && <p role="alert" aria-live="polite" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
