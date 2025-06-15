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
import LabMaterialsFilters from "@/components/lab-materials/LabMaterialsFilters";

// الأيقونات
import {
  FileBox,
  Search,
  Filter,
  Eye,
  History,
  Plus,
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

// تعريف خيارات الترتيب والتصفية
interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ترجمة تصنيفات المواد إلى العربية
const getCategoryLabel = (category: string): string => {
  switch (category) {
    case "REAGENT":
      return "كاشف";
    case "CONSUMABLE":
      return "مستهلكات";
    case "EQUIPMENT":
      return "معدات/أدوات";
    case "GLASSWARE":
      return "زجاجيات";
    case "CHEMICAL":
      return "مواد كيميائية";
    case "OTHER":
      return "أخرى";
    default:
      return category;
  }
};

// مكون داخلي يستخدم useSearchParams
function LabMaterialsContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // حالة البيانات
  const [materials, setMaterials] = useState<LabMaterial[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // حالة البحث والتصفية
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [lowStock, setLowStock] = useState(
    searchParams.get("lowStock") === "true"
  );
  const [sort, setSort] = useState(searchParams.get("sort") || "name");
  const [order, setOrder] = useState(searchParams.get("order") || "asc");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // حالة الفلاتر
  const [showFilters, setShowFilters] = useState(false);

  // استرجاع بيانات المواد المخبرية
  const fetchMaterials = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // بناء عنوان URL مع معلمات البحث
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (lowStock) params.append("lowStock", "true");
      params.append("sort", sort);
      params.append("order", order);
      params.append("page", page.toString());
      params.append("limit", meta.limit.toString());

      const response = await axios.get(
        `/api/lab-materials?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMaterials(response.data.materials);
      setMeta(response.data.meta);
    } catch (error) {
      console.error("Error fetching lab materials:", error);
      toast.error("حدث خطأ أثناء استرجاع بيانات المواد المخبرية");
    } finally {
      setLoading(false);
    }
  };

  // استرجاع البيانات عند تغيير معلمات البحث
  useEffect(() => {
    fetchMaterials();
  }, [page, category, lowStock, sort, order]);

  // تحديث عنوان URL عند تغيير معلمات البحث
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (search) params.set("search", search);
    else params.delete("search");

    if (category) params.set("category", category);
    else params.delete("category");

    if (lowStock) params.set("lowStock", "true");
    else params.delete("lowStock");

    params.set("sort", sort);
    params.set("order", order);
    params.set("page", page.toString());

    router.push(`/lab-materials?${params.toString()}`);
  }, [page, category, lowStock, sort, order, search]);

  // معالجة تقديم نموذج البحث
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // العودة إلى الصفحة الأولى عند البحث
    fetchMaterials();
  };

  // التنقل بين الصفحات
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // تغيير الترتيب
  const handleSort = (column: string) => {
    if (sort === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(column);
      setOrder("asc");
    }
  };

  // إعادة ضبط الفلاتر
  const clearAllFilters = () => {
    setCategory("");
    setLowStock(false);
    setSort("name");
    setOrder("asc");
    setPage(1);
  };

  // تنسيق تاريخ انتهاء الصلاحية
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

  // التحقق من المخزون المنخفض
  const isLowStock = (material: LabMaterial) => {
    return material.currentQuantity <= material.minimumQuantity;
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">قائمة المواد المخبرية</h1>
        <p className="text-gray-600">
          إدارة مخزون المواد المخبرية وتتبع الكميات.
        </p>
      </div>

      {/* قسم الإجراءات */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Link
          href="/lab-materials/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} className="ml-2" />
          إضافة مادة جديدة
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن مادة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
              dir="rtl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
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
            {(category !== "" ||
              lowStock ||
              sort !== "name" ||
              order !== "asc") && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* مكون الفلترة المنفصل */}
      <LabMaterialsFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        category={category}
        setCategory={setCategory}
        lowStock={lowStock}
        setLowStock={setLowStock}
        sort={sort}
        setSort={setSort}
        order={order}
        setOrder={setOrder}
        clearFilters={clearAllFilters}
      />

      {/* جدول المواد المخبرية */}
      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinner />
          </div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">لا توجد مواد مخبرية للعرض</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    اسم المادة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("category")}
                  >
                    التصنيف
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الكمية المتاحة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الوحدة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الحد الأدنى
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    تاريخ الانتهاء
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {material.name}
                      {material.code && (
                        <span className="text-xs text-gray-500 block mt-1">
                          الرمز: {material.code}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {material.category === "REAGENT" && "كاشف"}
                      {material.category === "CONSUMABLE" && "مستهلكات"}
                      {material.category === "EQUIPMENT" && "معدات/أدوات"}
                      {material.category === "GLASSWARE" && "زجاجيات"}
                      {material.category === "CHEMICAL" && "مواد كيميائية"}
                      {material.category === "OTHER" && "أخرى"}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isLowStock(material) ? "text-red-600 font-medium" : ""
                      }`}
                    >
                      {isLowStock(material) && (
                        <AlertTriangle
                          size={16}
                          className="inline-block ml-1 text-red-600"
                        />
                      )}
                      {material.currentQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {material.minimumQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(material.expiryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2 space-x-reverse">
                        <button
                          onClick={() =>
                            router.push(`/lab-materials/${material.id}`)
                          }
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          title="عرض التفاصيل"
                        >
                          <Eye size={18} className="ml-1" />
                          <span className="text-xs">التفاصيل</span>
                        </button>
                        <button
                          onClick={() =>
                            router.push(
                              `/lab-materials/transactions?materialId=${material.id}`
                            )
                          }
                          className="text-green-600 hover:text-green-900 flex items-center mr-3"
                          title="عرض سجل الحركات"
                        >
                          <History size={18} className="ml-1" />
                          <span className="text-xs">السجل</span>
                        </button>
                      </div>
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

// مكون الصفحة الرئيسية للمواد المخبرية
export default function LabMaterialsPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        }
      >
        <LabMaterialsContent />
      </Suspense>
    </MainLayout>
  );
}
