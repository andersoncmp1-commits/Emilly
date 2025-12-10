import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Botão com cores dinâmicas via CSS variables
export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const baseStyles = "rounded-md font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg"
  };

  // Usando classes Tailwind que referenciam CSS variables
  const variants = {
    primary: "bg-sacred-gold text-sacred-blue hover:brightness-110 hover:shadow-lg hover:shadow-sacred-gold/30",
    secondary: "bg-sacred-blue border border-sacred-gold/30 text-sacred-gold hover:bg-sacred-gray hover:border-sacred-gold",
    outline: "bg-transparent border border-sacred-gold text-sacred-gold hover:bg-sacred-gold/10",
    ghost: "bg-transparent text-sacred-gold hover:bg-sacred-gold/5",
  };

  return (
    <button 
      className={cn(baseStyles, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
