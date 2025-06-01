// src/components/common/Description.tsx
import React from 'react';

interface DescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const Description: React.FC<DescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`text-gray-700 mb-4 leading-relaxed ${className}`}>
      {children}
    </p>
  );
};
export default Description;