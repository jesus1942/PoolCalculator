import React, { useId } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

// Select del sistema "Artesanal Sobrio": borde/fondo rugoso en capa aparte.
export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const selectId = props.id || generatedId;
  const errorId = `${selectId}-error`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </label>
      )}
      <div className={`rough-field ${error ? 'rough-field--error' : ''}`}>
        <span className="rough-field__bg" aria-hidden="true" />
        <select
          className={`rough-field__control ${className}`}
          {...props}
          id={selectId}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={error ? `${props['aria-describedby'] || ''} ${errorId}`.trim() : props['aria-describedby']}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p id={errorId} className="mt-2 text-sm font-medium" style={{ color: 'var(--bad)' }}>{error}</p>}
    </div>
  );
};
