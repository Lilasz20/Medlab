import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * تنسيق المبلغ كعملة بالليرة السورية
 * @param amount المبلغ الرقمي
 * @returns المبلغ منسقاً كعملة
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ar-SY") + " ل.س";
}
