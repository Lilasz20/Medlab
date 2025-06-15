"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/components/auth/AuthContext";
import { motion } from "framer-motion";

// استخدام متغير عالمي لتخزين حالة السلايد بار في الجلسة بين تحميلات الصفحة
const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false); // بدء بقيمة افتراضية
  const [isInitialized, setIsInitialized] = useState(false); // للتحكم في وقت العرض الأولي
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // مسؤولة عن إعداد الحالة الأولية عند تحميل الصفحة
  useEffect(() => {
    if (typeof window !== "undefined") {
      // قراءة الحالة من localStorage
      const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      const initialState = savedState ? savedState === "true" : false;

      // تعيين الحالة بدون إعادة تصيير
      setIsCollapsed(initialState);
      setIsInitialized(true);
    }

    setMounted(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);

    // حفظ التفضيلات في localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
    }
  };

  // حل مشكلة Hydration - نقدم نفس المحتوى على الخادم والعميل
  if (!mounted) {
    // نفس الهيكل للتجنب hydration mismatch - بدون عناصر متغيرة
    return (
      <div className="min-h-screen bg-gray-50">
        {/* تجنب استخدام أي محتوى متغير هنا */}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen bg-gray-50"
        dir="rtl"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If user is not authenticated, just show content (auth middleware will redirect)
  if (!user) {
    return (
      <>
        <main className="min-h-screen bg-gray-50">{children}</main>
      </>
    );
  }

  // منع عرض السلايد بار حتى تكتمل القراءة من localStorage
  // لمنع الوميض عند التنقل بين الصفحات
  if (!isInitialized) {
    return null;
  }

  // Define sidebar width for content layout
  const sidebarWidth = isCollapsed ? "5rem" : "16rem";

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <motion.div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          marginRight: sidebarWidth,
          transition: "margin 0.3s ease-in-out",
        }}
      >
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </motion.div>
    </div>
  );
}
