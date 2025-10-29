

import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
    />
  );
};