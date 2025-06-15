"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, Loader, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function EditPatientPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isLoading: authLoading, token } = useAuth();

  const [name, setName] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // جلب بيانات المريض عند تحميل الصفحة
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // التحقق من صلاحيات المستخدم
    if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
      router.push("/patients");
      return;
    }

    // جلب بيانات المريض
    const fetchPatient = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/patients/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات المريض");
        }

        const data = await response.json();
        const patient = data.patient;

        // تعبئة البيانات في الحقول
        setName(patient.name);
        setFileNumber(patient.fileNumber);
        setPhone(patient.phone || "");
        setGender(patient.gender);

        // تحويل التاريخ من yyyy-mm-dd إلى dd/mm/yyyy
        if (patient.dateOfBirth) {
          const date = new Date(patient.dateOfBirth);
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          setDateOfBirth(`${day}/${month}/${year}`);
        } else {
          setDateOfBirth("");
        }

        setAddress(patient.address || "");
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setErrorMsg("حدث خطأ أثناء جلب بيانات المريض");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPatient();
  }, [id, user, authLoading, router, token]);

  // التحقق من صحة تنسيق التاريخ (dd/mm/yyyy)
  const validateDateFormat = (dateString: string): boolean => {
    if (!dateString) return true; // السماح بقيمة فارغة

    // التحقق من تنسيق dd/mm/yyyy
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);

    if (!match) return false;

    // استخراج اليوم والشهر والسنة
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // التحقق من صحة القيم
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;

    return true;
  };

  // تحويل التاريخ من dd/mm/yyyy إلى yyyy-mm-dd لحفظه في قاعدة البيانات
  const formatDateForServer = (dateString: string): string | undefined => {
    if (!dateString) return undefined;

    const [day, month, year] = dateString.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  // تنسيق التاريخ أثناء الكتابة
  const formatDateInput = (input: string): string => {
    // حذف جميع الحروف غير الأرقام
    const numbersOnly = input.replace(/[^\d]/g, "");

    // تنسيق التاريخ كـ dd/mm/yyyy
    if (numbersOnly.length <= 2) {
      return numbersOnly;
    } else if (numbersOnly.length <= 4) {
      return `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(2)}`;
    } else {
      return `${numbersOnly.slice(0, 2)}/${numbersOnly.slice(
        2,
        4
      )}/${numbersOnly.slice(4, 8)}`;
    }
  };

  // معالجة تغيير التاريخ
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // إذا كان المستخدم يحذف، نتيح له الحذف بدون إعادة تنسيق
    if (inputValue.length < dateOfBirth.length) {
      setDateOfBirth(inputValue);
      return;
    }

    // تنسيق التاريخ أثناء الكتابة
    const formattedDate = formatDateInput(inputValue);
    setDateOfBirth(formattedDate);

    // التحقق من صحة التنسيق إذا كان المستخدم انتهى من إدخال التاريخ
    if (formattedDate.length === 10) {
      if (!validateDateFormat(formattedDate)) {
        setDateError("تاريخ غير صالح، تأكد من اليوم والشهر والسنة");
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  };

  // تحويل تاريخ من calendar إلى dd/mm/yyyy
  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const dateValue = e.target.value; // بتنسيق yyyy-mm-dd
      if (dateValue) {
        const [year, month, day] = dateValue.split("-");
        setDateOfBirth(`${day}/${month}/${year}`);
        setDateError(null);
      }
    } catch (error) {
      console.error("خطأ في تحويل التاريخ:", error);
    }
  };

  // فتح تقويم النظام مباشرة عند النقر على الزر
  const openCalendar = () => {
    const dateInput = document.getElementById(
      "date-picker-real"
    ) as HTMLInputElement;
    if (dateInput && typeof dateInput.showPicker === "function") {
      dateInput.showPicker();
    }
  };

  // التحقق من صحة البيانات وفتح مربع حوار التأكيد
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة تنسيق التاريخ قبل المتابعة
    if (dateOfBirth && !validateDateFormat(dateOfBirth)) {
      setDateError("يرجى إدخال التاريخ بتنسيق dd/mm/yyyy");
      return;
    }

    // يمكن إضافة تحقق إضافي من صحة البيانات هنا إذا لزم الأمر
    setConfirmDialogOpen(true);
  };

  // معالجة حفظ البيانات بعد التأكيد
  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setDateError(null);

    try {
      // تحويل تنسيق التاريخ قبل إرساله للخادم
      const formattedDateOfBirth = formatDateForServer(dateOfBirth);

      // إرسال طلب تحديث البيانات
      const response = await fetch(`/api/patients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          fileNumber,
          phone: phone || undefined,
          gender,
          dateOfBirth: formattedDateOfBirth,
          address: address || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في تحديث بيانات المريض");
      }

      // العودة إلى صفحة عرض المريض بعد التحديث
      router.push(`/patients/${id}`);
    } catch (error) {
      console.error("Error updating patient:", error);
      setErrorMsg((error as Error).message || "حدث خطأ أثناء تحديث البيانات");
      setConfirmDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || initialLoading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // التحقق من الصلاحيات
  if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h1>
        <p>ليس لديك صلاحية لتعديل بيانات المرضى.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">تعديل بيانات المريض</h1>
        <p className="text-gray-600 mb-4">قم بتعديل بيانات المريض أدناه.</p>
        <Link
          href={`/patients/${id}`}
          className="text-indigo-600 hover:underline flex items-center"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          العودة إلى صفحة المريض
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{errorMsg}</p>
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        className="bg-white p-6 rounded-lg shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 mb-2">
              الاسم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              رقم الملف <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
              placeholder="أدخل رقم الهاتف"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              الجنس <span className="text-red-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">اختر الجنس</option>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">تاريخ الميلاد</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={dateOfBirth}
                  onChange={handleDateChange}
                  className={`w-full p-2 border ${
                    dateError ? "border-red-500" : "border-gray-300"
                  } rounded focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  placeholder="يوم/شهر/سنة"
                  maxLength={10}
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={openCalendar}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                >
                  <CalendarIcon className="h-5 w-5" />
                </button>
                <input
                  id="date-picker-real"
                  type="date"
                  onChange={handleCalendarChange}
                  className="absolute opacity-0 w-px h-px overflow-hidden"
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                  tabIndex={-1}
                />
              </div>
            </div>
            {dateError && (
              <p className="text-red-500 text-xs mt-1">{dateError}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-2">العنوان</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-end">
          <Link
            href={`/patients/${id}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            إلغاء
          </Link>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
            disabled={isLoading}
          >
            {isLoading && <Loader className="animate-spin w-4 h-4 ml-2" />}
            حفظ التغييرات
          </button>
        </div>
      </form>

      {/* مربع حوار تأكيد الحفظ */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حفظ التغييرات</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            هل أنت متأكد من حفظ التغييرات على بيانات المريض؟
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              className="ml-2"
            >
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader className="animate-spin w-4 h-4 ml-2" />}
              نعم، حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
