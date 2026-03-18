import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortKey(value: string, size = 4) {
  if (!value) return "";
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

export function toLamports(sol: number) {
  return Math.floor(sol * 1_000_000_000);
}
