"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-hot-toast";
import {
  ArrowRight,
  Calendar,
  Check,
  CreditCard,
  Edit,
  FileText,
  Printer,
  Trash,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import PrintPurchaseInvoice from "@/components/invoices/PrintPurchaseInvoice";

interface PurchaseInvoiceItem {
  id: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PurchaseInvoice {
  id: string;
  supplierName: string;
  invoiceNumber?: string;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  items: PurchaseInvoiceItem[];
  createdBy: {
    id: string;
    name: string;
  };
}

export default function PurchaseInvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/purchase-invoices/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `فشل في استرجاع بيانات فاتورة الشراء (${response.status})`
          );
        }

        const data = await response.json();
        setInvoice(data.invoice);

        // التأكد من أن المبلغ المدفوع صحيح عندما تكون الفاتورة مدفوعة بالكامل
        if (data.invoice.isPaid && data.invoice.paidAmount === 0) {
          setInvoice({
            ...data.invoice,
            paidAmount: data.invoice.totalAmount,
          });
        }
      } catch (err) {
        console.error("Error fetching purchase invoice details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء استرجاع بيانات فاتورة الشراء"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [params.id, token]);

  const handleDeleteInvoice = async () => {
    if (!token || isDeleting || !invoice) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/purchase-invoices/${invoice.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في حذف فاتورة الشراء");
      }

      toast.success("تم حذف فاتورة الشراء بنجاح");
      setDeleteDialogOpen(false);
      router.push("/purchase-invoices");
    } catch (err: any) {
      console.error("Error deleting purchase invoice:", err);
      toast.error(err.message || "حدث خطأ أثناء حذف فاتورة الشراء");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoice) return;

    // استخدام مكون الطباعة المنفصل
    PrintPurchaseInvoice({ invoice });
  };

  const handleEditInvoice = () => {
    if (invoice) {
      router.push(`/purchase-invoices/${invoice.id}/edit`);
    }
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
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
          <p className="text-red-500">{error}</p>
          <div className="mt-4">
            <Link
              href="/purchase-invoices"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى قائمة فواتير الشراء
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-700">لم يتم العثور على فاتورة الشراء</p>
          <div className="mt-4">
            <Link
              href="/purchase-invoices"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى قائمة فواتير الشراء
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusText = () => {
    if (invoice.isPaid) {
      return (
        <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs font-semibold">
          مدفوعة بالكامل
        </span>
      );
    } else if (invoice.paidAmount > 0) {
      return (
        <span className="bg-yellow-100 text-yellow-800 py-1 px-3 rounded-full text-xs font-semibold">
          مدفوعة جزئياً
        </span>
      );
    } else {
      return (
        <span className="bg-red-100 text-red-800 py-1 px-3 rounded-full text-xs font-semibold">
          غير مدفوعة
        </span>
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* الإجراءات - لا تظهر عند الطباعة */}
      <div className="mb-8 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/purchase-invoices"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى قائمة فواتير الشراء
            </Link>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <Printer className="ml-1 h-4 w-4" />
              طباعة
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center text-blue-600 border-blue-600 hover:bg-blue-50"
              onClick={handleEditInvoice}
              title="انقر للتعديل"
            >
              <Edit className="ml-1 h-4 w-4" />
              تعديل
            </Button>
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              size="sm"
              variant="outline"
              className="flex items-center text-red-600 border-red-600 hover:bg-red-50"
              title="انقر للحذف (سيطلب منك التأكيد)"
            >
              <Trash className="ml-1 h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
      </div>

      {/* تفاصيل الفاتورة */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6 print:shadow-none print:border print:border-gray-300">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 print:mb-8">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold mb-1">فاتورة شراء</h1>
              <p className="text-gray-600 mb-2">
                رقم الفاتورة:{" "}
                <span className="font-semibold">
                  {invoice.invoiceNumber || `#${invoice.id.substring(0, 8)}`}
                </span>
              </p>
              <div className="flex items-center text-gray-600 mb-1">
                <Calendar className="ml-1 h-4 w-4" />
                تاريخ الفاتورة:{" "}
                <span className="mr-1 font-semibold">
                  {format(new Date(invoice.invoiceDate), "dd/MM/yyyy", {
                    locale: ar,
                  })}
                </span>
              </div>
              {invoice.dueDate && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="ml-1 h-4 w-4" />
                  تاريخ الاستحقاق:{" "}
                  <span className="mr-1 font-semibold">
                    {format(new Date(invoice.dueDate), "dd/MM/yyyy", {
                      locale: ar,
                    })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end">
              <p className="font-semibold text-lg mb-2">
                اسم المورد: {invoice.supplierName}
              </p>
              <div className="flex items-center text-gray-600 mb-1">
                <User className="ml-1 h-4 w-4" />
                تم إنشاؤها بواسطة:{" "}
                <span className="mr-1 font-semibold">
                  {invoice.createdBy.name}
                </span>
              </div>
              <div className="mt-2">{getStatusText()}</div>
            </div>
          </div>

          {/* ملاحظات */}
          {invoice.notes && (
            <div className="mb-6 bg-gray-50 p-3 rounded-md print:bg-white print:border print:border-gray-200">
              <h3 className="font-semibold mb-1 flex items-center">
                <FileText className="ml-1 h-4 w-4" />
                ملاحظات
              </h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* عناصر الفاتورة */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">عناصر الفاتورة</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50 print:bg-gray-100">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      الصنف
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      الوصف
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
                      سعر الوحدة
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unitPrice.toFixed(2)} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {item.subtotal.toFixed(2)} ل.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ملخص المبالغ */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">المبلغ الإجمالي:</span>
                  <span className="font-semibold">
                    {invoice.totalAmount.toFixed(2)} ل.س
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">المبلغ المدفوع:</span>
                  <span className="font-semibold">
                    {invoice.paidAmount.toFixed(2)} ل.س
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="font-semibold">المبلغ المتبقي:</span>
                  <span className="font-bold text-indigo-600">
                    {(invoice.totalAmount - invoice.paidAmount).toFixed(2)} ل.س
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 mt-2">
                  <span className="text-gray-600">حالة الدفع:</span>
                  <div className="flex items-center">
                    {invoice.isPaid ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 ml-1" />
                        <span className="text-green-600 font-semibold">
                          مدفوعة بالكامل
                        </span>
                      </>
                    ) : invoice.paidAmount > 0 ? (
                      <span className="text-yellow-600 font-semibold">
                        مدفوعة جزئياً
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">
                        غير مدفوعة
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* مربع حوار تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              تأكيد حذف الفاتورة
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center mb-2">
              أنت على وشك حذف فاتورة الشراء رقم:{" "}
              <span className="font-bold text-indigo-600">
                {invoice?.invoiceNumber || `#${invoice?.id.substring(0, 8)}`}
              </span>
            </p>
            <p className="text-center mb-2">
              للمورّد:{" "}
              <span className="font-bold">{invoice?.supplierName}</span>
            </p>
            <p className="text-center mb-3">
              بقيمة إجمالية:{" "}
              <span className="font-bold">
                {invoice?.totalAmount.toFixed(2)} ل.س
              </span>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
              <p className="text-red-700 text-center text-sm">
                تحذير: هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من حذف هذه
                الفاتورة نهائيًا؟
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="min-w-[100px]"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 min-w-[100px] text-white"
            >
              {isDeleting ? "جاري الحذف..." : "نعم، حذف الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
