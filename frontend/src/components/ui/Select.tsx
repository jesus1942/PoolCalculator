import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300 transition-all duration-200 ${
          error ? 'border-red-400 focus:ring-red-400/40' : ''
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-950 text-zinc-100">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-sm text-red-300 font-medium">{error}</p>}
    </div>
  );
};
