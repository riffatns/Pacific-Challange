// src/components/common/SectionTitle.tsx
import React from 'react';

interface SectionTitleProps {
  title: string;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title, className = '' }) => {
  return (
    <h2 className={`text-2xl font-semibold text-gray-800 mb-4 mt-8 border-b pb-2 ${className}`}>
      {title}
    </h2>
  );
};
export default SectionTitle;