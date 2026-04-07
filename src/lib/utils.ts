import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Remove quotes and capitalize first letter of each word */
export function formatName(name: string): string {
  return name
    .replace(/['"]/g, '')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
