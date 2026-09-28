import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className,
}) => {
  return (
    <motion.div
      /* whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }} */
      className={`w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 ${className}`}
    >
      {title && (
        <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
      )}
      {subtitle && (
        <h2 className="text-2xl text-center text-black font-bold mb-4">
          {subtitle}
        </h2>
      )}
      {children}
    </motion.div>
  );
};

export default Card;
