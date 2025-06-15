import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a number as currency (Syrian Pounds)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-SY", {
    style: "currency",
    currency: "SYP",
  }).format(amount);
}

/**
 * Generates a unique sample code
 */
export function generateSampleCode(): string {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SAM-${timestamp}${randomChars}`;
}

/**
 * Formats a phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Format as Syrian phone number (example)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phoneNumber;
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Calculates age from birth date
 */
export function calculateAge(birthDate: Date | string): number {
  const today = new Date();
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * Gets role-based redirect path
 */
export function getRoleBasedRedirectPath(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "RECEPTIONIST":
      return "/patients";
    case "LAB_TECHNICIAN":
      return "/samples";
    case "ACCOUNTANT":
      return "/invoices";
    default:
      return "/";
  }
}
