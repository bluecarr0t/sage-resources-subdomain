import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-sage-600 text-white hover:bg-sage-700 focus:ring-sage-600 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-gray-400 disabled:opacity-50',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:ring-gray-400',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'py-3 px-4 text-base font-medium',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
