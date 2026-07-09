import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

// Botón del sistema "Artesanal Sobrio": el borde/fondo rugoso va en un
// <span> absoluto con filter #pcRough; el label queda nítido encima.
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  };

  return (
    <button
      type={type}
      className={`rough-btn rough-btn--${variant} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <span className="rough-btn__bg" aria-hidden="true" />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};
