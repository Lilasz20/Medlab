"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-hot-toast";
import { Eye, Edit, Trash, Plus, Search, Receipt, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InvoicesFilters from "@/components/invoices/InvoicesFilters";

interface InvoiceItem {
  id: string;
  testAssignmentId: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  patientId: string;
  patient: {
    id: string;
    name: string;
    fileNumber: string;
  };
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  invoiceDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  createdBy: {
    id: string;
    name: string;
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );

  // إضافة حالات الفلترة والترتيب
  const [showFilters, setShowFilters] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // إنشاء تأثير لتأخير البحث (debounce) لتحسين تجربة المستخدم
  useEffect(() => {
    // تأخير البحث لمدة 500 مللي ثانية (نصف ثانية)
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // إعادة تعيين الصفحة عند تغيير البحث
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1);
      }
    }, 500);

    // تنظيف المؤقت عند كل تغيير في searchQuery
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        // بناء معلمات الطلب للفلترة
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        // إضافة معلمات البحث وتنظيفها إذا لزم الأمر
        if (debouncedSearchQuery) {
          // تنظيف البحث وترميزه بشكل صحيح
          queryParams.append("search", debouncedSearchQuery.trim());
        }

        // إضافة فلتر حالة الدفع
        if (paymentStatusFilter !== "ALL") {
          queryParams.append("status", paymentStatusFilter);
        }

        // إضافة فلتر التاريخ
        if (startDate) {
          queryParams.append("startDate", startDate);
        }

        if (endDate) {
          queryParams.append("endDate", endDate);
        }

        // إضافة ترتيب
        if (sortOrder !== "newest") {
          queryParams.append("sort", sortOrder);
        }

        const response = await fetch(
          `/api/invoices?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات الفواتير");
        }

        const data = await response.json();
        setInvoices(data.invoices || []);
        setTotalCount(data.meta?.total || 0);
        setTotalPages(data.meta?.pages || 1);
      } catch (err) {
        console.error("Error fetching invoices:", err);

        let errorMessage = "حدث خطأ أثناء تحميل الفواتير";

        // إضافة تفاصيل الخطأ للمساعدة في تشخيصه
        if (err instanceof Error) {
          errorMessage += `: ${err.message}`;
        }

        setError(errorMessage);

        // إعادة تعيين البحث إذا كان هناك خطأ في البحث الحالي
        if (debouncedSearchQuery && debouncedSearchQuery.includes("ت")) {
          toast.error("هناك مشكلة في البحث، جاري إعادة تعيين معايير البحث");
          setSearchQuery("");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchQuery,
    token,
    paymentStatusFilter,
    sortOrder,
    startDate,
    endDate,
  ]);

  // مسح جميع الفلاتر
  const clearAllFilters = () => {
    setSearchQuery("");
    setPaymentStatusFilter("ALL");
    setSortOrder("newest");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getStatusBadgeColor = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return "bg-green-100 text-green-800";
    } else if (invoice.paidAmount > 0) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const getStatusText = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return "مدفوعة";
    } else if (invoice.paidAmount > 0) {
      return "مدفوعة جزئياً";
    } else {
      return "غير مدفوعة";
    }
  };

  const viewInvoiceDetails = (id: string) => {
    router.push(`/invoices/${id}`);
  };

  const openDeleteDialog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoiceId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!token || isDeleting || !selectedInvoiceId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/invoices/${selectedInvoiceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في حذف الفاتورة");
      }

      // تحديث قائمة الفواتير بعد الحذف
      setInvoices((prevInvoices) =>
        prevInvoices.filter((invoice) => invoice.id !== selectedInvoiceId)
      );
      setDeleteDialogOpen(false);
      setSelectedInvoiceId(null);
      toast.success("تم حذف الفاتورة بنجاح");
    } catch (err: any) {
      console.error("Error deleting invoice:", err);
      toast.error(err.message || "حدث خطأ أثناء حذف الفاتورة");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    // تعيين قيمة البحث بدون إعادة تحميل الصفحة فوراً
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // تعيين الصفحة الأولى عند البحث
    setCurrentPage(1);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-red-500">
          ليس لديك صلاحية للوصول إلى هذه الصفحة
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">الفواتير</h1>
        <p className="text-gray-600">
          إدارة الفواتير الخاصة بالمرضى وتتبع حالة المدفوعات.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && (
          <Link
            href="/invoices/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} className="ml-2" />
            إنشاء فاتورة جديدة
          </Link>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <div className="relative">
              <input
                type="search"
                placeholder="البحث عن فاتورة..."
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
                dir="rtl"
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setDebouncedSearchQuery(searchQuery);
                    setCurrentPage(1);
                  }
                }}
              />
            </div>
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
            {(paymentStatusFilter !== "ALL" ||
              sortOrder !== "newest" ||
              startDate ||
              endDate) && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* استخدام مكون الفلترة المنفصل */}
      <InvoicesFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        paymentStatusFilter={paymentStatusFilter}
        setPaymentStatusFilter={setPaymentStatusFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearFilters={clearAllFilters}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  رقم الفاتورة
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
                  التاريخ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  المبلغ
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
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    لا توجد فواتير
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => viewInvoiceDetails(invoice.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{invoice.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.patient.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(invoice.invoiceDate), "dd/MM/yyyy", {
                        locale: ar,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.totalAmount.toFixed(2)} ل.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                          invoice
                        )}`}
                      >
                        {getStatusText(invoice)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewInvoiceDetails(invoice.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Eye className="ml-1 h-4 w-4" />
                          عرض
                        </button>
                        {(user.role === "ADMIN" ||
                          user.role === "ACCOUNTANT") && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/invoices/${invoice.id}/edit`);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Edit className="ml-1 h-4 w-4" />
                              تعديل
                            </button>
                            <button
                              onClick={(e) => openDeleteDialog(invoice.id, e)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <Trash className="ml-1 h-4 w-4" />
                              حذف
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <nav className="inline-flex rounded-md shadow">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              {Array.from({ length: totalPages > 5 ? 5 : totalPages }).map(
                (_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    // If 5 or fewer pages show all
                    pageNumber = index + 1;
                  } else {
                    // Otherwise show current page in the middle with pages on either side
                    if (currentPage <= 3) {
                      pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + index;
                    } else {
                      pageNumber = currentPage - 2 + index;
                    }
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === pageNumber
                          ? "bg-blue-50 text-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                }
              )}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* مربع حوار تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد حذف الفاتورة</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            هل أنت متأكد من حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 "
            >
              {isDeleting ? "جاري الحذف..." : "نعم، حذف الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
