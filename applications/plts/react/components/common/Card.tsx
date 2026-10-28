// src/components/common/Card.tsx
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className, headerClassName, bodyClassName }) => {
  return (
    <div className={`bg-white dark:bg-scada-card rounded-lg shadow-sm border border-gray-200 dark:border-scada-border ${className}`}>
      {title && (
        <div className={`px-6 py-4 border-b border-gray-200 dark:border-scada-border ${headerClassName}`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-scada-text">{title}</h3>
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};