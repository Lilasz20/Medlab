"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";
import Link from "next/link";

// المكونات
import LoadingSpinner from "@/components/LoadingSpinner";
import MainLayout from "@/components/layout/MainLayout";

// الأيقونات
import {
  History,
  Search,
  Filter,
  ArrowRight,
  Plus,
  MinusCircle,
  PlusCircle,
} from "lucide-react";

// تعريف نوع حركة المادة المخبرية
interface MaterialTransaction {
  id: string;
  materialId: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  batchNumber: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  material: {
    name: string;
    unit: string;
  };
  createdBy: {
    name: string;
  };
}

// تعريف خيارات التصفح والترتيب
interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// مكون داخلي يستخدم useSearchParams
function TransactionsContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // حالة البيانات
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // حالة البحث والتصفية
  const [materialId, setMaterialId] = useState(
    searchParams.get("materialId") || ""
  );
  const [type, setType] = useState(searchParams.get("type") || "");
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // استرجاع بيانات حركات المواد المخبرية
  const fetchTransactions = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // بناء عنوان URL مع معلمات البحث
      const params = new URLSearchParams();
      if (materialId) params.append("materialId", materialId);
      if (type) params.append("type", type);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("page", page.toString());
      params.append("limit", meta.limit.toString());

      const response = await axios.get(
        `/api/lab-materials/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTransactions(response.data.transactions);
      setMeta(response.data.meta);
    } catch (error) {
      console.error("Error fetching material transactions:", error);
      toast.error("حدث خطأ أثناء استرجاع بيانات حركات المواد المخبرية");
    } finally {
      setLoading(false);
    }
  };

  // استرجاع البيانات عند تغيير معلمات البحث
  useEffect(() => {
    fetchTransactions();
  }, [page]);

  // تحديث عنوان URL عند تغيير معلمات البحث
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (materialId) params.set("materialId", materialId);
    else params.delete("materialId");

    if (type) params.set("type", type);
    else params.delete("type");

    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    params.set("page", page.toString());

    router.push(`/lab-materials/transactions?${params.toString()}`);
  }, [page, materialId, type, startDate, endDate]);

  // معالجة تقديم نموذج البحث
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // العودة إلى الصفحة الأولى عند البحث
    fetchTransactions();
  };

  // التنقل بين الصفحات
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // إعادة ضبط جميع الفلاتر
  const clearAllFilters = () => {
    setMaterialId("");
    setType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return "تاريخ غير صالح";
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">سجل حركات المواد المخبرية</h1>
        <p className="text-gray-600">
          عرض سجل إضافة وتخفيض كميات المواد المخبرية.
        </p>
      </div>

      {/* قسم الإجراءات */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Link
          href="/lab-materials"
          className="bg-gray-100 text-gray-700 p-2.5 rounded-lg flex items-center hover:bg-gray-200"
        >
          <ArrowRight size={18} className="ml-1" />
          العودة للمواد
        </Link>
      </div>

      {/* نموذج البحث والتصفية */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع الحركة
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              >
                <option value="">جميع الحركات</option>
                <option value="ADD">إضافة</option>
                <option value="REDUCE">تخفيض</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
              >
                <Filter size={18} className="ml-2" />
                تصفية
              </button>

              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                مسح
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* جدول الحركات */}
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">لا توجد حركات للعرض</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    التاريخ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المادة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    نوع الحركة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الكمية
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الكمية السابقة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الكمية الجديدة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    السبب
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    بواسطة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {transaction.material.name}
                      <span className="text-xs text-gray-500 block mt-1">
                        الوحدة: {transaction.material.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.type === "ADD" ? (
                        <span className="inline-flex items-center text-green-700">
                          <PlusCircle
                            size={16}
                            className="ml-1 text-green-600"
                          />
                          إضافة
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700">
                          <MinusCircle
                            size={16}
                            className="ml-1 text-red-600"
                          />
                          تخفيض
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.quantity} {transaction.material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.previousQuantity} {transaction.material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.newQuantity} {transaction.material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.reason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.createdBy?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ترقيم الصفحات */}
        {!loading && meta.totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                السابق
              </button>
              <button
                disabled={page === meta.totalPages}
                onClick={() => handlePageChange(page + 1)}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === meta.totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض{" "}
                  <span className="font-medium">
                    {(page - 1) * meta.limit + 1}
                  </span>{" "}
                  إلى{" "}
                  <span className="font-medium">
                    {Math.min(page * meta.limit, meta.total)}
                  </span>{" "}
                  من <span className="font-medium">{meta.total} نتيجة</span>
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px rtl:space-x-reverse"
                  aria-label="Pagination"
                >
                  <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    السابق
                  </button>

                  {/* أزرار أرقام الصفحات */}
                  {Array.from(
                    { length: Math.min(5, meta.totalPages) },
                    (_, i) => {
                      let pageNumber;
                      if (meta.totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (page <= 3) {
                        pageNumber = i + 1;
                      } else if (page >= meta.totalPages - 2) {
                        pageNumber = meta.totalPages - 4 + i;
                      } else {
                        pageNumber = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            page === pageNumber
                              ? "text-indigo-600 border-indigo-500 bg-indigo-50"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                  )}

                  <button
                    disabled={page === meta.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page === meta.totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// مكون الصفحة الرئيسية لحركات المواد المخبرية
export default function MaterialTransactionsPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        }
      >
        <TransactionsContent />
      </Suspense>
    </MainLayout>
  );
}
