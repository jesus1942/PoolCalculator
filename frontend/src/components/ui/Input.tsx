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
        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300 transition-all duration-200 ${
          error ? 'border-red-400 focus:ring-red-400/40' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-red-300 font-medium">{error}</p>}
    </div>
  );
};
