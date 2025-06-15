"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

// المكونات
import MainLayout from "@/components/layout/MainLayout";
import LoadingSpinner from "@/components/LoadingSpinner";

// الأيقونات
import { FileBox, Save, ArrowRight } from "lucide-react";

// نموذج بيانات المادة المخبرية
interface MaterialFormData {
  name: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  currentQuantity: string;
  minimumQuantity: string;
  price: string;
  supplier: string;
  expiryDate: string;
  location: string;
  notes: string;
  batchNumber: string;
  invoiceNumber: string;
}

export default function NewLabMaterialPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // حالة النموذج
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    code: "",
    category: "REAGENT",
    description: "",
    unit: "",
    currentQuantity: "0",
    minimumQuantity: "0",
    price: "",
    supplier: "",
    expiryDate: "",
    location: "",
    notes: "",
    batchNumber: "",
    invoiceNumber: "",
  });

  // التحقق من صلاحيات المستخدم
  if (user && user.role !== "ADMIN" && user.role !== "LAB_TECHNICIAN") {
    router.push("/dashboard");
    return null;
  }

  // معالجة تغيير قيم الحقول
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // معالجة تقديم النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setLoading(true);

      // تحويل البيانات إلى الأنواع الصحيحة قبل الإرسال
      const dataToSend = {
        ...formData,
        currentQuantity: parseFloat(formData.currentQuantity) || 0,
        minimumQuantity: parseFloat(formData.minimumQuantity) || 0,
        price: formData.price ? parseFloat(formData.price) : null,
        expiryDate: formData.expiryDate || null,
      };

      const response = await axios.post("/api/lab-materials", dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // رسالة نجاح يتم عرضها في الصفحة الرئيسية
      toast.success(`تمت إضافة المادة المخبرية بنجاح`);

      // تأخير التوجيه لضمان ظهور رسالة النجاح
      setTimeout(() => {
        router.push(`/lab-materials/${response.data.material.id}`);
      }, 1000);
    } catch (error) {
      console.error("Error creating lab material:", error);
      toast.error("حدث خطأ أثناء إضافة المادة المخبرية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">إضافة مادة مخبرية جديدة</h1>
          <p className="text-gray-600">
            إضافة مادة جديدة إلى مخزون المواد المخبرية.
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* بيانات المادة الأساسية */}
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                البيانات الأساسية
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* اسم المادة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المادة <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    required
                  />
                </div>

                {/* رمز المادة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرمز (اختياري)
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  />
                </div>

                {/* تصنيف المادة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    التصنيف <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    required
                  >
                    <option value="REAGENT">كاشف</option>
                    <option value="CONSUMABLE">مستهلكات</option>
                    <option value="EQUIPMENT">معدات/أدوات</option>
                    <option value="GLASSWARE">زجاجيات</option>
                    <option value="CHEMICAL">مواد كيميائية</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>

                {/* وحدة القياس */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وحدة القياس <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    required
                    placeholder="مثال: قطعة، علبة، زجاجة، لتر، كيلوجرام"
                  />
                </div>

                {/* الكمية الأولية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الكمية الأولية <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="currentQuantity"
                    value={formData.currentQuantity}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* الحد الأدنى */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الحد الأدنى للمخزون <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="minimumQuantity"
                    value={formData.minimumQuantity}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                معلومات إضافية
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* السعر التقريبي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السعر التقريبي (اختياري)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    min="0"
                    step="0.01"
                    placeholder="السعر بالليرة السورية"
                  />
                </div>

                {/* المورد */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المورد (اختياري)
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  />
                </div>

                {/* تاريخ انتهاء الصلاحية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تاريخ انتهاء الصلاحية (اختياري)
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  />
                </div>

                {/* موقع التخزين */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    موقع التخزين (اختياري)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="مثال: رف 3، خزانة 2"
                  />
                </div>

                {/* رقم الدفعة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الدفعة (اختياري)
                  </label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  />
                </div>

                {/* رقم الفاتورة */}
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
                  />
                </div>
              </div>
            </div>

            {/* وصف وملاحظات */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* الوصف */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف المادة (اختياري)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    rows={4}
                  />
                </div>

                {/* ملاحظات */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex justify-end">
              <Link
                href="/lab-materials"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 ml-2"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="ml-1" />
                ) : (
                  <Save size={18} className="ml-2" />
                )}
                حفظ المادة
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
