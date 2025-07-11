"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, Plus, Trash, Search, X, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

// تعريف الأنواع
interface Patient {
  id: string;
  name: string;
  fileNumber: string;
}

interface Test {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface TestAssignment {
  id: string;
  testId: string;
  test: Test;
  patientId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceItem {
  testAssignmentId: string;
  testName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  // حالة المريض
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  // حالة الفحوصات
  const [availableTests, setAvailableTests] = useState<TestAssignment[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // حالة الفاتورة
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>("0");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState<string>("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // البحث عن المرضى
  const searchPatients = async () => {
    if (!patientSearchTerm.trim() || !token) return;

    try {
      setIsSearchingPatients(true);
      setSearchedPatients([]);

      const response = await fetch(
        `/api/patients?search=${encodeURIComponent(
          patientSearchTerm
        )}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("فشل في البحث عن المرضى");
      }

      const data = await response.json();
      setSearchedPatients(data.patients || []);
    } catch (error) {
      console.error("Error searching patients:", error);
      toast.error("حدث خطأ أثناء البحث عن المرضى");
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // اختيار مريض
  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchedPatients([]);
    setPatientSearchTerm("");
    await fetchPatientTests(patient.id);
  };

  // جلب فحوصات المريض
  const fetchPatientTests = async (patientId: string) => {
    if (!token) return;

    try {
      setLoadingTests(true);
      const response = await fetch(
        `/api/tests/assignments?patientId=${patientId}&status=COMPLETED&notInvoiced=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("فشل في جلب فحوصات المريض");
      }

      const data = await response.json();
      setAvailableTests(data || []);
    } catch (error) {
      console.error("Error fetching patient tests:", error);
      toast.error("حدث خطأ أثناء جلب فحوصات المريض");
    } finally {
      setLoadingTests(false);
    }
  };

  // إضافة فحص إلى الفاتورة
  const addTestToInvoice = (test: TestAssignment) => {
    // التحقق من أن الفحص غير موجود بالفعل
    const exists = invoiceItems.some(
      (item) => item.testAssignmentId === test.id
    );

    if (exists) {
      toast.error("هذا الفحص مضاف بالفعل إلى الفاتورة");
      return;
    }

    const newItem: InvoiceItem = {
      testAssignmentId: test.id,
      testName: test.test.name,
      price: test.test.price,
      quantity: 1,
      subtotal: test.test.price,
    };

    setInvoiceItems([...invoiceItems, newItem]);
  };

  // حذف فحص من الفاتورة
  const removeTestFromInvoice = (testAssignmentId: string) => {
    setInvoiceItems(
      invoiceItems.filter((item) => item.testAssignmentId !== testAssignmentId)
    );
  };

  // تحديث كمية الفحص
  const updateItemQuantity = (testAssignmentId: string, quantity: number) => {
    if (quantity < 1) return;

    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.testAssignmentId === testAssignmentId) {
          const newQuantity = quantity;
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  // حساب المجموع
  const calculateTotal = () => {
    return invoiceItems.reduce((total, item) => total + item.subtotal, 0);
  };

  // التحقق من حالة الدفع
  const isPaid = () => {
    const total = calculateTotal();
    const paid = parseFloat(paidAmount) || 0;
    return paid >= total;
  };

  // إنشاء الفاتورة
  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("يرجى اختيار مريض أولاً");
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error("يرجى إضافة فحص واحد على الأقل إلى الفاتورة");
      return;
    }

    if (!token) {
      toast.error("يرجى تسجيل الدخول مرة أخرى");
      return;
    }

    try {
      setIsCreatingInvoice(true);
      setError(null);

      const totalAmount = calculateTotal();
      const paidAmountValue = parseFloat(paidAmount) || 0;

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          totalAmount,
          paidAmount: paidAmountValue,
          isPaid: paidAmountValue >= totalAmount,
          invoiceDate: invoiceDate || new Date().toISOString(),
          dueDate: dueDate || null,
          items: invoiceItems.map((item) => ({
            testAssignmentId: item.testAssignmentId,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في إنشاء الفاتورة");
      }

      const data = await response.json();

      toast.success("تم إنشاء الفاتورة بنجاح");

      // التوجه إلى صفحة عرض الفاتورة
      router.push(`/invoices/${data.invoice.id}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      setError(error.message || "حدث خطأ أثناء إنشاء الفاتورة");
      toast.error(error.message || "حدث خطأ أثناء إنشاء الفاتورة");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // التحقق من المستخدم وصلاحياته
  if (!user) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">جاري تحميل البيانات...</h1>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "ACCOUNTANT") {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h1>
        <p>ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            href="/invoices"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ArrowRight className="ml-1" size={16} />
            <span>العودة إلى قائمة الفواتير</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">إنشاء فاتورة جديدة</h1>
        <p className="text-gray-600">
          قم بإنشاء فاتورة جديدة وإضافة الفحوصات إليها.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">اختيار المريض</h2>

          {selectedPatient ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg">{selectedPatient.name}</p>
                  <p className="text-sm text-gray-600">
                    رقم الملف: {selectedPatient.fileNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setAvailableTests([]);
                    setInvoiceItems([]);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex mb-4">
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                  placeholder="اكتب اسم المريض أو رقم الملف"
                  className="w-full border border-gray-300 rounded-r-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={searchPatients}
                  disabled={isSearchingPatients || !patientSearchTerm.trim()}
                  className={`p-2 rounded-l-lg flex items-center justify-center min-w-[50px] ${
                    isSearchingPatients || !patientSearchTerm.trim()
                      ? "bg-gray-300 text-gray-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {isSearchingPatients ? (
                    <LoadingSpinner className="h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>

              {searchedPatients.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {searchedPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className="p-3 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                    >
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-gray-500">
                        رقم الملف: {patient.fileNumber}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Tests */}
          {selectedPatient && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-2">الفحوصات المتاحة</h3>
              {loadingTests ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : availableTests.length === 0 ? (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                  لا توجد فحوصات مكتملة غير مفوترة لهذا المريض
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {availableTests.map((test) => (
                    <div
                      key={test.id}
                      className="p-3 border-b last:border-b-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{test.test.name}</p>
                        <p className="text-sm text-gray-500">
                          {test.test.price.toLocaleString()} ل.س
                        </p>
                      </div>
                      <button
                        onClick={() => addTestToInvoice(test)}
                        className="bg-green-50 text-green-700 p-1 rounded-full hover:bg-green-100"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoice Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={createInvoice}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h2 className="text-lg font-semibold mb-4">تفاصيل الفاتورة</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="invoiceDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  تاريخ الفاتورة
                </label>
                <input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  تاريخ الاستحقاق (اختياري)
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">عناصر الفاتورة</h3>
              {invoiceItems.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center text-gray-500">
                  لم تتم إضافة أي فحوصات إلى الفاتورة بعد
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الفحص
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          السعر
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الكمية
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المجموع
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoiceItems.map((item) => (
                        <tr key={item.testAssignmentId}>
                          <td className="px-4 py-3 text-sm">{item.testName}</td>
                          <td className="px-4 py-3 text-sm">
                            {item.price.toLocaleString()} ل.س
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQuantity(
                                    item.testAssignmentId,
                                    item.quantity - 1
                                  )
                                }
                                className="text-gray-500 hover:text-gray-700 p-1"
                                disabled={item.quantity <= 1}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItemQuantity(
                                    item.testAssignmentId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-12 text-center border border-gray-300 rounded mx-1"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQuantity(
                                    item.testAssignmentId,
                                    item.quantity + 1
                                  )
                                }
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.subtotal.toLocaleString()} ل.س
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() =>
                                removeTestFromInvoice(item.testAssignmentId)
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-sm font-medium text-left"
                        >
                          المجموع الكلي:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold">
                          {calculateTotal().toLocaleString()} ل.س
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-2">تفاصيل الدفع</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label
                    htmlFor="paidAmount"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    المبلغ المدفوع
                  </label>
                  <div className="flex items-center">
                    <input
                      id="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="mr-2">ل.س</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${
                    isPaid() ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span>
                  {isPaid()
                    ? "مدفوعة بالكامل"
                    : parseFloat(paidAmount) > 0
                    ? "مدفوعة جزئياً"
                    : "غير مدفوعة"}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Link
                href="/invoices"
                className="ml-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={
                  isCreatingInvoice ||
                  !selectedPatient ||
                  invoiceItems.length === 0
                }
                className={`px-4 py-2 text-white rounded-lg flex items-center ${
                  isCreatingInvoice ||
                  !selectedPatient ||
                  invoiceItems.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isCreatingInvoice ? (
                  <>
                    <LoadingSpinner className="ml-2 w-4 h-4" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Check className="ml-2 w-4 h-4" />
                    إنشاء الفاتورة
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
