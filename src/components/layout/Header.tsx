"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, User, Settings } from "lucide-react";

interface HeaderProps {
  toggleSidebar?: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const pathname = usePathname();

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === "/") return "الرئيسية";

    const path = pathname.split("/").filter(Boolean);
    if (path.length === 0) return "لوحة التحكم";

    // خريطة المسارات الإنجليزية إلى العنوان العربي
    switch (path[0]) {
      case "dashboard":
        return "لوحة التحكم";
      case "patients":
        return "المرضى";
      case "tests":
        return "الفحوصات";
      case "samples":
        return "العينات";
      case "queue":
        return "قائمة الانتظار";
      case "invoices":
        return " فواتير المرضى";
      case "reports":
        return "التقارير";
      case "users":
        return "المستخدمين";
      case "radiation-results":
        return "نتائج الأشعة";
      case "lab-materials":
        return "مواد المختبر";
      case "purchase-invoices":
        return "فواتير المشتريات";
      default:
        // يحول الحرف الأول إلى حرف كبير ويحلل الفواصل والأسطر المنقوطة
        return (
          path[0].charAt(0).toUpperCase() +
          path[0].slice(1).replace(/[-_]/g, " ")
        );
    }
  };

  return (
    <header
      className="bg-white border-b border-gray-200 h-16 flex items-center px-6 sticky top-0 z-10 shadow-sm"
      dir="rtl"
    >
      <div className="flex-1 flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center space-x-reverse space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs hidden md:block">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="بحث..."
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
            dir="rtl"
          />
        </div>

        {/* Notifications button with badge */}
        <button className="relative p-2 text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings button */}
        <button className="p-2 text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <Settings size={20} />
        </button>

        {/* User avatar button */}
        <button className="p-1 text-gray-600 rounded-full hover:bg-gray-100 border border-gray-200 transition-colors">
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
