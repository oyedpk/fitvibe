import React from "react";
import { motion } from "framer-motion";

export function Card({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl shadow-sm border p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
