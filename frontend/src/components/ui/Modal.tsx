import React from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}>
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="px-6 pt-6 pb-5 sm:p-8 text-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="text-zinc-200">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
