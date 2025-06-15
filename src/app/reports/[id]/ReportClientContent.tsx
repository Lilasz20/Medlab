"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  FileText,
  Loader,
  ArrowRight,
  Calendar,
  Download,
  Printer,
  ChevronLeft,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AgeDistribution {
  range: string;
  count: number;
}

interface ReportDetail {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  pdfUrl?: string;
  totalCount?: number;
  maleCount?: number;
  femaleCount?: number;
  averageAge?: number;
  newPatients?: number;
  returnPatients?: number;
  ageDistribution?: AgeDistribution[];
  testAssignments?: number;
  [key: string]: any; // لأي تفاصيل إضافية حسب نوع التقرير
}

export default function ReportClientContent({
  reportId,
}: {
  reportId: string;
}) {
  const { user, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // تحقق من وجود مستخدم مصرح قبل جلب البيانات
    if (authLoading) return;

    // إذا لم يكن المستخدم مسجلاً، عد إلى صفحة تسجيل الدخول
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // جلب بيانات التقرير من API
    const fetchReportData = async () => {
      try {
        setLoading(true);

        // استدعاء API للحصول على بيانات التقرير
        const response = await fetch(`/api/reports/${reportId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "فشل في جلب التقرير");
        }

        const data = await response.json();
        setReport(data.report);
      } catch (error) {
        console.error("Error fetching report:", error);
        setError("حدث خطأ أثناء جلب بيانات التقرير");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportId, user, authLoading, router, token]);

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
          <p className="text-lg">جاري تحميل بيانات التقرير...</p>
        </div>
      </div>
    );
  }

  // عرض الخطأ إن وجد
  if (error || !report) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4 text-red-600">حدث خطأ</h1>
        <p>{error || "لم يتم العثور على التقرير"}</p>
        <button
          onClick={() => router.push("/reports")}
          className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ChevronLeft className="ml-1 h-4 w-4" />
          العودة إلى التقارير
        </button>
      </div>
    );
  }

  // تنسيق التواريخ
  const formatArabicDate = (date: string) => {
    return format(new Date(date), "dd MMMM yyyy", { locale: ar });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (report.pdfUrl) {
      window.open(report.pdfUrl, "_blank");
    } else {
      alert("الملف غير متوفر للتحميل حاليًا");
    }
  };

  const handleShare = () => {
    alert("سيتم تفعيل خاصية المشاركة قريباً");
  };

  return (
    <div className="w-full" dir="rtl">
      {/* رأس الصفحة */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/reports")}
            className="mb-2 flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة إلى التقارير
          </button>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Calendar className="ml-1 h-4 w-4" />
            <span>
              الفترة: {formatArabicDate(report.startDate)} -{" "}
              {formatArabicDate(report.endDate)}
            </span>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-reverse space-x-2">
          {report.pdfUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="ml-1 h-4 w-4" />
              تحميل PDF
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Share2 className="ml-1 h-4 w-4" />
            مشاركة
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="ml-1 h-4 w-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* محتوى التقرير */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* رأس التقرير */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600 ml-3" />
            <div>
              <h2 className="text-xl font-bold">{report.title}</h2>
              <p className="text-gray-500 text-sm">
                تم الإنشاء: {formatArabicDate(report.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* بيانات التقرير - ستختلف حسب نوع التقرير */}
        <div className="p-6">
          {report.type === "PATIENT" && (
            <div className="space-y-6">
              {/* ملخص سريع */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي المرضى بالنظام</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {report.totalCount}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">مرضى جدد خلال الفترة</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.newPatients}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    مرضى عائدين خلال الفترة
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {report.returnPatients}
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">متوسط العمر</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {report.averageAge}
                  </p>
                </div>
              </div>

              {/* إحصائيات الجنس */}
              {report.maleCount !== undefined &&
                report.femaleCount !== undefined && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">توزيع الجنس</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">ذكور</span>
                        <span className="font-semibold">
                          {report.maleCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{
                            width: `${
                              (report.maleCount / (report.totalCount || 1)) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between mb-2 mt-4">
                        <span className="text-gray-600">إناث</span>
                        <span className="font-semibold">
                          {report.femaleCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-pink-500 h-2.5 rounded-full"
                          style={{
                            width: `${
                              (report.femaleCount / (report.totalCount || 1)) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

              {/* توزيع الأعمار */}
              {report.ageDistribution && report.ageDistribution.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">توزيع الأعمار</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {report.ageDistribution.map(
                      (age: AgeDistribution, index: number) => (
                        <div key={index} className="mb-4 last:mb-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">{age.range}</span>
                            <span className="font-semibold">{age.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-indigo-500 h-2.5 rounded-full"
                              style={{
                                width: `${
                                  (age.count / (report.totalCount || 1)) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* إحصائيات الفحوصات */}
              {report.testAssignments !== undefined && (
                <div>
                  <h3 className="text-lg font-semibold">إحصائيات الفحوصات</h3>
                  <p className="text-gray-600 mb-2">
                    إجمالي الفحوصات المسندة للمرضى خلال هذه الفترة:
                    <span className="font-semibold mr-1">
                      {report.testAssignments}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    متوسط الفحوصات لكل مريض:
                    <span className="font-semibold mr-1">
                      {(
                        report.testAssignments / (report.totalCount || 1)
                      ).toFixed(1)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* التقارير الأخرى - يمكن إضافة عرض لأنواع أخرى من التقارير */}
          {report.type === "TEST" && (
            <div className="space-y-6">
              {/* بيانات تقرير الفحوصات */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي الفحوصات</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {report.totalTests}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فحوصات مكتملة</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.completedTests}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فحوصات معلقة</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.pendingTests}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فحوصات ملغاة</p>
                  <p className="text-2xl font-bold text-red-700">
                    {report.cancelledTests}
                  </p>
                </div>
              </div>

              {/* فئات الفحوصات */}
              {report.testCategories && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">فئات الفحوصات</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {report.testCategories.map(
                      (category: any, index: number) => (
                        <div key={index} className="mb-4 last:mb-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">
                              {category.name}
                            </span>
                            <span className="font-semibold">
                              {category.count}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-indigo-500 h-2.5 rounded-full"
                              style={{
                                width: `${
                                  (category.count / (report.totalTests || 1)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تقرير مالي */}
          {report.type === "FINANCIAL" && (
            <div className="space-y-6">
              {/* بيانات مالية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.totalRevenue?.toLocaleString()} ل.س
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">المبالغ المدفوعة</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {report.paidAmount?.toLocaleString()} ل.س
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">المبالغ المعلقة</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.pendingAmount?.toLocaleString()} ل.س
                  </p>
                </div>
              </div>

              {/* إحصائيات الفواتير */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">عدد الفواتير</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {report.invoiceCount}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فواتير مدفوعة</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.paidInvoices}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">فواتير غير مدفوعة</p>
                  <p className="text-2xl font-bold text-red-700">
                    {report.unpaidInvoices}
                  </p>
                </div>
              </div>

              {/* أعلى الخدمات ربحًا */}
              {report.topServices && report.topServices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    أعلى الخدمات ربحًا
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {report.topServices.map((service: any, index: number) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">{service.name}</span>
                          <span className="font-semibold">
                            {service.revenue?.toLocaleString()} ل.س
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full"
                            style={{
                              width: `${
                                (service.revenue / (report.totalRevenue || 1)) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تقرير العينات */}
          {report.type === "SAMPLE" && (
            <div className="space-y-6">
              {/* إحصائيات العينات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي العينات</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {report.totalSamples}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">عينات بنتائج</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.samplesWithResults}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">عينات بدون نتائج</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.samplesWithoutResults}
                  </p>
                </div>
              </div>

              {/* توزيع أنواع العينات */}
              {report.collectionTypeDistribution && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    توزيع أنواع العينات
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">عينات دم</p>
                      <p className="text-2xl font-bold text-red-700">
                        {report.collectionTypeDistribution.blood}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">عينات بول</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {report.collectionTypeDistribution.urine}
                      </p>
                    </div>
                    <div className="bg-brown-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">عينات براز</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {report.collectionTypeDistribution.stool}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">عينات أخرى</p>
                      <p className="text-2xl font-bold text-gray-700">
                        {report.collectionTypeDistribution.other}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تقرير الملخص */}
          {report.type === "SUMMARY" && (
            <div className="space-y-6">
              {/* ملخص إحصائيات المختبر */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي المرضى</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {report.patientCount}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي الفحوصات</p>
                  <p className="text-2xl font-bold text-green-700">
                    {report.testCount}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي العينات</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {report.sampleCount}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">إجمالي الفواتير</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.invoiceCount}
                  </p>
                </div>
              </div>

              {/* ملخص الإيرادات */}
              {report.revenueSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {report.revenueSummary.total?.toLocaleString()} ل.س
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      متوسط الإيرادات للفاتورة
                    </p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {report.revenueSummary.average?.toLocaleString()} ل.س
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* إذا كان نوع التقرير غير معروف */}
          {report.type !== "PATIENT" &&
            report.type !== "TEST" &&
            report.type !== "FINANCIAL" &&
            report.type !== "SAMPLE" &&
            report.type !== "SUMMARY" && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  عرض تفاصيل {report.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  لعرض تفاصيل أكثر، يرجى الاطلاع على نسخة PDF من التقرير.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
