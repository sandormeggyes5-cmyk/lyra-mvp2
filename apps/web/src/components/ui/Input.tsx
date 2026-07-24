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
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-slate-900
          placeholder:text-slate-400 outline-none transition-colors
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-slate-50 disabled:text-slate-500
          ${error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
