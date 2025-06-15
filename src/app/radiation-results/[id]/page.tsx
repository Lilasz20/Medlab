"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  Loader,
  Edit,
  Trash,
  FileText,
  Download,
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
  description: string | null;
  resultDetails: string;
  reportText: string | null;
  imageUrl: string | null;
  pdfUrl: string | null;
  patientId: string;
  testAssignmentId: string;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  patient?: {
    id: string;
    name: string;
    fileNumber: string;
    gender: string;
    dateOfBirth?: string;
  };
  testAssignment?: {
    id: string;
    test: {
      id: string;
      name: string;
      category: string;
    };
  };
  createdBy?: {
    id: string;
    name: string;
  };
}

export default function RadiationResultDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // تجنب الوصول المباشر لـ params واستخراج المعرف من المسار مباشرة
  const pathname = usePathname();
  // استخراج آخر جزء من المسار كمعرف
  const id = pathname.split("/").pop() || "";

  const [result, setResult] = useState<RadiationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { token, user } = useAuth();
  const router = useRouter();

  // جلب بيانات نتيجة الأشعة
  const fetchRadiationResult = async () => {
    if (!id) {
      setError("معرف نتيجة الأشعة غير متوفر");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/radiation-results/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("نتيجة الأشعة غير موجودة");
        }
        throw new Error("فشل في جلب بيانات نتيجة الأشعة");
      }

      const data = await response.json();
      // استخدام Type Assertion لتجنب مشاكل عدم توافق الأنواع
      setResult(data as RadiationResult);
    } catch (error) {
      console.error("Error fetching radiation result:", error);
      setError(
        error instanceof Error ? error.message : "حدث خطأ أثناء جلب البيانات"
      );
      toast.error("حدث خطأ أثناء جلب بيانات نتيجة الأشعة");
    } finally {
      setLoading(false);
    }
  };

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    if (token) {
      fetchRadiationResult();
    }
  }, [token, id]);

  // إغلاق النموذج وتحديث البيانات إذا لزم الأمر
  const handleFormClose = (shouldRefresh: boolean = false) => {
    setShowForm(false);
    if (shouldRefresh) {
      fetchRadiationResult();
    }
  };

  // فتح نموذج تعديل نتيجة الأشعة
  const handleEdit = () => {
    setShowForm(true);
  };

  // حذف نتيجة الأشعة
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  // تأكيد الحذف
  const confirmDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/radiation-results/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في حذف نتيجة الأشعة");
      }

      toast.success("تم حذف نتيجة الأشعة بنجاح");
      router.push("/radiation-results");
    } catch (error) {
      console.error("Error deleting radiation result:", error);
      toast.error("حدث خطأ أثناء حذف نتيجة الأشعة");
    } finally {
      setIsDeleting(false);
    }
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
          <p className="text-lg">جاري تحميل بيانات نتيجة الأشعة...</p>
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
        <button
          onClick={() => router.push("/radiation-results")}
          className="mt-4 flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          العودة إلى قائمة نتائج الأشعة
        </button>
      </div>
    );
  }

  // عرض الرسالة إذا لم يتم العثور على النتيجة
  if (!result) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">نتيجة الأشعة غير موجودة</h1>
        <button
          onClick={() => router.push("/radiation-results")}
          className="mt-4 flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          العودة إلى قائمة نتائج الأشعة
        </button>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push("/radiation-results")}
              className="text-gray-600 hover:text-indigo-700"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">{result.title}</h1>
          </div>
          <p className="text-gray-600">
            تم الإنشاء بتاريخ:{" "}
            {format(new Date(result.createdAt), "dd/MM/yyyy", {
              locale: ar,
            })}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        {canManageResults && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Edit className="h-4 w-4 ml-1" />
              تعديل
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            >
              <Trash className="h-4 w-4 ml-1" />
              حذف
            </button>
          </div>
        )}
      </div>

      {/* محتوى الصفحة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* القسم الأيمن: معلومات المريض والفحص */}
        <div className="md:col-span-1 space-y-6">
          {/* بطاقة معلومات المريض */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              معلومات المريض
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-sm">الاسم</p>
                <p className="font-medium">
                  {result.patient?.name || "غير متوفر"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">رقم الملف</p>
                <p className="font-medium">
                  {result.patient?.fileNumber || "غير متوفر"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">الجنس</p>
                <p className="font-medium">
                  {result.patient?.gender === "MALE"
                    ? "ذكر"
                    : result.patient?.gender === "FEMALE"
                    ? "أنثى"
                    : "غير متوفر"}
                </p>
              </div>
              {result.patient?.dateOfBirth && (
                <div>
                  <p className="text-gray-500 text-sm">تاريخ الميلاد</p>
                  <p className="font-medium">
                    {format(
                      new Date(result.patient.dateOfBirth),
                      "dd/MM/yyyy",
                      {
                        locale: ar,
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* بطاقة معلومات الفحص */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              معلومات الفحص
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-sm">اسم الفحص</p>
                <p className="font-medium">
                  {result.testAssignment?.test.name || "غير متوفر"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">الفئة</p>
                <p className="font-medium">
                  {result.testAssignment?.test.category || "غير متوفر"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">بواسطة</p>
                <p className="font-medium">
                  {result.createdBy?.name || "غير متوفر"}
                </p>
              </div>
            </div>
          </div>

          {/* بطاقة المرفقات */}
          {(result.imageUrl || result.pdfUrl) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                المرفقات
              </h2>
              <div className="space-y-4">
                {result.imageUrl && (
                  <div>
                    <p className="text-gray-500 text-sm mb-2">صورة الأشعة</p>
                    <a
                      href={result.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-indigo-600 hover:text-indigo-800"
                    >
                      <Download className="h-4 w-4 ml-1" />
                      عرض صورة الأشعة
                    </a>
                  </div>
                )}
                {result.pdfUrl && (
                  <div>
                    <p className="text-gray-500 text-sm mb-2">ملف PDF</p>
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-indigo-600 hover:text-indigo-800"
                    >
                      <FileText className="h-4 w-4 ml-1" />
                      عرض التقرير
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* القسم الأيسر: تفاصيل النتيجة والتقرير */}
        <div className="md:col-span-2 space-y-6">
          {/* بطاقة تفاصيل النتيجة */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              تفاصيل النتيجة
            </h2>
            {result.description && (
              <div className="mb-4">
                <p className="text-gray-500 text-sm mb-1">الوصف</p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.description}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-sm mb-1">النتيجة</p>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.resultDetails}
                </p>
              </div>
            </div>
          </div>

          {/* بطاقة التقرير المفصل */}
          {result.reportText && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                التقرير المفصل
              </h2>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.reportText}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نموذج تعديل نتيجة الأشعة */}
      {showForm && (
        <RadiationResultForm
          isOpen={showForm}
          onClose={() => {
            handleFormClose(true);
          }}
          initialData={{
            ...result,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
          }}
          mode="edit"
        />
      )}

      {/* نافذة تأكيد الحذف */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="تأكيد حذف نتيجة الأشعة"
        message={`هل أنت متأكد من رغبتك في حذف نتيجة الأشعة "${
          result?.title || ""
        }"؟`}
        type="delete"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
