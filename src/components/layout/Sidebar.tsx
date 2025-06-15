"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";
import { motion } from "framer-motion";

// Icons
import {
  LayoutDashboard,
  Users,
  Beaker,
  TestTube,
  FileText,
  CreditCard,
  LogOut,
  BarChart,
  ChevronRight,
  Home,
  Settings,
  Radio,
  Bell,
  ChevronDown,
  Receipt,
  FileBox,
  List,
  Plus,
  History,
} from "lucide-react";

// الأقسام الفرعية
interface SubNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

// تعديل واجهة NavItem لدعم العناصر الفرعية
interface NavItem {
  title: string;
  href?: string; // أصبح اختياريًا للعناصر التي تحتوي على قائمة فرعية
  icon: React.ReactNode;
  roles: string[];
  subItems?: SubNavItem[]; // إضافة عناصر فرعية
  isCollapsible?: boolean; // هل يمكن طي/فتح القائمة الفرعية
}

// تعديل قائمة العناصر
const navItems: NavItem[] = [
  {
    title: "لوحة التحكم",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    roles: ["ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN", "ACCOUNTANT"],
  },
  {
    title: "المرضى",
    href: "/patients",
    icon: <Users size={20} />,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    title: "الفحوصات",
    href: "/tests",
    icon: <Beaker size={20} />,
    roles: ["ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN"],
  },
  {
    title: "العينات",
    href: "/samples",
    icon: <TestTube size={20} />,
    roles: ["ADMIN", "LAB_TECHNICIAN"],
  },
  {
    title: "نتائج الأشعة",
    href: "/radiation-results",
    icon: <Radio size={20} />,
    roles: ["ADMIN", "LAB_TECHNICIAN"],
  },
  {
    title: "المواد المخبرية",
    icon: <FileBox size={20} />,
    roles: ["ADMIN", "LAB_TECHNICIAN", "ACCOUNTANT"],
    isCollapsible: true,
    subItems: [
      {
        title: "قائمة المواد",
        href: "/lab-materials",
        icon: <List size={18} />,
      },
      {
        title: "سجل الحركات",
        href: "/lab-materials/transactions",
        icon: <History size={18} />,
      },
    ],
  },
  {
    title: "قائمة الانتظار",
    href: "/queue",
    icon: <BarChart size={20} />,
    roles: ["ADMIN", "RECEPTIONIST"],
  },
  {
    title: "الفواتير",
    icon: <CreditCard size={20} />,
    roles: ["ADMIN", "ACCOUNTANT"],
    isCollapsible: true,
    subItems: [
      {
        title: "فواتير المرضى",
        href: "/invoices",
        icon: <Receipt size={18} />,
      },
      {
        title: "فواتير الشراء",
        href: "/purchase-invoices",
        icon: <FileText size={18} />,
      },
    ],
  },
  {
    title: "التقارير",
    href: "/reports",
    icon: <BarChart size={20} />,
    roles: ["ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN", "ACCOUNTANT"],
  },
  {
    title: "إدارة المستخدمين",
    href: "/users",
    icon: <Settings size={20} />,
    roles: ["ADMIN"],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // إضافة حالة لتتبع القوائم المفتوحة
  const [openSubMenus, setOpenSubMenus] = useState<{ [key: string]: boolean }>(
    {}
  );

  // تلقائياً فتح القوائم المناسبة بناءً على المسار الحالي
  useEffect(() => {
    // فتح قائمة الفواتير عندما يكون المستخدم في صفحات فواتير الشراء أو فواتير المرضى
    if (
      pathname.startsWith("/purchase-invoices") ||
      pathname.startsWith("/invoices")
    ) {
      setOpenSubMenus((prev) => ({
        ...prev,
        الفواتير: true,
      }));
    }

    // فتح قائمة المواد المخبرية عندما يكون المستخدم في صفحات المواد المخبرية
    if (pathname.startsWith("/lab-materials")) {
      setOpenSubMenus((prev) => ({
        ...prev,
        "المواد المخبرية": true,
      }));
    }
  }, [pathname]);

  // فتح/إغلاق قائمة فرعية
  const toggleSubMenu = (title: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  if (!user) return null;

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role as string)
  );

  const mapRoleToArabic = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "مدير النظام";
      case "RECEPTIONIST":
        return "موظف استقبال";
      case "LAB_TECHNICIAN":
        return "فني مختبر";
      case "ACCOUNTANT":
        return "محاسب";
      default:
        return role.toLowerCase().replace("_", " ");
    }
  };

  // Animation variants
  const sidebarVariants = {
    expanded: { width: "16rem" },
    collapsed: { width: "5rem" },
  };

  const logoVariants = {
    expanded: { opacity: 1 },
    collapsed: { opacity: 0 },
  };

  const textVariants = {
    expanded: { opacity: 1, display: "block" },
    collapsed: { opacity: 0, display: "none" },
  };

  return (
    <div className="relative">
      {/* زر الطي ملتصق تمامًا بحافة السلايد بار */}
      <motion.button
        onClick={toggleSidebar}
        className="fixed z-30 bg-indigo-600 hover:bg-indigo-500 text-white rounded-r-none rounded-l-md p-1 hover:shadow-md border-y border-l border-indigo-400/30"
        style={{
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          borderRight: "none",
          height: "36px",
          width: "18px",
          right: isCollapsed ? "5rem" : "16rem",
          top: "12px",
          transition: "right 0.3s ease-in-out",
          transform: "translateX(0.5px)", // ضبط دقيق لمنع أي فراغ
        }}
        title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
        whileTap={{ scale: 0.9 }}
        whileHover={{ backgroundColor: "#4f46e5" }}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ChevronRight size={13} strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      <motion.aside
        className="fixed top-0 right-0 h-screen bg-gradient-to-b from-indigo-700 to-indigo-900 flex flex-col shadow-xl z-20 overflow-hidden"
        variants={sidebarVariants}
        initial={isCollapsed ? "collapsed" : "expanded"}
        animate={isCollapsed ? "collapsed" : "expanded"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        dir="rtl"
      >
        <div
          className={cn(
            "py-5 flex flex-col items-center justify-center border-b border-indigo-600/30",
            isCollapsed ? "pb-4 pt-6" : "pb-5 pt-5"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-full",
              isCollapsed ? "pl-5" : "px-2"
            )}
          >
            <div
              className={cn(
                "flex items-center",
                isCollapsed ? "justify-center w-full" : "justify-center"
              )}
            >
              <div className="flex items-center justify-center h-10 w-10 bg-white/90 rounded-full shadow-lg pulse-effect">
                <Home size={20} className="text-indigo-700" />
              </div>

              <motion.h2
                className="text-lg font-bold text-white mr-3"
                variants={textVariants}
                animate={isCollapsed ? "collapsed" : "expanded"}
                transition={{ duration: 0.2 }}
              >
                المعمل الطبي
              </motion.h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <nav className="space-y-2 px-3">
            {filteredNavItems.map((item) => (
              <div key={item.title}>
                {item.href ? (
                  // عنصر قائمة عادي مع رابط مباشر
                  <Link
                    href={item.href}
                    className={cn(
                      "sidebar-link flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all group",
                      isCollapsed && "collapsed-menu-hover",
                      pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-indigo-100 hover:bg-white/10 hover:text-white"
                    )}
                    data-title={item.title}
                  >
                    <div
                      className={cn(
                        "min-w-[24px] flex justify-center group-hover:scale-110 transition-transform",
                        (pathname === item.href ||
                          pathname.startsWith(`${item.href}/`)) &&
                          !isCollapsed &&
                          "active-icon"
                      )}
                    >
                      {item.icon}
                    </div>
                    <motion.span
                      className="mr-3 whitespace-nowrap"
                      variants={textVariants}
                      animate={isCollapsed ? "collapsed" : "expanded"}
                      transition={{ duration: 0.2 }}
                    >
                      {item.title}
                    </motion.span>
                  </Link>
                ) : (
                  // عنصر قائمة يحتوي على قائمة فرعية
                  <>
                    <button
                      onClick={() => toggleSubMenu(item.title)}
                      className={cn(
                        "sidebar-link flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-all group",
                        isCollapsed && "collapsed-menu-hover justify-center",
                        item.subItems?.some(
                          (subItem) =>
                            pathname === subItem.href ||
                            pathname.startsWith(`${subItem.href}/`)
                        )
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-indigo-100 hover:bg-white/10 hover:text-white"
                      )}
                      data-title={item.title}
                    >
                      <div className="flex items-center">
                        <div
                          className={cn(
                            "min-w-[24px] flex justify-center group-hover:scale-110 transition-transform",
                            item.subItems?.some(
                              (subItem) =>
                                pathname === subItem.href ||
                                pathname.startsWith(`${subItem.href}/`)
                            ) &&
                              !isCollapsed &&
                              "active-icon"
                          )}
                        >
                          {item.icon}
                        </div>
                        <motion.span
                          className="mr-3 whitespace-nowrap"
                          variants={textVariants}
                          animate={isCollapsed ? "collapsed" : "expanded"}
                          transition={{ duration: 0.2 }}
                        >
                          {item.title}
                        </motion.span>
                      </div>
                      {!isCollapsed && (
                        <motion.div
                          animate={{
                            rotate: openSubMenus[item.title] ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} />
                        </motion.div>
                      )}
                    </button>

                    {/* العناصر الفرعية */}
                    {!isCollapsed &&
                      item.subItems &&
                      openSubMenus[item.title] && (
                        <div className="mr-8 mt-1 space-y-1">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "flex items-center px-4 py-2 text-sm rounded-md transition-all",
                                pathname === subItem.href ||
                                  (pathname.startsWith(subItem.href) &&
                                    ((subItem.href === "/lab-materials" &&
                                      !pathname.includes("/transactions")) ||
                                      (subItem.href.includes("/transactions") &&
                                        pathname.includes("/transactions"))))
                                  ? "bg-white/20 text-white"
                                  : "text-indigo-100 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <div className="min-w-[20px] flex justify-center">
                                {subItem.icon}
                              </div>
                              <span className="mr-2">{subItem.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div
          className={cn(
            "p-4 border-t border-indigo-600/30 bg-indigo-800/20",
            isCollapsed ? "items-center justify-center" : ""
          )}
        >
          <div
            className={cn(
              "flex",
              isCollapsed ? "justify-center" : "items-center"
            )}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-white to-blue-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <motion.div
              className="mr-3 overflow-hidden"
              variants={textVariants}
              animate={isCollapsed ? "collapsed" : "expanded"}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-indigo-200 truncate">
                {mapRoleToArabic(user.role)}
              </p>
            </motion.div>
          </div>

          <button
            onClick={logout}
            className={cn(
              "flex items-center mt-4 px-4 py-2 text-sm text-white rounded-lg hover:bg-indigo-600/30 transition-colors w-full group",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <span className="group-hover:rotate-12 transition-transform">
              <LogOut size={18} />
            </span>
            <motion.span
              className="mr-2"
              variants={textVariants}
              animate={isCollapsed ? "collapsed" : "expanded"}
              transition={{ duration: 0.2 }}
            >
              تسجيل الخروج
            </motion.span>
          </button>
        </div>
      </motion.aside>
    </div>
  );
}
