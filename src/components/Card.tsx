import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}

// Componente de Card com animação e cores dinâmicas
export function Card({ children, className = "", onClick, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className={`
        bg-sacred-beige/5 backdrop-blur-md 
        border border-sacred-gold/20 
        rounded-lg p-6 
        shadow-lg shadow-black/20
        hover:shadow-xl hover:shadow-sacred-gold/10
        hover:border-sacred-gold/40
        transition-all duration-300
        cursor-pointer
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
