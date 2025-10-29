import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      {...props}
      className={`w-full px-4 py-3 font-semibold text-white bg-primary-600 rounded-3xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ease-in-out transform hover:-translate-y-px hover:shadow-lg active:translate-y-0 active:shadow-none ${className}`}
    >
      {children}
    </button>
  );
};