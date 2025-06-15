"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Beaker,
  Search,
  User,
  Loader,
  X,
  Check,
  ChevronLeft,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Test {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

interface Patient {
  id: string;
  fileNumber: string;
  name: string;
  gender?: string;
  phone?: string;
}

export default function AssignTestsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // التحقق من الصلاحيات
  useEffect(() => {
    if (
      user &&
      user.role !== "ADMIN" &&
      user.role !== "LAB_TECHNICIAN" &&
      user.role !== "RECEPTIONIST"
    ) {
      toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة");
      router.push("/dashboard");
    }
  }, [user, router]);

  // حالات البيانات
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTests, setSelectedTests] = useState<Test[]>([]);

  // البحث عن المرضى
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  // حالة طلب التخصيص
  const [isAssigning, setIsAssigning] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "selectPatient" | "selectTests"
  >("selectPatient");

  // جلب الفحوصات عند تحميل الصفحة
  useEffect(() => {
    fetchTests();
  }, []);

  // جلب الفحوصات من API
  const fetchTests = async () => {
    try {
      setIsLoadingTests(true);
      const response = await fetch("/api/tests");

      if (!response.ok) {
        throw new Error("فشل في جلب بيانات الفحوصات");
      }

      const data = await response.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الفحوصات");
    } finally {
      setIsLoadingTests(false);
    }
  };

  // البحث عن المرضى
  const searchPatients = async () => {
    if (!patientSearchTerm.trim()) return;

    try {
      setIsSearchingPatients(true);
      setSearchedPatients([]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `/api/patients?search=${encodeURIComponent(
          patientSearchTerm
        )}&limit=10`,
        {
          signal: controller.signal,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ message: "فشل في قراءة استجابة الخادم" }));
        throw new Error(data.message || "فشل في البحث عن المرضى");
      }

      const data = await response.json().catch(() => ({ patients: [] }));

      if (data.patients?.length === 0) {
        toast.success("لم يتم العثور على مرضى مطابقين");
      } else {
        setSearchedPatients(data.patients || []);
        console.log("تم استلام بيانات المرضى:", data.patients?.length || 0);
      }
    } catch (error: any) {
      console.error("Error searching patients:", error);

      if (error.name === "AbortError") {
        toast.error("استغرق البحث وقتًا طويلاً، يرجى المحاولة مرة أخرى");
      } else {
        toast.error(error.message || "حدث خطأ أثناء البحث عن المرضى");
      }
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // اختيار/إلغاء اختيار فحص
  const toggleTestSelection = (test: Test) => {
    if (selectedTests.some((t) => t.id === test.id)) {
      setSelectedTests(selectedTests.filter((t) => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  // حساب المجموع الكلي للفحوصات المحددة
  const calculateTotal = () => {
    return selectedTests.reduce((total, test) => total + test.price, 0);
  };

  // تخصيص الفحوصات المحددة للمريض
  const assignTestsToPatient = async () => {
    if (!selectedPatient || selectedTests.length === 0) {
      toast.error("يرجى اختيار مريض وفحص واحد على الأقل");
      return;
    }

    try {
      setIsAssigning(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/tests/assign-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          testIds: selectedTests.map((test) => test.id),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "فشل في قراءة استجابة الخادم" }));
        throw new Error(errorData.message || "فشل في تخصيص الفحوصات");
      }

      const data = await response.json();
      toast.success(`تم تخصيص ${selectedTests.length} فحص للمريض بنجاح`);

      setTimeout(() => {
        router.push("/tests");
      }, 1500);
    } catch (error: any) {
      console.error("Error assigning tests:", error);

      if (error.name === "AbortError") {
        toast.error("استغرق الطلب وقتًا طويلاً، يرجى المحاولة مرة أخرى");
      } else {
        toast.error(error.message || "حدث خطأ أثناء تخصيص الفحوصات");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // تنسيق العملة
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US") + " ل.س";
  };

  // فلترة الفحوصات بناءً على البحث
  const filteredTests = tests.filter(
    (test) =>
      test.name.includes(searchTerm) ||
      test.category.includes(searchTerm) ||
      formatCurrency(test.price).includes(searchTerm)
  );

  return (
    <div className="w-full bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push("/tests")}
            className="flex items-center text-gray-600 hover:text-gray-900 ml-4"
          >
            <ChevronRight className="h-5 w-5 ml-1" />
            <span>عودة</span>
          </button>
          <h1 className="text-2xl font-bold">تخصيص فحوصات متعددة لمريض</h1>
        </div>

        {/* خطوات العملية */}
        <div className="flex mb-8 bg-white p-4 rounded-lg shadow-md">
          <div
            className={`flex-1 flex items-center justify-center p-3 rounded-lg ${
              currentStep === "selectPatient"
                ? "bg-indigo-100 border-2 border-indigo-500"
                : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                currentStep === "selectPatient"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              1
            </div>
            <span
              className={currentStep === "selectPatient" ? "font-semibold" : ""}
            >
              اختيار المريض
            </span>
          </div>
          <div className="mx-4 flex items-center text-gray-400">
            <ArrowLeft className="h-5 w-5" />
          </div>
          <div
            className={`flex-1 flex items-center justify-center p-3 rounded-lg ${
              currentStep === "selectTests"
                ? "bg-indigo-100 border-2 border-indigo-500"
                : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                currentStep === "selectTests"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </div>
            <span
              className={currentStep === "selectTests" ? "font-semibold" : ""}
            >
              اختيار الفحوصات
            </span>
          </div>
        </div>

        {/* شاشة اختيار المريض */}
        {currentStep === "selectPatient" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">اختيار المريض</h2>

            {/* البحث عن المرضى */}
            <div className="mb-6">
              <label className="block text-md font-medium text-gray-700 mb-2">
                بحث عن مريض
              </label>
              <div className="flex mb-3">
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                  placeholder="اكتب اسم المريض أو رقم الملف"
                  className="w-full border border-gray-300 rounded-r-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={searchPatients}
                  disabled={isSearchingPatients || !patientSearchTerm.trim()}
                  className={`p-3 rounded-l-lg flex items-center justify-center min-w-[60px] ${
                    isSearchingPatients || !patientSearchTerm.trim()
                      ? "bg-gray-300 text-gray-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {isSearchingPatients ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* نتائج البحث */}
              {searchedPatients.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto mb-3">
                  {searchedPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`p-3 cursor-pointer hover:bg-gray-100 ${
                        selectedPatient?.id === patient.id
                          ? "bg-indigo-50 border-r-4 border-indigo-500"
                          : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-500 ml-3" />
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-gray-500">
                            رقم الملف: {patient.fileNumber}
                          </p>
                          {patient.phone && (
                            <p className="text-sm text-gray-500">
                              رقم الهاتف: {patient.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* المريض المحدد */}
              {selectedPatient && (
                <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        المريض المحدد: {selectedPatient.name}
                      </p>
                      <p className="text-sm">
                        رقم الملف: {selectedPatient.fileNumber}
                      </p>
                      {selectedPatient.phone && (
                        <p className="text-sm">
                          رقم الهاتف: {selectedPatient.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCurrentStep("selectTests")}
                disabled={!selectedPatient}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 ${
                  !selectedPatient
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <span>التالي: اختيار الفحوصات</span>
                <ArrowRight className="h-4 w-4 mr-2" />
              </button>
            </div>
          </div>
        )}

        {/* شاشة اختيار الفحوصات */}
        {currentStep === "selectTests" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              اختيار الفحوصات للمريض: {selectedPatient?.name}
            </h2>

            {/* البحث في الفحوصات */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="search"
                  placeholder="البحث في الفحوصات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-10 py-2 border border-gray-300 rounded-lg"
                />
                <div className="absolute right-3 top-2.5 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* قائمة الفحوصات */}
            {isLoadingTests ? (
              <div className="flex justify-center items-center p-6">
                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="mr-2 text-gray-600">
                  جاري تحميل الفحوصات...
                </span>
              </div>
            ) : (
              <div className="mb-6">
                {filteredTests.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    لا توجد فحوصات مطابقة
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            الاختيار
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            اسم الفحص
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            نوع التحليل
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            السعر
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTests.map((test) => (
                          <tr
                            key={test.id}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedTests.some((t) => t.id === test.id)
                                ? "bg-indigo-50"
                                : ""
                            }`}
                            onClick={() => toggleTestSelection(test)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div
                                className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                                  selectedTests.some((t) => t.id === test.id)
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-gray-300"
                                }`}
                              >
                                {selectedTests.some(
                                  (t) => t.id === test.id
                                ) && <Check className="h-4 w-4 text-white" />}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {test.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {test.category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(test.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ملخص الفحوصات المختارة */}
            {selectedTests.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold mb-2">
                  الفحوصات المختارة ({selectedTests.length})
                </h3>
                <ul className="mb-3">
                  {selectedTests.map((test) => (
                    <li
                      key={test.id}
                      className="flex justify-between items-center py-1"
                    >
                      <span>{test.name}</span>
                      <span className="text-gray-600">
                        {formatCurrency(test.price)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                  <span>المجموع:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep("selectPatient")}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                العودة لاختيار المريض
              </button>

              <button
                onClick={assignTestsToPatient}
                disabled={selectedTests.length === 0 || isAssigning}
                className={`inline-flex items-center rounded-md px-4 py-2 ${
                  selectedTests.length === 0 || isAssigning
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {isAssigning ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin ml-2" />
                    جارِ تخصيص الفحوصات...
                  </>
                ) : (
                  `تخصيص ${selectedTests.length} فحص للمريض`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
