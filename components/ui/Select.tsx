import React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ children, className, ...props }) => {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none ${className}`}
    >
      {children}
    </select>
  );
};