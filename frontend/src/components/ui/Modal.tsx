import React from 'react';
import { HdX } from '@/components/ui/HandDrawnIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 transition-opacity bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className={`relative z-[1001] w-full ${sizeClasses[size]}`}>
          <div className="max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 bg-zinc-950/96 shadow-2xl backdrop-blur-xl">
            <div className="max-h-[90vh] overflow-y-auto px-6 pt-6 pb-5 sm:p-8 text-zinc-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-zinc-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/15"
                >
                  <HdX size={24} />
                </button>
              </div>
              <div className="text-zinc-100">
                {children}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
