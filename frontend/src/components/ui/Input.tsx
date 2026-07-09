import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Input del sistema "Artesanal Sobrio": borde/fondo rugoso en capa aparte.
export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </label>
      )}
      <div className={`rough-field ${error ? 'rough-field--error' : ''}`}>
        <span className="rough-field__bg" aria-hidden="true" />
        <input
          className={`rough-field__control ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm font-medium" style={{ color: 'var(--bad)' }}>{error}</p>}
    </div>
  );
};
