// src/components/common/ChartCard.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, description, children, className = '', contentClassName = 'min-h-[400px]' }) => {
  return (
    <Card className={`my-6 shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl text-gray-700">{title}</CardTitle>
        {description && <CardDescription className="text-sm text-gray-500 mt-1">{description}</CardDescription>}
      </CardHeader>
      <CardContent className={`w-full p-2 md:p-4 ${contentClassName}`}>
        {children}
      </CardContent>
    </Card>
  );
};
export default ChartCard;