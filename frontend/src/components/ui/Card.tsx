import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        {title && <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
};
