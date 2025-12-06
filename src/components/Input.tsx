import { type InputHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Aqui você pode ajustar o estilo dos inputs
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-sacred-beige/80 ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white placeholder:text-sacred-gray/30 focus:outline-none focus:border-sacred-gold focus:ring-1 focus:ring-sacred-gold/50 transition-all duration-300 backdrop-blur-sm",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-400 ml-1">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
