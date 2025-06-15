"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  TestTube,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Trash,
} from "lucide-react";
import SampleRegistrationModal from "@/components/samples/SampleRegistrationModal";
import SampleDetailsModal from "@/components/samples/SampleDetailsModal";
import SampleResultsModal from "@/components/samples/SampleResultsModal";
import DeleteSampleModal from "@/components/samples/DeleteSampleModal";
import SamplesFilters from "@/components/samples/SamplesFilters";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function SamplesPage() {
  const { user, token } = useAuth();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // إضافة حالات لخيارات الفلترة والترتيب
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");

  // Fetch samples from API
  useEffect(() => {
    if (!user || !token) return;

    const fetchSamples = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/samples", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "حدث خطأ أثناء جلب بيانات العينات"
          );
        }
        const data = await response.json();
        setSamples(data);
      } catch (err: any) {
        console.error("Error fetching samples:", err);
        setError(err.message || "حدث خطأ أثناء جلب بيانات العينات");
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();
  }, [user, token, refreshTrigger]);

  // Function to handle sample registration
  const handleSampleRegistered = () => {
    toast.success("تم تسجيل العينة بنجاح");
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to handle sample deletion
  const handleSampleDeleted = () => {
    toast.success("تم حذف العينة بنجاح");
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to handle sample results update
  const handleResultsUpdated = () => {
    toast.success("تم حفظ نتائج العينة بنجاح");
    setRefreshTrigger((prev) => prev + 1);
  };

  // Function to open details modal
  const openDetailsModal = (sample: any) => {
    setSelectedSample(sample);
    setIsDetailsModalOpen(true);
  };

  // Function to open results modal
  const openResultsModal = (sample: any) => {
    setSelectedSample(sample);
    setIsResultsModalOpen(true);
  };

  // Function to open delete confirmation modal
  const openDeleteModal = (sample: any) => {
    setSelectedSample(sample);
    setIsDeleteModalOpen(true);
  };

  // وظيفة طباعة نتيجة العينة
  const handlePrintSampleResults = (sample: any) => {
    if (!sample) return;

    // إنشاء نافذة طباعة جديدة
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("الرجاء السماح بالنوافذ المنبثقة لتمكين الطباعة");
      return;
    }

    // الحصول على التاريخ الحالي بتنسيق عربي
    const currentDate = format(new Date(), "dd/MM/yyyy", { locale: ar });

    // إعداد معلومات العينة
    const testName = sample.testAssignment?.test?.name || "—";
    const patientName = sample.testAssignment?.patient?.name || "—";
    const patientFileNumber = sample.testAssignment?.patient?.fileNumber || "—";
    const sampleCode = sample.sampleCode || "—";
    const collectDate = sample.createdAt
      ? format(new Date(sample.createdAt), "dd/MM/yyyy", { locale: ar })
      : "—";
    const sampleNotes = sample.notes || "";

    // إنشاء محتوى HTML للطباعة
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>نتيجة فحص - ${testName}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
            }
            body {
              font-family: Arial, Tahoma, sans-serif;
              margin: 0;
              padding: 20px;
              direction: rtl;
              color: #333;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 10px;
            }
            .lab-info {
              text-align: center;
              flex: 1;
            }
            .lab-logo {
              font-size: 24px;
              font-weight: bold;
              color: #4F46E5;
              margin-bottom: 5px;
            }
            .lab-title {
              font-size: 18px;
              color: #333;
            }
            .report-date {
              text-align: left;
            }
            .report-title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
              color: #4F46E5;
            }
            .info-section {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background-color: #f9fafb;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #4F46E5;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .info-item {
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: bold;
              margin-left: 5px;
              color: #4b5563;
            }
            .results-section {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background-color: #fff;
            }
            .results-content {
              white-space: pre-wrap;
              font-family: Arial, sans-serif;
              line-height: 1.5;
              background: white;
              padding: 10px;
              border-radius: 5px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
            .signature {
              margin-top: 60px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #333;
              padding-top: 5px;
              text-align: center;
            }
            .print-button {
              background-color: #4F46E5;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 20px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div></div>
            <div class="lab-info">
              <div class="lab-logo">المعمل الطبي</div>
              <div class="lab-title">نتائج الفحوصات المخبرية</div>
            </div>
            <div class="report-date">
              تاريخ التقرير: ${currentDate}
            </div>
          </div>

          <div class="report-title">تقرير نتيجة فحص مخبري</div>

          <div class="info-section">
            <div class="section-title">معلومات المريض</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">اسم المريض:</span>
                <span>${patientName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الملف:</span>
                <span>${patientFileNumber}</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div class="section-title">معلومات العينة والفحص</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">اسم الفحص:</span>
                <span>${testName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رمز العينة:</span>
                <span>${sampleCode}</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ سحب العينة:</span>
                <span>${collectDate}</span>
              </div>
              <div class="info-item">
                <span class="info-label">فئة الفحص:</span>
                <span>${sample.testAssignment?.test?.category || "—"}</span>
              </div>
            </div>
            ${
              sampleNotes
                ? `
            <div class="info-item" style="margin-top: 10px;">
              <span class="info-label">ملاحظات:</span>
              <span>${sampleNotes}</span>
            </div>
            `
                : ""
            }
          </div>

          <div class="results-section">
            <div class="section-title">نتائج الفحص</div>
            <div class="results-content">
              ${sample.results || "لم يتم إدخال نتائج بعد"}
            </div>
          </div>

          <div class="signature">
            <div class="signature-line">
              توقيع الفني المسؤول
            </div>
          </div>

          <div class="footer">
            هذا التقرير تم إصداره إلكترونياً من نظام المعمل الطبي - جميع الحقوق محفوظة © ${new Date().getFullYear()}
          </div>

          <button class="print-button" onclick="window.print()">طباعة التقرير</button>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Function to map status to Arabic text with color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          text: "قيد الانتظار",
          color: "bg-yellow-100 text-yellow-800",
        };
      case "SAMPLE_COLLECTED":
        return {
          text: "تم جمع العينة",
          color: "bg-blue-100 text-blue-800",
        };
      case "PROCESSING":
        return {
          text: "قيد المعالجة",
          color: "bg-indigo-100 text-indigo-800",
        };
      case "COMPLETED":
        return {
          text: "مكتمل",
          color: "bg-green-100 text-green-800",
        };
      case "CANCELLED":
        return {
          text: "ملغي",
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          text: status,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  // تنظيف جميع الفلاتر
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setSortOrder("newest");
  };

  // Filter and sort samples based on criteria
  const processedSamples = samples
    .filter((sample: any) => {
      // البحث النصي
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        sample.sampleCode?.toLowerCase().includes(searchTermLower) ||
        sample.testAssignment?.test?.name
          ?.toLowerCase()
          .includes(searchTermLower) ||
        sample.testAssignment?.patient?.name
          ?.toLowerCase()
          .includes(searchTermLower) ||
        sample.collectedBy?.name?.toLowerCase().includes(searchTermLower);

      // الفلترة حسب الحالة
      const matchesStatus =
        statusFilter === "ALL" ||
        sample.testAssignment?.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) => {
      // الترتيب حسب التاريخ
      const dateA = new Date(a.collectedAt || a.createdAt).getTime();
      const dateB = new Date(b.collectedAt || b.createdAt).getTime();

      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  if (!user) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">جاري تحميل البيانات...</h1>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "LAB_TECHNICIAN") {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h1>
        <p>ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة العينات</h1>
        <p className="text-gray-600">
          إدارة عينات المختبر وتتبع حالتها ونتائجها.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
          onClick={() => setIsRegistrationModalOpen(true)}
        >
          <Plus size={18} className="ml-2" />
          تسجيل عينة جديدة
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="البحث عن عينة..."
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
              dir="rtl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`${
              showFilters
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-700"
            } p-2.5 rounded-lg flex items-center relative`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            {(statusFilter !== "ALL" || sortOrder !== "newest") && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* استخدام مكون الفلترة المنفصل */}
      <SamplesFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearFilters={clearAllFilters}
      />

      {/* Modals */}
      <SampleRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        onSampleRegistered={handleSampleRegistered}
      />

      {selectedSample && (
        <>
          <SampleDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            sample={selectedSample}
          />

          <SampleResultsModal
            isOpen={isResultsModalOpen}
            onClose={() => setIsResultsModalOpen(false)}
            sample={selectedSample}
            onSaveResults={handleResultsUpdated}
          />

          <DeleteSampleModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={handleSampleDeleted}
            sampleCode={selectedSample.sampleCode}
          />
        </>
      )}

      {/* Samples Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : processedSamples.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchTerm || statusFilter !== "ALL"
              ? "لا توجد نتائج مطابقة للفلاتر المحددة"
              : "لا توجد عينات مسجلة بعد"}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  رمز العينة
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  اسم الفحص
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  اسم المريض
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  الحالة
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  تاريخ الجمع
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  الفني المسؤول
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedSamples.map((sample: any) => {
                const statusInfo = getStatusInfo(
                  sample.testAssignment?.status || "PENDING"
                );

                // تنسيق تاريخ جمع العينة
                const collectionDate = sample.collectedAt
                  ? format(new Date(sample.collectedAt), "dd/MM/yyyy", {
                      locale: ar,
                    })
                  : "—";

                return (
                  <tr key={sample.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {sample.sampleCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sample.testAssignment?.test?.name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sample.testAssignment?.patient?.name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}
                      >
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {collectionDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {sample.collectedBy?.name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => openDetailsModal(sample)}
                        >
                          تفاصيل
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900 flex items-center"
                          onClick={() => openResultsModal(sample)}
                        >
                          <FileText size={16} className="ml-1" />
                          النتائج
                        </button>
                        {sample.results && (
                          <button
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            onClick={() => handlePrintSampleResults(sample)}
                          >
                            <Printer size={16} className="ml-1" />
                            طباعة
                          </button>
                        )}
                        <button
                          className="text-red-600 hover:text-red-900 flex items-center"
                          onClick={() => openDeleteModal(sample)}
                        >
                          <Trash size={16} className="ml-1" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
