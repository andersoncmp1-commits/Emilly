import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

// Aqui você pode alterar as cores e estilos dos botões
export function Button({ children, variant = 'primary', className, ...props }: ButtonProps) {
  const baseStyles = "px-6 py-3 rounded-md font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-sacred-gold text-sacred-blue hover:bg-[#b5952f] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]",
    secondary: "bg-sacred-blue border border-sacred-gold/30 text-sacred-gold hover:bg-sacred-blue/80 hover:border-sacred-gold",
    outline: "bg-transparent border border-sacred-gold text-sacred-gold hover:bg-sacred-gold/10",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
