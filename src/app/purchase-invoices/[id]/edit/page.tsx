"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-hot-toast";
import { ArrowRight, Trash, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PurchaseInvoiceItem {
  id?: string;
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
}

export default function EditPurchaseInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSaveDialogOpen, setConfirmSaveDialogOpen] = useState(false);

  // بيانات الفاتورة
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([]);
  const [originalInvoice, setOriginalInvoice] =
    useState<PurchaseInvoice | null>(null);

  // استرجاع بيانات الفاتورة
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
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
        const invoice = data.invoice;
        setOriginalInvoice(invoice);

        // تعيين بيانات الفاتورة
        setSupplierName(invoice.supplierName);
        setInvoiceNumber(invoice.invoiceNumber || "");
        setTotalAmount(invoice.totalAmount);

        // التأكد من أن المبلغ المدفوع صحيح عندما تكون الفاتورة مدفوعة بالكامل
        if (invoice.isPaid) {
          setPaidAmount(invoice.totalAmount);
        } else {
          setPaidAmount(invoice.paidAmount);
        }

        setIsPaid(invoice.isPaid);
        setNotes(invoice.notes || "");

        // تنسيق التاريخ
        if (invoice.dueDate) {
          const date = new Date(invoice.dueDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          setDueDate(`${year}-${month}-${day}`);
        }

        // تعيين العناصر
        setItems(
          invoice.items.map((item: any) => ({
            id: item.id,
            itemName: item.itemName,
            description: item.description || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          }))
        );
      } catch (err) {
        console.error("Error fetching purchase invoice:", err);
        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء استرجاع بيانات فاتورة الشراء"
        );
        toast.error("حدث خطأ أثناء تحميل بيانات فاتورة الشراء");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [params.id, token]);

  // إضافة عنصر جديد للفاتورة
  const addItem = () => {
    setItems([
      ...items,
      {
        id: "temp-" + Date.now() + Math.random().toString(36).substring(2, 9),
        itemName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        subtotal: 0,
      },
    ]);
  };

  // حذف عنصر من الفاتورة
  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    // إعادة حساب المجموع بعد الحذف
    calculateTotalAmount(newItems);
  };

  // تحديث عنصر في الفاتورة
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const updatedItem = { ...newItems[index], [field]: value };

    // حساب المجموع الفرعي للعنصر
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? value : updatedItem.quantity;
      const unitPrice = field === "unitPrice" ? value : updatedItem.unitPrice;
      updatedItem.subtotal = quantity * unitPrice;
    }

    newItems[index] = updatedItem;
    setItems(newItems);

    // حساب المجموع الكلي للفاتورة
    calculateTotalAmount(newItems);
  };

  // حساب المجموع الكلي للفاتورة
  const calculateTotalAmount = (itemsList: PurchaseInvoiceItem[]) => {
    const total = itemsList.reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );
    setTotalAmount(total);
  };

  // التحقق من صحة البيانات
  const validateForm = () => {
    if (!supplierName.trim()) {
      toast.error("يرجى إدخال اسم المورد");
      return false;
    }

    if (items.length === 0) {
      toast.error("يجب إضافة عنصر واحد على الأقل للفاتورة");
      return false;
    }

    // التحقق من أن جميع العناصر تحتوي على اسم وكمية وسعر وحدة
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName.trim()) {
        toast.error(`يرجى إدخال اسم العنصر رقم ${i + 1}`);
        return false;
      }
      if (item.quantity <= 0) {
        toast.error(`يجب أن تكون كمية العنصر رقم ${i + 1} أكبر من صفر`);
        return false;
      }
      if (item.unitPrice <= 0) {
        toast.error(`يجب أن يكون سعر وحدة العنصر رقم ${i + 1} أكبر من صفر`);
        return false;
      }
    }

    // التحقق من المبلغ المدفوع
    if (paidAmount < 0) {
      toast.error("يجب أن يكون المبلغ المدفوع أكبر من أو يساوي صفر");
      return false;
    }

    if (paidAmount > totalAmount) {
      toast.error("لا يمكن أن يكون المبلغ المدفوع أكبر من المبلغ الإجمالي");
      return false;
    }

    return true;
  };

  // فتح مربع حوار تأكيد الحفظ
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setConfirmSaveDialogOpen(true);
    }
  };

  // إرسال النموذج
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/purchase-invoices/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierName,
          invoiceNumber: invoiceNumber || undefined,
          totalAmount,
          paidAmount,
          isPaid: isPaid || paidAmount === totalAmount,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            itemName: item.itemName,
            description: item.description || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "حدث خطأ أثناء تحديث فاتورة الشراء"
        );
      }

      toast.success("تم تحديث فاتورة الشراء بنجاح");

      // العودة إلى صفحة تفاصيل الفاتورة
      router.push(`/purchase-invoices/${params.id}`);
    } catch (err) {
      console.error("Error updating purchase invoice:", err);
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحديث فاتورة الشراء"
      );
      toast.error(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحديث فاتورة الشراء"
      );
    } finally {
      setIsSubmitting(false);
      setConfirmSaveDialogOpen(false);
    }
  };

  // تلقائيًا تعيين حالة الدفع بناءً على المبلغ المدفوع
  const handlePaidAmountChange = (value: number) => {
    setPaidAmount(value);
    if (value === totalAmount && totalAmount > 0) {
      setIsPaid(true);
    } else if (value < totalAmount) {
      setIsPaid(false);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded mb-4">
          <p className="text-red-600">{error}</p>
        </div>
        <Link
          href={`/purchase-invoices/${params.id}`}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى تفاصيل الفاتورة
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* رأس الصفحة */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href={`/purchase-invoices/${params.id}`}
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى تفاصيل الفاتورة
            </Link>
          </div>
          <h1 className="text-2xl font-bold">تعديل فاتورة الشراء</h1>
        </div>
      </div>

      {/* نموذج تعديل فاتورة الشراء */}
      <form onSubmit={handleFormSubmit}>
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            {/* معلومات الفاتورة الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="supplierName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  اسم المورد <span className="text-red-500">*</span>
                </label>
                <Input
                  id="supplierName"
                  type="text"
                  placeholder="أدخل اسم المورد"
                  value={supplierName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSupplierName(e.target.value)
                  }
                  required
                  dir="rtl"
                />
              </div>
              <div>
                <label
                  htmlFor="invoiceNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  رقم الفاتورة الخارجي
                </label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  placeholder="أدخل رقم الفاتورة الخارجي (اختياري)"
                  value={invoiceNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setInvoiceNumber(e.target.value)
                  }
                  dir="rtl"
                />
              </div>
              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  تاريخ الاستحقاق
                </label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDueDate(e.target.value)
                  }
                  dir="rtl"
                />
              </div>
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ملاحظات
                </label>
                <Textarea
                  id="notes"
                  placeholder="أدخل ملاحظات إضافية (اختياري)"
                  value={notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  rows={1}
                  dir="rtl"
                />
              </div>
            </div>

            {/* عناصر الفاتورة */}
            <div className="mt-8 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">عناصر الفاتورة</h3>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Plus className="ml-1 h-4 w-4" />
                  إضافة عنصر
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        الصنف <span className="text-red-500">*</span>
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
                        الكمية <span className="text-red-500">*</span>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        سعر الوحدة <span className="text-red-500">*</span>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        الإجمالي
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
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="text"
                            value={item.itemName}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updateItem(index, "itemName", e.target.value)
                            }
                            placeholder="اسم الصنف"
                            dir="rtl"
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="text"
                            value={item.description || ""}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updateItem(index, "description", e.target.value)
                            }
                            placeholder="وصف اختياري"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updateItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="1"
                            dir="rtl"
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              updateItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            dir="rtl"
                            required
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.subtotal.toFixed(2)} ل.س
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            type="button"
                            onClick={() => removeItem(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            disabled={items.length === 1}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ملخص المبالغ */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-end">
                <div className="w-full md:w-1/2 lg:w-1/3">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">المبلغ الإجمالي:</span>
                    <span className="font-semibold">
                      {totalAmount.toFixed(2)} ل.س
                    </span>
                  </div>

                  <div className="flex justify-between py-2">
                    <label
                      htmlFor="paidAmount"
                      className="text-gray-600 flex items-center"
                    >
                      المبلغ المدفوع:
                    </label>
                    <div className="flex items-center">
                      <Input
                        id="paidAmount"
                        type="number"
                        value={paidAmount}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handlePaidAmountChange(
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        max={totalAmount}
                        step="0.01"
                        className="w-32 text-left"
                      />
                      <span className="mr-2">ل.س</span>
                    </div>
                  </div>

                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="font-semibold">المبلغ المتبقي:</span>
                    <span className="font-bold text-indigo-600">
                      {(totalAmount - paidAmount).toFixed(2)} ل.س
                    </span>
                  </div>

                  <div className="flex items-center py-3 mt-2">
                    <Checkbox
                      id="isPaid"
                      checked={isPaid}
                      onCheckedChange={(checked: boolean) => setIsPaid(checked)}
                      className="ml-2"
                    />
                    <label
                      htmlFor="isPaid"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      تم دفع الفاتورة بالكامل
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* زر الإرسال */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="ml-2" /> جاري
                      الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2 h-4 w-4" /> حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* مربع حوار تأكيد الحفظ */}
      <Dialog
        open={confirmSaveDialogOpen}
        onOpenChange={setConfirmSaveDialogOpen}
      >
        <DialogContent dir="rtl" className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              تأكيد حفظ التغييرات
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center mb-2">
              أنت على وشك حفظ التغييرات على فاتورة الشراء:
            </p>
            <div className="bg-gray-50 p-4 rounded-md my-3">
              <p className="mb-1">
                <span className="font-semibold">المورد:</span> {supplierName}
              </p>
              <p className="mb-1">
                <span className="font-semibold">عدد العناصر:</span>{" "}
                {items.length}
              </p>
              <p className="mb-1">
                <span className="font-semibold">المبلغ الإجمالي:</span>{" "}
                {totalAmount.toFixed(2)} ل.س
              </p>
              <p>
                <span className="font-semibold">حالة الدفع:</span>{" "}
                {isPaid ? "مدفوعة بالكامل" : "غير مدفوعة بالكامل"}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
              <p className="text-yellow-700 text-center text-sm">
                هل أنت متأكد من رغبتك في حفظ هذه التغييرات؟
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmSaveDialogOpen(false)}
              className="min-w-[100px]"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" /> جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="ml-2 h-4 w-4" /> نعم، حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
