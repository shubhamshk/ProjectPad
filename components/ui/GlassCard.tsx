import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hoverEffect = false
}) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, boxShadow: "0 10px 40px -10px rgba(160, 108, 213, 0.2)" } : {}}
      onClick={onClick}
      className={`
        backdrop-blur-xl bg-white/[0.03] 
        border border-white/[0.08] 
        rounded-2xl p-6 
        shadow-xl
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};