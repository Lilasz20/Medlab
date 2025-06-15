"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

// المكونات
import MainLayout from "@/components/layout/MainLayout";
import LoadingSpinner from "@/components/LoadingSpinner";

// الأيقونات
import {
  FileBox,
  ArrowRight,
  Save,
  PlusCircle,
  MinusCircle,
  History,
  Edit,
  AlertTriangle,
} from "lucide-react";

// تعريف نوع المادة المخبرية
interface LabMaterial {
  id: string;
  name: string;
  code: string | null;
  category: string;
  description: string | null;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  price: number | null;
  supplier: string | null;
  expiryDate: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// تعريف نموذج معاملة المادة
interface TransactionFormData {
  materialId: string;
  type: string;
  quantity: string;
  reason: string;
  batchNumber: string;
  invoiceNumber: string;
}

// مكون لصفحة تفاصيل المادة المخبرية
function MaterialDetailsContent({ id }: { id: string }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<LabMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);

  // حالة نموذج المعاملة
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState<"ADD" | "REDUCE">(
    "ADD"
  );
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    materialId: id,
    type: "ADD",
    quantity: "",
    reason: "",
    batchNumber: "",
    invoiceNumber: "",
  });

  // استرجاع بيانات المادة المخبرية
  const fetchMaterial = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/lab-materials/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMaterial(response.data.material);
    } catch (error) {
      console.error("Error fetching lab material:", error);
      toast.error("حدث خطأ أثناء استرجاع بيانات المادة المخبرية");
      setError("لا يمكن العثور على المادة المخبرية المطلوبة");
    } finally {
      setLoading(false);
    }
  };

  // استرجاع البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchMaterial();
  }, [id, token]);

  // إظهار نموذج إضافة كمية
  const showAddForm = () => {
    setTransactionType("ADD");
    setFormData({
      materialId: id,
      type: "ADD",
      quantity: "",
      reason: "",
      batchNumber: "",
      invoiceNumber: "",
    });
    setShowTransactionForm(true);
  };

  // إظهار نموذج تخفيض كمية
  const showReduceForm = () => {
    setTransactionType("REDUCE");
    setFormData({
      materialId: id,
      type: "REDUCE",
      quantity: "",
      reason: "",
      batchNumber: "",
      invoiceNumber: "",
    });
    setShowTransactionForm(true);
  };

  // معالجة تغيير قيم الحقول
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // معالجة تقديم نموذج المعاملة
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !material) return;

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("يرجى إدخال كمية صالحة أكبر من صفر");
      return;
    }

    if (transactionType === "REDUCE" && quantity > material.currentQuantity) {
      toast.error(
        `لا يمكن تخفيض كمية أكبر من الكمية المتاحة (${material.currentQuantity})`
      );
      return;
    }

    try {
      setProcessingTransaction(true);

      // تحويل البيانات إلى الأنواع الصحيحة قبل الإرسال
      const dataToSend = {
        ...formData,
        type: transactionType,
        quantity: quantity,
        materialId: material.id,
        reason:
          formData.reason ||
          (transactionType === "ADD" ? "إضافة للمخزون" : "تخفيض من المخزون"),
        batchNumber: formData.batchNumber || null,
        invoiceNumber: formData.invoiceNumber || null,
      };

      const response = await axios.post(
        "/api/lab-materials/transactions",
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        transactionType === "ADD"
          ? "تمت إضافة الكمية بنجاح"
          : "تم تخفيض الكمية بنجاح"
      );

      // تحديث بيانات المادة
      fetchMaterial();
      setShowTransactionForm(false);
    } catch (error) {
      console.error("Error processing transaction:", error);
      toast.error("حدث خطأ أثناء معالجة العملية");
    } finally {
      setProcessingTransaction(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "غير محدد";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      return "تاريخ غير صالح";
    }
  };

  // عرض رسالة التحميل
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // عرض رسالة الخطأ
  if (error || !material) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{error}</h2>
        <button
          onClick={() => router.push("/lab-materials")}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <ArrowRight size={18} className="ml-2" />
          العودة لقائمة المواد
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">تفاصيل المادة المخبرية</h1>
        <p className="text-gray-600">
          عرض معلومات المادة المخبرية وإدارة المخزون.
        </p>
      </div>

      {/* قسم الإجراءات */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Link
          href="/lab-materials"
          className="bg-gray-100 text-gray-700 p-2.5 rounded-lg flex items-center hover:bg-gray-200"
        >
          <ArrowRight size={18} className="ml-1" />
          العودة للقائمة
        </Link>

        <Link
          href={`/lab-materials/transactions?materialId=${material.id}`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
        >
          <History size={18} className="ml-2" />
          سجل الحركات
        </Link>
      </div>

      {/* بطاقة تفاصيل المادة */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {material.name}
              {material.code && (
                <span className="text-sm text-gray-500 font-normal mr-2">
                  (الرمز: {material.code})
                </span>
              )}
            </h2>
            {material.currentQuantity <= material.minimumQuantity && (
              <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm flex items-center">
                <AlertTriangle size={16} className="ml-1" />
                مخزون منخفض
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">التصنيف</div>
            <div className="font-medium">
              {material.category === "REAGENT" && "كاشف"}
              {material.category === "CONSUMABLE" && "مستهلكات"}
              {material.category === "EQUIPMENT" && "معدات/أدوات"}
              {material.category === "GLASSWARE" && "زجاجيات"}
              {material.category === "CHEMICAL" && "مواد كيميائية"}
              {material.category === "OTHER" && "أخرى"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">الكمية المتاحة</div>
            <div className="font-medium flex items-center">
              <span
                className={
                  material.currentQuantity <= material.minimumQuantity
                    ? "text-amber-600"
                    : ""
                }
              >
                {material.currentQuantity.toLocaleString()}
              </span>
              <span className="text-gray-500 mr-1">{material.unit}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">
              الحد الأدنى للمخزون
            </div>
            <div className="font-medium">
              {material.minimumQuantity.toLocaleString()} {material.unit}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">السعر</div>
            <div className="font-medium">
              {material.price
                ? `${material.price.toLocaleString()} ل.س`
                : "غير محدد"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">المورد</div>
            <div className="font-medium">{material.supplier || "غير محدد"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">
              تاريخ انتهاء الصلاحية
            </div>
            <div className="font-medium">{formatDate(material.expiryDate)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">موقع التخزين</div>
            <div className="font-medium">{material.location || "غير محدد"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">تاريخ الإضافة</div>
            <div className="font-medium">{formatDate(material.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">آخر تحديث</div>
            <div className="font-medium">{formatDate(material.updatedAt)}</div>
          </div>
        </div>

        {(material.description || material.notes) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {material.description && (
              <div>
                <div className="text-sm text-gray-500 mb-1">الوصف</div>
                <div className="bg-gray-50 p-3 rounded-md text-gray-700">
                  {material.description}
                </div>
              </div>
            )}

            {material.notes && (
              <div>
                <div className="text-sm text-gray-500 mb-1">ملاحظات</div>
                <div className="bg-gray-50 p-3 rounded-md text-gray-700">
                  {material.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* أزرار الإجراءات - تظهر فقط للمدير وفني المختبر */}
        {(user?.role === "ADMIN" || user?.role === "LAB_TECHNICIAN") && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={showAddForm}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
              disabled={showTransactionForm}
            >
              <PlusCircle size={18} className="ml-2" />
              إضافة كمية
            </button>

            <button
              onClick={showReduceForm}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700 transition-colors"
              disabled={showTransactionForm || material.currentQuantity <= 0}
            >
              <MinusCircle size={18} className="ml-2" />
              تخفيض كمية
            </button>
          </div>
        )}
      </div>

      {/* نموذج إضافة/تخفيض الكمية */}
      {showTransactionForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-4 border-t-4 border-indigo-500">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {transactionType === "ADD" ? "إضافة كمية جديدة" : "تخفيض الكمية"}
          </h3>

          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الكمية <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    min="0.01"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    required
                  />
                  <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                    {material.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  السبب <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  required
                  placeholder={
                    transactionType === "ADD"
                      ? "مثال: شراء جديد، استلام توريد..."
                      : "مثال: استهلاك، تلف، انتهاء صلاحية..."
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الدفعة/الفاتورة (اختياري)
                </label>
                <input
                  type="text"
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleChange}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="رقم الدفعة إن وجد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الفاتورة (اختياري)
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="رقم الفاتورة إن وجد"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse mt-4">
              <button
                type="button"
                onClick={() => setShowTransactionForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={processingTransaction}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className={`flex items-center px-4 py-2 rounded-lg text-white ${
                  transactionType === "ADD"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={processingTransaction}
              >
                {processingTransaction ? (
                  <LoadingSpinner size="sm" className="ml-1" />
                ) : (
                  <Save size={18} className="ml-2" />
                )}
                {transactionType === "ADD" ? "إضافة الكمية" : "تخفيض الكمية"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// الصفحة الرئيسية
export default function MaterialDetailsPage() {
  // استخدام useParams بدلاً من params المباشر
  const params = useParams();
  const materialId = params.id as string;

  return (
    <MainLayout>
      <MaterialDetailsContent id={materialId} />
    </MainLayout>
  );
}
