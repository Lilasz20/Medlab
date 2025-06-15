"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader,
  Search,
  Filter,
  Plus,
  FileText,
  Edit,
  Trash,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";
import RadiationResultForm from "@/components/radiation-results/RadiationResultForm";
import ConfirmationModal from "@/components/common/ConfirmationModal";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RadiationResult {
  id: string;
  title: string;
  description?: string;
  resultDetails: string;
  reportText?: string;
  imageUrl?: string;
  pdfUrl?: string;
  patientId: string;
  testAssignmentId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    name: string;
    fileNumber: string;
  };
  testAssignment?: {
    id: string;
    test: {
      id: string;
      name: string;
    };
  };
  createdBy?: {
    id: string;
    name: string;
  };
}

export default function RadiationResultsPage() {
  const [radiationResults, setRadiationResults] = useState<RadiationResult[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedResult, setSelectedResult] = useState<RadiationResult | null>(
    null
  );
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { token, user } = useAuth();
  const router = useRouter();

  // جلب نتائج الأشعة
  const fetchRadiationResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/radiation-results", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في جلب نتائج الأشعة");
      }

      const data = await response.json();
      setRadiationResults(data);
    } catch (error) {
      console.error("Error fetching radiation results:", error);
      setError("حدث خطأ أثناء جلب نتائج الأشعة");
      toast.error("حدث خطأ أثناء جلب نتائج الأشعة");
    } finally {
      setLoading(false);
    }
  };

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    if (token) {
      fetchRadiationResults();
    }
  }, [token]);

  // معالجة البحث
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // تصفية النتائج حسب البحث
  const filteredResults = radiationResults.filter((result) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      result.title.toLowerCase().includes(searchTerm) ||
      (result.description?.toLowerCase().includes(searchTerm) ?? false) ||
      (result.patient?.name.toLowerCase().includes(searchTerm) ?? false) ||
      (result.patient?.fileNumber.toLowerCase().includes(searchTerm) ??
        false) ||
      (result.testAssignment?.test.name.toLowerCase().includes(searchTerm) ??
        false)
    );
  });

  // فتح نموذج إضافة نتيجة جديدة
  const handleAddResult = () => {
    setSelectedResult(null);
    setFormMode("create");
    setShowForm(true);
  };

  // فتح نموذج تعديل نتيجة
  const handleEditResult = (result: RadiationResult) => {
    setSelectedResult(result);
    setFormMode("edit");
    setShowForm(true);
  };

  // إغلاق النموذج وتحديث البيانات إذا لزم الأمر
  const handleFormClose = (shouldRefresh: boolean = false) => {
    setShowForm(false);
    // إذا كان هناك حاجة لتحديث البيانات (بعد إضافة أو تعديل)
    if (shouldRefresh) {
      fetchRadiationResults();
    }
  };

  // فتح نافذة تأكيد الحذف
  const handleDeleteResult = (result: RadiationResult) => {
    setSelectedResult(result);
    setShowDeleteModal(true);
  };

  // حذف نتيجة
  const confirmDeleteResult = async () => {
    if (!selectedResult) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/radiation-results/${selectedResult.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("فشل في حذف نتيجة الأشعة");
      }

      toast.success("تم حذف نتيجة الأشعة بنجاح");
      setRadiationResults(
        radiationResults.filter((result) => result.id !== selectedResult.id)
      );
      setShowDeleteModal(false);
      setSelectedResult(null);
    } catch (error) {
      console.error("Error deleting radiation result:", error);
      toast.error("حدث خطأ أثناء حذف نتيجة الأشعة");
    } finally {
      setIsDeleting(false);
    }
  };

  // عرض تفاصيل نتيجة
  const handleViewResult = (id: string) => {
    router.push(`/radiation-results/${id}`);
  };

  // التحقق من صلاحيات المستخدم
  const canManageResults =
    user?.role === "ADMIN" || user?.role === "LAB_TECHNICIAN";

  // عرض حالة التحميل
  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل نتائج الأشعة...</p>
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
        <h1 className="text-2xl font-bold mb-2">إدارة نتائج الأشعة</h1>
        <p className="text-gray-600">إدارة نتائج الأشعة وتقاريرها.</p>
      </div>

      {/* شريط الإجراءات */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        {canManageResults && (
          <button
            onClick={handleAddResult}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={18} className="ml-2" />
            إضافة نتيجة جديدة
          </button>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="البحث في نتائج الأشعة..."
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
            dir="rtl"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* جدول نتائج الأشعة */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                العنوان
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                المريض
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                نوع الفحص
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                تاريخ الإنشاء
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                بواسطة
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
            {filteredResults.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  {searchQuery
                    ? "لا توجد نتائج مطابقة للبحث"
                    : "لا توجد نتائج أشعة"}
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {result.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.patient?.name || "غير متوفر"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.testAssignment?.test.name || "غير متوفر"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(result.createdAt), "dd/MM/yyyy", {
                      locale: ar,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {result.createdBy?.name || "غير متوفر"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        onClick={() => handleViewResult(result.id)}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        <span>عرض</span>
                      </button>
                      {canManageResults && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-900 flex items-center mr-2"
                            onClick={() => handleEditResult(result)}
                          >
                            <Edit className="h-4 w-4 ml-1" />
                            <span>تعديل</span>
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 flex items-center mr-2"
                            onClick={() => handleDeleteResult(result)}
                          >
                            <Trash className="h-4 w-4 ml-1" />
                            <span>حذف</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* نموذج إضافة/تعديل نتيجة */}
      {showForm && (
        <RadiationResultForm
          isOpen={showForm}
          onClose={() => handleFormClose(true)}
          initialData={
            formMode === "edit" && selectedResult
              ? {
                  ...selectedResult,
                  createdAt: new Date(selectedResult.createdAt),
                  updatedAt: new Date(selectedResult.updatedAt),
                  description: selectedResult.description || null,
                  reportText: selectedResult.reportText || null,
                  imageUrl: selectedResult.imageUrl || null,
                  pdfUrl: selectedResult.pdfUrl || null,
                }
              : undefined
          }
          mode={formMode}
        />
      )}

      {/* نافذة تأكيد الحذف */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="تأكيد حذف نتيجة الأشعة"
        message={`هل أنت متأكد من رغبتك في حذف نتيجة الأشعة "${
          selectedResult?.title || ""
        }"؟`}
        type="delete"
        isLoading={isDeleting}
        onConfirm={confirmDeleteResult}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
