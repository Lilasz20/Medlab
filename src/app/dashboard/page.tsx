"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Users,
  Beaker,
  TestTube,
  CreditCard,
  BarChart,
  TrendingUp,
  Clock,
  Calendar,
  Loader,
  FileText,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  activeTests: number;
  pendingSamples: number;
  todayRevenue: {
    total: number;
    paid: number;
  };
}

interface Activity {
  id: string;
  type: string;
  action: string;
  subject: string;
  user: string;
  time: string;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectCount, setRedirectCount] = useState(0);

  // حالات للبيانات الحقيقية
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // تأكد من أننا في مرحلة ما بعد التركيب
  useEffect(() => {
    setMounted(true);
    console.log("Dashboard - Component mounted");
  }, []);

  // جلب بيانات لوحة التحكم من API
  useEffect(() => {
    if (!mounted || authLoading || !user || !token) return;

    const fetchDashboardData = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const response = await fetch("/api/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات لوحة التحكم");
        }

        const data = await response.json();
        setDashboardStats(data.stats);
        setRecentActivities(data.recentActivities);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDataError("حدث خطأ أثناء جلب بيانات لوحة التحكم");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user, token, mounted, authLoading]);

  // تعامل منفصل مع عملية التوجيه، مع حد أقصى لعدد محاولات التوجيه
  useEffect(() => {
    if (!mounted) return; // تجنب التنفيذ قبل التركيب
    if (authLoading) return; // انتظر اكتمال عملية التحقق من المصادقة

    // منع التوجيه بعد 3 محاولات
    if (redirectCount >= 3) {
      console.log("Max redirect attempts reached, staying on page");
      return;
    }

    if (!user && !shouldRedirect) {
      console.log("No user found, setting redirect flag");
      setShouldRedirect(true);
    }
  }, [user, authLoading, mounted, shouldRedirect, redirectCount]);

  // تنفيذ التوجيه فقط عند الحاجة
  useEffect(() => {
    if (shouldRedirect && mounted && redirectCount < 3) {
      console.log(
        "Executing redirect to login page, attempt:",
        redirectCount + 1
      );
      setRedirectCount((prev) => prev + 1);
      router.push("/auth/login");

      // إعادة تعيين علامة التوجيه بعد تنفيذه
      setShouldRedirect(false);
    }
  }, [shouldRedirect, router, mounted, redirectCount]);

  // حل مشكلة Hydration: تقديم نفس المحتوى دائمًا أثناء مرحلة التركيب
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="hidden">dashboard-loading</div>
      </div>
    );
  }

  // عرض محتوى بديل أثناء التحميل
  if (authLoading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // إذا وصلنا للحد الأقصى من محاولات التوجيه، نعرض محتوى "طوارئ"
  //* تم إقافه لأن لا يقوم بالمعالجة الصحيحة
  //! للتنبيه يجب إزالة الكود في النسخة النهائية
  {
    /*
if (redirectCount >= 3 && !user) {
  return (
    <div className="w-full p-6">
      <div
        className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6"
        role="alert"
      >
        <p className="font-bold mb-1">تنبيه حالة المصادقة</p>
        <p>
          لم نتمكن من التحقق من جلستك بشكل صحيح. يرجى محاولة تسجيل الدخول مرة
          أخرى.
        </p>
        <button
          onClick={() => (window.location.href = "/auth/login")}
          className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
        >
          الذهاب لصفحة تسجيل الدخول
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">لوحة التحكم</h1>
      <p>
        المحتوى غير متاح حاليًا. يرجى تسجيل الدخول مرة أخرى للوصول إلى كامل
        المحتوى.
      </p>
    </div>
  );
}
*/
  }

  // تحقق من صلاحيات المستخدم لعرض لوحة التحكم
  if (!user) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري إعادة التوجيه...</p>
        </div>
      </div>
    );
  }

  // عرض حالة تحميل البيانات
  if (isLoadingData) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا فشل تحميل البيانات
  if (dataError) {
    return (
      <div className="w-full p-6">
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 ml-2" />
            <p className="font-bold">خطأ</p>
          </div>
          <p className="mt-1">{dataError}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // تحضير بيانات الإحصائيات
  const stats = [
    {
      id: 1,
      name: "إجمالي المرضى",
      value: dashboardStats?.totalPatients?.toLocaleString() || "0",
      icon: <Users size={20} />,
      color: "bg-blue-500",
    },
    {
      id: 2,
      name: "الفحوصات النشطة",
      value: dashboardStats?.activeTests?.toLocaleString() || "0",
      icon: <Beaker size={20} />,
      color: "bg-green-500",
    },
    {
      id: 3,
      name: "العينات المعلقة",
      value: dashboardStats?.pendingSamples?.toLocaleString() || "0",
      icon: <TestTube size={20} />,
      color: "bg-amber-500",
    },
    {
      id: 4,
      name: "إيرادات اليوم",
      value: `${
        dashboardStats?.todayRevenue.total?.toLocaleString() || "0"
      } ل.س`,
      icon: <CreditCard size={20} />,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-neutral-900 font-bold mb-2">مرحباً، {user.name}</h1>
        <p className="text-gray-600">
          هذه نظرة عامة على عمليات المختبر الخاص بك.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className={`${stat.color} p-3 rounded-lg text-white ml-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <h3 className="text-neutral-900 font-bold">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
          <h2 className="text-neutral-900 font-semibold mb-4">إجراءات سريعة</h2>
          <div className="space-y-3">
            {/* إجراءات سريعة لموظف الاستقبال */}
            {(user.role === "ADMIN" || user.role === "RECEPTIONIST") && (
              <Link
                href="/patients/new"
                className="flex items-center p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition duration-150"
              >
                <Users size={18} className="text-indigo-600 ml-3" />
                <span>إضافة مريض جديد</span>
              </Link>
            )}

            {/* إجراءات سريعة للفني المختبر */}
            {(user.role === "ADMIN" ||
              user.role === "LAB_TECHNICIAN" ||
              user.role === "RECEPTIONIST") && (
              <Link
                href="/tests/new"
                className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition duration-150"
              >
                <Beaker size={18} className="text-green-600 ml-3" />
                <span>إنشاء فحص جديد</span>
              </Link>
            )}

            {/* إجراءات سريعة لفني المختبر */}
            {(user.role === "ADMIN" || user.role === "LAB_TECHNICIAN") && (
              <Link
                href="/samples/new"
                className="flex items-center p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition duration-150"
              >
                <TestTube size={18} className="text-amber-600 ml-3" />
                <span>تسجيل عينة</span>
              </Link>
            )}

            {/* إجراءات سريعة للمحاسب */}
            {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && (
              <Link
                href="/invoices/new"
                className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition duration-150"
              >
                <CreditCard size={18} className="text-purple-600 ml-3" />
                <span>إنشاء فاتورة</span>
              </Link>
            )}

            {/* خيار مشترك لجميع الأدوار */}
            <Link
              href="/reports"
              className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-150"
            >
              <FileText size={18} className="text-blue-600 ml-3" />
              <span>عرض التقارير</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-neutral-900 font-semibold mb-4">النشاط الأخير</h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                لا توجد أنشطة حديثة
              </p>
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex border-b border-gray-100 pb-3"
                >
                  <div className="bg-gray-100 p-2 rounded-full ml-4 mt-1">
                    <Clock size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {activity.action}: {activity.subject}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <span>{activity.user}</span>
                      <span className="mx-2">•</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="mt-8 bg-indigo-50 border border-indigo-100 p-6 rounded-lg">
        <div className="flex items-center mb-4">
          <Calendar size={24} className="text-indigo-600 ml-3" />
          <h2 className="text-neutral-900 font-semibold">الأحداث القادمة</h2>
        </div>
        <p className="text-gray-600">
          تكامل التقويم قادم قريباً. ترقبوا جدولة المواعيد وإدارة المناوبات
          والمزيد.
        </p>
      </div>
    </div>
  );
}
