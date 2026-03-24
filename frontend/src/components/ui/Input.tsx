import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-zinc-200 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-300 transition-all duration-200 ${
          error ? 'border-red-400 focus:ring-red-400/40' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-red-300 font-medium">{error}</p>}
    </div>
  );
};
