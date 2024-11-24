// src/components/ui/theme.jsx
import { h } from 'preact';

export const Card = ({ children, className = '', ...props }) => (
  <div
    className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 
                rounded-xl shadow-xl text-gray-100 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-gray-800 text-gray-300'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium
        transition-all duration-200
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export const Badge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-gray-700 text-gray-100',
    success: 'bg-green-900/50 text-green-300',
    warning: 'bg-yellow-900/50 text-yellow-300',
    error: 'bg-red-900/50 text-red-300',
    purple: 'bg-purple-900/50 text-purple-300'
  };

  return (
    <span
      className={`
        ${variants[variant]}
        px-2.5 py-0.5 text-sm font-medium rounded-full
        inline-flex items-center gap-1
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

export const Input = ({ className = '', ...props }) => (
  <input
    className={`
      w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
      text-gray-100 placeholder-gray-500
      focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
      transition-all duration-200
      ${className}
    `}
    {...props}
  />
);

export const Select = ({ className = '', ...props }) => (
  <select
    className={`
      w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
      text-gray-100
      focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
      transition-all duration-200
      ${className}
    `}
    {...props}
  />
);

export const Heading = ({ level = 2, children, className = '', ...props }) => {
  const Tag = `h${level}`;
  const sizes = {
    1: 'text-2xl',
    2: 'text-xl',
    3: 'text-lg',
    4: 'text-base',
  };

  return (
    <Tag
      className={`
        ${sizes[level]}
        font-semibold text-gray-100
        ${className}
      `}
      {...props}
    >
      {children}
    </Tag>
  );
};

export const Panel = ({ children, className = '', ...props }) => (
  <div
    className={`
      bg-gray-800/80 backdrop-blur-sm
      border border-gray-700/50
      rounded-lg p-4
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

export const IconButton = ({ children, className = '', ...props }) => (
  <button
    className={`
      p-2 rounded-lg
      text-gray-400 hover:text-gray-100
      hover:bg-gray-700
      transition-colors duration-200
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);