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
        "rounded-2xl border border-cyan-300/25 bg-[#0d1236]/70 p-6 shadow-[0_0_35px_rgba(34,211,238,.10)] backdrop-blur",
        className,
      )}
    >
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-cyan-100/70">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
