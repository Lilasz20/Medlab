"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({
  className = "",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-t-1 border-b-1",
    md: "h-8 w-8 border-t-2 border-b-2",
    lg: "h-12 w-12 border-t-2 border-b-2",
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={cn(
          "animate-spin rounded-full border-indigo-600",
          sizeClasses[size],
          className
        )}
      ></div>
    </div>
  );
}
