// src/components/common/PageTitle.tsx
import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`mb-8 text-center ${className}`}>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 text-lg text-gray-600 md:text-xl">{subtitle}</p>}
    </div>
  );
};
export default PageTitle;