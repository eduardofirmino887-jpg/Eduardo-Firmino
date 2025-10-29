import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  isCritical?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, value, isCritical = false }) => {
  const valueColor = isCritical ? 'text-accent-error' : 'text-slate-100';

  return (
    <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-sm text-left transition-all duration-200 transform hover:-translate-y-1">
      <h4 className="text-sm font-medium text-slate-400">{title}</h4>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
};