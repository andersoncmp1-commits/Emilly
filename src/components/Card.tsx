import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
}

// Componente de Card com animação e estilo sacro
export function Card({ children, className = "", onClick, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, borderColor: '#D4AF37' }}
      className={`
        bg-sacred-beige/5 backdrop-blur-md 
        border border-sacred-gold/20 
        rounded-lg p-6 
        shadow-[0_4px_20px_rgba(0,0,0,0.2)] 
        hover:shadow-[0_4px_30px_rgba(212,175,55,0.1)]
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
