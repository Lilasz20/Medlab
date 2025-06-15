"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "react-hot-toast";

export default function NewPatientPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGeneratingFileNumber, setIsGeneratingFileNumber] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // توليد رقم ملف تلقائي عند تحميل الصفحة
  useEffect(() => {
    generateFileNumber();
  }, [token]);

  // وظيفة لتوليد رقم ملف جديد
  const generateFileNumber = async () => {
    if (!token) return;

    setIsGeneratingFileNumber(true);
    setErrorMsg(null);

    try {
      // جلب آخر رقم ملف من قاعدة البيانات
      const response = await fetch("/api/patients/next-file-number", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("فشل في جلب رقم الملف التالي");
      }

      const data = await response.json();
      setFileNumber(data.nextFileNumber);

      // عرض رسالة إذا كان الرقم بديلاً
      if (data.message) {
        console.log(data.message);
      }
    } catch (error) {
      console.error("Error generating file number:", error);
      // استخدام رقم افتراضي في حالة الفشل
      setFileNumber("PT-1");
    } finally {
      setIsGeneratingFileNumber(false);
    }
  };

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من صحة تنسيق التاريخ قبل الإرسال
    if (dateOfBirth && !validateDateFormat(dateOfBirth)) {
      setDateError("يرجى إدخال التاريخ بتنسيق dd/mm/yyyy");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setDateError(null);

    try {
      // التحقق من عدم وجود رقم ملف مكرر قبل الإرسال
      const checkResponse = await fetch(
        `/api/patients/check-file-number?fileNumber=${encodeURIComponent(
          fileNumber
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).catch(() => null);

      // إذا نجح التحقق وكان الرقم موجودًا بالفعل
      if (checkResponse && checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          // توليد رقم ملف جديد تلقائيًا
          await generateFileNumber();
          setErrorMsg("تم توليد رقم ملف جديد للمريض نظراً لوجود رقم سابق");
          // نستمر بالتنفيذ بعد توليد رقم جديد
        }
      }

      // Make an API call to create the patient
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          fileNumber,
          phone: phone || undefined,
          gender,
          dateOfBirth: formatDateForServer(dateOfBirth),
          address: address || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // إذا كان الخطأ بسبب تكرار رقم الملف، نقوم بتوليد رقم جديد
        if (response.status === 409) {
          await generateFileNumber();
          setErrorMsg("تم توليد رقم ملف جديد للمريض نظراً لوجود رقم سابق");
          setIsLoading(false);
          return; // نتوقف هنا وننتظر من المستخدم إعادة الإرسال بالرقم الجديد
        } else {
          throw new Error(errorData.message || "فشل في إضافة المريض");
        }
      }

      const data = await response.json();

      // Show success message using toast
      toast.success("تم إضافة المريض بنجاح!");

      // Navigate back to patients list
      router.push("/patients");
    } catch (error) {
      console.error("Error creating patient:", error);
      setErrorMsg((error as Error).message || "حدث خطأ أثناء إضافة المريض");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">جاري تحميل البيانات...</h1>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
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
            href="/patients"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ArrowRight className="ml-1" size={16} />
            <span>العودة إلى قائمة المرضى</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">إضافة مريض جديد</h1>
        <p className="text-gray-600">
          أدخل معلومات المريض لإضافته إلى قاعدة البيانات.
        </p>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div>
              <p className="text-red-700">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="أدخل الاسم الكامل"
              />
            </div>

            {/* File Number */}
            <div>
              <label
                htmlFor="fileNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                رقم الملف <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="fileNumber"
                  type="text"
                  value={fileNumber}
                  readOnly
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="يتم توليده تلقائيًا..."
                />
                {isGeneratingFileNumber && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                يتم توليد رقم الملف تلقائيًا بالصيغة PT-xxx للمريض الجديد
              </p>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                رقم الهاتف
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                placeholder="أدخل رقم الهاتف"
              />
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                الجنس <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="MALE">ذكر</option>
                <option value="FEMALE">أنثى</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                تاريخ الميلاد
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="dateOfBirth"
                    type="text"
                    value={dateOfBirth}
                    onChange={handleDateChange}
                    className={`w-full px-4 py-2 border ${
                      dateError ? "border-red-500" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
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

            {/* Address */}
            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                العنوان
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="أدخل العنوان"
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Link
              href="/patients"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 ml-2"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isLoading || isGeneratingFileNumber}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></span>
                  جاري الحفظ...
                </>
              ) : (
                "حفظ"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
