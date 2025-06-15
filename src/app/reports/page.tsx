"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  FileText,
  Loader,
  Filter,
  Calendar,
  FileSpreadsheet,
  FileBarChart2,
  BarChart3,
  FileBarChart,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ReportType } from "@/types";

// تعريف أنواع التقارير
interface Report {
  id: string;
  title: string;
  type: ReportType;
  description: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  pdfUrl?: string;
  createdBy: string;
}

// دالة مساعدة لتنسيق التاريخ بالعربية
const formatArabicDate = (date: string | Date) => {
  return format(new Date(date), "dd MMMM yyyy", { locale: ar });
};

// دالة لاختيار الأيقونة المناسبة لنوع التقرير
const getReportIcon = (type: ReportType) => {
  switch (type) {
    case "PATIENT":
      return <FileText className="h-6 w-6 text-blue-500" />;
    case "TEST":
      return <FileBarChart2 className="h-6 w-6 text-red-500" />;
    case "FINANCIAL":
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    case "SAMPLE":
      return <FileBarChart className="h-6 w-6 text-purple-500" />;
    case "SUMMARY":
      return <BarChart3 className="h-6 w-6 text-indigo-500" />;
    default:
      return <FileText className="h-6 w-6 text-gray-500" />;
  }
};

export default function ReportsPage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");

  useEffect(() => {
    // تحقق من وجود مستخدم مصرح قبل جلب البيانات
    if (authLoading) return;

    // إذا لم يكن المستخدم مسجلاً، عد إلى صفحة تسجيل الدخول
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // جلب بيانات التقارير من واجهة برمجة التطبيقات
    const fetchReports = async () => {
      try {
        setLoading(true);

        // استدعاء API حقيقي للحصول على التقارير
        const response = await fetch("/api/reports", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`فشل في جلب التقارير: ${response.statusText}`);
        }

        const data = await response.json();
        setReports(data.reports || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setError("حدث خطأ أثناء جلب بيانات التقارير");
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, authLoading, router, token]);

  // تصفية التقارير حسب النوع والفترة
  const filteredReports = reports.filter((report) => {
    // تصفية حسب النوع
    if (selectedType !== "ALL" && report.type !== selectedType) {
      return false;
    }

    // تصفية حسب الفترة الزمنية
    if (selectedPeriod !== "ALL") {
      const reportDate = new Date(report.createdAt);
      const today = new Date();

      if (
        selectedPeriod === "TODAY" &&
        reportDate.getDate() !== today.getDate()
      ) {
        return false;
      }

      if (selectedPeriod === "THIS_WEEK") {
        const daysDiff = Math.floor(
          (today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 7) return false;
      }

      if (
        selectedPeriod === "THIS_MONTH" &&
        reportDate.getMonth() !== today.getMonth()
      ) {
        return false;
      }
    }

    return true;
  });

  // عرض التقرير بدلاً من تنزيله
  const handleViewReport = (report: Report) => {
    // التنقل إلى صفحة تفاصيل التقرير
    router.push(`/reports/${report.id}`);
  };

  // عرض شاشة التحميل إذا كان التحقق من المصادقة جاريًا
  if (authLoading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // التأكد من أن المستخدم مسجل الدخول
  if (!user) {
    return null; // سيقوم useEffect بإعادة التوجيه
  }

  // عرض حالة تحميل البيانات
  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل بيانات التقارير...</p>
        </div>
      </div>
    );
  }

  // عرض الخطأ إن وجد
  if (error) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4 text-red-600">حدث خطأ</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">التقارير</h1>
        <p className="text-gray-600">إدارة وعرض التقارير الخاصة بالمختبر.</p>
      </div>

      {/* شريط الأدوات */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
          onClick={() => router.push("/reports/generate")}
        >
          <FileText size={18} className="ml-2" />
          إنشاء تقرير جديد
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 pl-10 appearance-none"
            >
              <option value="ALL">جميع أنواع التقارير</option>
              <option value="PATIENT">تقارير المرضى</option>
              <option value="TEST">تقارير الفحوصات</option>
              <option value="FINANCIAL">التقارير المالية</option>
              <option value="SAMPLE">تقارير العينات</option>
              <option value="SUMMARY">التقارير الملخصة</option>
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={18} className="text-gray-400" />
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 pl-10 appearance-none"
            >
              <option value="ALL">جميع الفترات</option>
              <option value="TODAY">اليوم</option>
              <option value="THIS_WEEK">هذا الأسبوع</option>
              <option value="THIS_MONTH">هذا الشهر</option>
              <option value="CUSTOM">فترة مخصصة</option>
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Calendar size={18} className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* قائمة التقارير */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              لا توجد تقارير
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              لم يتم العثور على تقارير تطابق معايير البحث.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getReportIcon(report.type)}
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold">{report.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {report.description}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    تم الإنشاء: {formatArabicDate(report.createdAt)}
                  </p>
                </div>
                <div className="flex-shrink-0 self-start md:self-center mt-4 md:mt-0">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    <Eye size={16} className="ml-1" />
                    عرض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
