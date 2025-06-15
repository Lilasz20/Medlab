"use client";

import React from "react";

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: "date" | "datetime" | "time";
  locale?: string;
  fallback?: string;
}

/**
 * مكون لعرض التواريخ بشكل آمن
 */
export default function DateDisplay({
  date,
  format = "datetime",
  locale = "ar-EG",
  fallback = "—",
}: DateDisplayProps) {
  if (!date) return <>{fallback}</>;

  try {
    const dateObj = new Date(date);

    // التحقق من صلاحية التاريخ
    if (isNaN(dateObj.getTime())) {
      return <>{fallback}</>;
    }

    let formattedDate = "";

    if (format === "date" || format === "datetime") {
      formattedDate += dateObj.toLocaleDateString(locale);
    }

    if (format === "datetime") {
      formattedDate += " ";
    }

    if (format === "time" || format === "datetime") {
      formattedDate += dateObj.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return <>{formattedDate}</>;
  } catch (e) {
    console.error("Error formatting date:", e);
    return <>{fallback}</>;
  }
}
