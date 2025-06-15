"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  FileText,
  Loader,
  Calendar,
  Users,
  Beaker,
  CreditCard,
  TestTube,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";

// أنواع التقارير
const reportTypes = [
  {
    id: "PATIENT",
    title: "تقرير المرضى",
    description: "تقرير عن المرضى المسجلين في النظام",
    icon: <Users className="h-6 w-6 text-blue-500" />,
  },
  {
    id: "TEST",
    title: "تقرير الفحوصات",
    description: "تقرير عن الفحوصات وإحصائياتها",
    icon: <Beaker className="h-6 w-6 text-red-500" />,
  },
  {
    id: "FINANCIAL",
    title: "التقرير المالي",
    description: "تقرير عن الإيرادات والمصروفات",
    icon: <CreditCard className="h-6 w-6 text-green-500" />,
  },
  {
    id: "SAMPLE",
    title: "تقرير العينات",
    description: "تقرير عن العينات التي تم جمعها وتحليلها",
    icon: <TestTube className="h-6 w-6 text-purple-500" />,
  },
  {
    id: "SUMMARY",
    title: "تقرير ملخص",
    description: "ملخص عام عن نشاط المختبر",
    icon: <FileText className="h-6 w-6 text-indigo-500" />,
  },
];

// فترات زمنية
const timePeriods = [
  { id: "TODAY", title: "اليوم" },
  { id: "YESTERDAY", title: "الأمس" },
  { id: "THIS_WEEK", title: "هذا الأسبوع" },
  { id: "LAST_WEEK", title: "الأسبوع الماضي" },
  { id: "THIS_MONTH", title: "هذا الشهر" },
  { id: "LAST_MONTH", title: "الشهر الماضي" },
  { id: "CUSTOM", title: "فترة مخصصة" },
];

export default function GenerateReportPage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("THIS_MONTH");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تأكد من وجود مستخدم مصرح
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

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

  const generateReport = async () => {
    if (!selectedType) {
      setError("يرجى اختيار نوع التقرير");
      return;
    }

    // التحقق من التواريخ إذا تم اختيار فترة مخصصة
    if (selectedPeriod === "CUSTOM") {
      if (!startDate) {
        setError("يرجى تحديد تاريخ البداية");
        return;
      }
      if (!endDate) {
        setError("يرجى تحديد تاريخ النهاية");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
        return;
      }
    }

    setError(null);
    setIsGenerating(true);

    try {
      // استدعاء API لتوليد التقرير
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
          period: selectedPeriod,
          startDate: selectedPeriod === "CUSTOM" ? startDate : undefined,
          endDate: selectedPeriod === "CUSTOM" ? endDate : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في توليد التقرير");
      }

      const data = await response.json();

      // إظهار رسالة نجاح
      toast.success("تم إنشاء التقرير بنجاح");

      // إعادة التوجيه إلى صفحة التقارير بعد التوليد الناجح
      router.push("/reports");
    } catch (error) {
      console.error("Error generating report:", error);
      setError(
        error instanceof Error ? error.message : "حدث خطأ أثناء توليد التقرير"
      );
      toast.error("فشل في إنشاء التقرير");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إنشاء تقرير جديد</h1>
        <p className="text-gray-600">
          حدد نوع التقرير والفترة الزمنية لإنشاء تقرير جديد.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">اختر نوع التقرير</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map((type) => (
            <div
              key={type.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedType === type.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{type.icon}</div>
                <div>
                  <h3 className="font-medium">{type.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">حدد الفترة الزمنية</h2>
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {timePeriods.map((period) => (
              <div
                key={period.id}
                className={`border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                  selectedPeriod === period.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
                onClick={() => setSelectedPeriod(period.id)}
              >
                {period.title}
              </div>
            ))}
          </div>
        </div>

        {selectedPeriod === "CUSTOM" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                تاريخ البداية
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                تاريخ النهاية
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-3"
          onClick={() => router.push("/reports")}
        >
          إلغاء
        </button>
        <button
          type="button"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
          onClick={generateReport}
          disabled={isGenerating || !selectedType}
        >
          {isGenerating ? (
            <>
              <Loader className="animate-spin ml-2 h-4 w-4" />
              جاري التوليد...
            </>
          ) : (
            <>
              <Save className="ml-2 h-4 w-4" />
              توليد التقرير
            </>
          )}
        </button>
      </div>
    </div>
  );
}
