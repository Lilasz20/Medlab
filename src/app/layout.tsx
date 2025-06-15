import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedLab - Medical Laboratory Management",
  description: "A comprehensive medical laboratory management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 4000,
              style: {
                direction: "rtl",
                textAlign: "right",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
