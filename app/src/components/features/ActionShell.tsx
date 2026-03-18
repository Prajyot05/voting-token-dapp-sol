"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ActionShellProps = {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
};

export function ActionShell({ title, subtitle, className, children }: ActionShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0a0a0a] p-6",
        className,
      )}
    >
      <h2 className="text-xl font-medium text-white">{title}</h2>
      <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}
