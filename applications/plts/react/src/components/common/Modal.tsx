// src/components/common/Modal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleOverlayClick}>
      <div className={`bg-white dark:bg-scada-card rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 flex flex-col max-h-[calc(100vh-48px)]`}>
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-scada-text">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 lg:p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-3 p-4 lg:p-6 border-t border-gray-200 dark:border-scada-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};