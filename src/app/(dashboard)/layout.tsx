"use client";

import React from "react";
import MainLayout from "@/components/layout/MainLayout";

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainLayout>{children}</MainLayout>;
} 