// src/components/ui/alert.jsx
import { h } from 'preact';

const Alert = ({ children, variant = 'default', className = '', ...props }) => {
  const variantClasses = {
    default: 'bg-gray-800 text-gray-100',
    destructive: 'bg-red-900/50 text-red-300',
    success: 'bg-green-900/50 text-green-300',
  };

  return (
    <div
      className={`rounded-lg p-3 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const AlertTitle = ({ children, className = '', ...props }) => (
  <h5
    className={`font-medium leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h5>
);

const AlertDescription = ({ children, className = '', ...props }) => (
  <div
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </div>
);

export { Alert, AlertTitle, AlertDescription };