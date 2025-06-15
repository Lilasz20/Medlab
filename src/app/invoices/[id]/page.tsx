"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, Printer, Download } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import PrintPatientInvoice from "@/components/invoices/PrintPatientInvoice";

interface InvoiceItem {
  id: string;
  testAssignmentId: string;
  price: number;
  quantity: number;
  subtotal: number;
  testAssignment: {
    test: {
      name: string;
      category: string;
    };
  };
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
  createdAt: string;
}

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = params.id as string;

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!token || !invoiceId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/invoices/${invoiceId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("لم يتم العثور على الفاتورة");
          }
          throw new Error("فشل في جلب بيانات الفاتورة");
        }

        const data = await response.json();
        setInvoice(data);
      } catch (err: any) {
        console.error("Error fetching invoice:", err);
        setError(err.message || "حدث خطأ أثناء جلب بيانات الفاتورة");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [invoiceId, token]);

  const getStatusInfo = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return {
        text: "مدفوعة بالكامل",
        color: "bg-green-100 text-green-800",
      };
    } else if (invoice.paidAmount > 0) {
      return {
        text: "مدفوعة جزئياً",
        color: "bg-yellow-100 text-yellow-800",
      };
    } else {
      return {
        text: "غير مدفوعة",
        color: "bg-red-100 text-red-800",
      };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ar });
    } catch (error) {
      return "تاريخ غير صالح";
    }
  };

  const printInvoice = () => {
    if (!invoice) return;

    // استخدام مكون الطباعة المنفصل
    PrintPatientInvoice({ invoice });
  };

  if (!user) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">جاري تحميل البيانات...</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full p-6 text-right flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 text-right">
        <div className="flex items-center mb-4">
          <Link
            href="/invoices"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ArrowRight className="ml-1" size={16} />
            <span>العودة إلى قائمة الفواتير</span>
          </Link>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <h1 className="text-xl font-bold text-red-700 mb-2">حدث خطأ</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="w-full p-6 text-right">
        <div className="flex items-center mb-4">
          <Link
            href="/invoices"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ArrowRight className="ml-1" size={16} />
            <span>العودة إلى قائمة الفواتير</span>
          </Link>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
          <h1 className="text-xl font-bold text-yellow-700 mb-2">
            الفاتورة غير موجودة
          </h1>
          <p className="text-yellow-700">لم يتم العثور على الفاتورة المطلوبة</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice);
  const remainingAmount = invoice.totalAmount - invoice.paidAmount;

  return (
    <div className="w-full" dir="rtl">
      {/* Header - hide when printing */}
      <div className="mb-8 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <Link
            href="/invoices"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ArrowRight className="ml-1" size={16} />
            <span>العودة إلى قائمة الفواتير</span>
          </Link>
          <div className="flex gap-2">
            <button
              onClick={printInvoice}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded inline-flex items-center"
            >
              <Printer className="ml-1" size={16} />
              <span>طباعة</span>
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">تفاصيل الفاتورة</h1>
      </div>

      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-1 text-indigo-700">
                مختبر MedLab الطبي
              </h1>
              <p className="text-gray-600">
                للتحاليل الطبية والدراسات المخبرية
              </p>
              -<p className="text-gray-600">هاتف: 093312334543</p>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold mb-2">فاتورة</h2>
              <p className="text-gray-700">
                رقم الفاتورة:{" "}
                <span className="font-medium">
                  {invoice.id.substring(0, 8)}
                </span>
              </p>
              <p className="text-gray-700">
                تاريخ الفاتورة:{" "}
                <span className="font-medium">
                  {formatDate(invoice.invoiceDate)}
                </span>
              </p>
              {invoice.dueDate && (
                <p className="text-gray-700">
                  تاريخ الاستحقاق:{" "}
                  <span className="font-medium">
                    {formatDate(invoice.dueDate)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">معلومات المريض</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">الاسم:</p>
                <p className="font-medium">{invoice.patient.name}</p>
              </div>
              <div>
                <p className="text-gray-600">رقم الملف:</p>
                <p className="font-medium">{invoice.patient.fileNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">تفاصيل الفاتورة</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الفحص
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    السعر
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
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.testAssignment.test.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.price.toLocaleString()} ل.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.subtotal.toLocaleString()} ل.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="flex justify-between py-2">
                <span className="font-medium">المجموع:</span>
                <span>{invoice.totalAmount.toLocaleString()} ل.س</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">المبلغ المدفوع:</span>
                <span>{invoice.paidAmount.toLocaleString()} ل.س</span>
              </div>
              {!invoice.isPaid && (
                <div className="flex justify-between py-2">
                  <span className="font-medium">المبلغ المتبقي:</span>
                  <span>{remainingAmount.toLocaleString()} ل.س</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-gray-200 mt-2 pt-2">
                <span className="text-lg font-bold">حالة الدفع:</span>
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}
                >
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t pt-6 text-center text-gray-500 text-sm">
          <p>تم إصدار هذه الفاتورة بواسطة: {invoice.createdBy.name}</p>
          <p>
            تاريخ الإصدار:{" "}
            {formatDate(invoice.createdAt || invoice.invoiceDate)}
          </p>
          <p className="mt-2">
            شكراً لاختياركم مختبر MedLab الطبي - نتمنى لكم الصحة والعافية
          </p>
        </div>
      </div>
    </div>
  );
}
