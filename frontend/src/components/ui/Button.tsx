import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-300/40';

  const variantStyles = {
    primary: 'bg-cyan-400 text-zinc-950 hover:bg-cyan-300 shadow-sm hover:shadow-md',
    secondary: 'bg-white/15 border border-white/30 text-zinc-50 hover:bg-white/25',
    outline: 'bg-transparent border border-white/30 text-zinc-50 hover:bg-white/10 hover:border-white/40',
    ghost: 'bg-transparent text-zinc-100 hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-400 shadow-sm hover:shadow-md',
    success: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm hover:shadow-md',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
