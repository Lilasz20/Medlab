"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Beaker,
  Plus,
  Search,
  Filter,
  Trash,
  Edit,
  LinkIcon,
  Loader,
  X,
  User,
  AlertTriangle,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/common/ConfirmationModal";
import TestsFilters from "@/components/tests/TestsFilters";

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
}

export default function TestsPage() {
  const { user, token } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Patient search for assignment
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // حفظ بيانات الفحص قبل التعديل للمقارنة
  const [originalTest, setOriginalTest] = useState<Test | null>(null);

  // إضافة حالات الفلترة والترتيب
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("name_asc");

  const router = useRouter();

  // استخراج فئات التحاليل الفريدة من البيانات
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(tests.map((test) => test.category))
    );
    return uniqueCategories
      .filter(Boolean)
      .sort()
      .map((category) => ({
        value: category,
        label: category,
      }));
  }, [tests]);

  // تنظيف جميع الفلاتر
  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("ALL");
    setSortOrder("name_asc");
  };

  // Fetch tests when component mounts
  useEffect(() => {
    fetchTests();
  }, []);

  // Fetch tests from API
  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في جلب بيانات الفحوصات");
      }

      const data = await response.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الفحوصات");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new test
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: testName,
          category,
          price: parseFloat(price),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في إضافة الفحص");
      }

      const { test } = await response.json();

      // Add the new test to the list
      setTests([...tests, test]);

      // Reset form
      setTestName("");
      setCategory("");
      setPrice("");
      setShowAddForm(false);

      toast.success("تم إضافة الفحص بنجاح");
    } catch (error: any) {
      console.error("Error adding test:", error);
      toast.error(error.message || "حدث خطأ أثناء إضافة الفحص");
    }
  };

  // Search for patients
  const searchPatients = async () => {
    if (!patientSearchTerm.trim()) return;

    try {
      setIsSearchingPatients(true);
      setSearchedPatients([]); // مسح نتائج البحث السابقة أثناء البحث

      // تغيير طريقة طلب البحث وإضافة timeout للتعامل مع حالات الانتظار الطويلة
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 ثوان كحد أقصى

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
            Authorization: `Bearer ${token}`,
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
        // تحديث القائمة بنتائج البحث
        setSearchedPatients(data.patients || []);
        console.log("تم استلام بيانات المرضى:", data.patients?.length || 0);
      }
    } catch (error: any) {
      console.error("Error searching patients:", error);

      // رسائل خطأ أكثر تحديدًا
      if (error.name === "AbortError") {
        toast.error("استغرق البحث وقتًا طويلاً، يرجى المحاولة مرة أخرى");
      } else {
        toast.error(error.message || "حدث خطأ أثناء البحث عن المرضى");
      }
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // Handle opening the assign test modal
  const handleAssignTest = (test: Test) => {
    setSelectedTest(test);
    setSearchedPatients([]);
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setIsSearchingPatients(false);
    setIsAssigning(false);
    setShowAssignModal(true);
  };

  // تنظيف الحالة عند الإغلاق
  const handleCloseModal = () => {
    setShowAssignModal(false);
    setTimeout(() => {
      setSelectedTest(null);
      setSearchedPatients([]);
      setSelectedPatient(null);
      setPatientSearchTerm("");
    }, 300);
  };

  // تخصيص الفحص للمريض
  const assignTestToPatient = async () => {
    if (!selectedTest || !selectedPatient) return;

    try {
      setIsAssigning(true);

      // إضافة timeout للتعامل مع الانتظار الطويل
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("/api/tests/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          testId: selectedTest.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "فشل في قراءة استجابة الخادم" }));
        throw new Error(errorData.message || "فشل في تخصيص الفحص");
      }

      // إغلاق النموذج بعد النجاح
      toast.success("تم تخصيص الفحص للمريض بنجاح");
      setTimeout(() => {
        handleCloseModal();
      }, 500);
    } catch (error: any) {
      console.error("Error assigning test:", error);

      // رسائل خطأ مخصصة
      if (error.name === "AbortError") {
        toast.error("استغرق الطلب وقتًا طويلاً، يرجى المحاولة مرة أخرى");
      } else if (error.message.includes("مخصص بالفعل")) {
        toast.error("هذا الفحص مخصص بالفعل لهذا المريض");
      } else {
        toast.error(error.message || "حدث خطأ أثناء تخصيص الفحص");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle opening the edit test modal
  const handleEditTest = (test: Test) => {
    setSelectedTest(test);
    setOriginalTest(test);
    setTestName(test.name);
    setCategory(test.category);
    setPrice(test.price.toString());
    setDescription(test.description || "");
    setShowEditModal(true);
  };

  // Handle showing edit confirmation modal
  const handleEditConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    setShowEditConfirmModal(true);
  };

  // Handle actual edit test form submission
  const handleEditSubmit = async () => {
    if (!selectedTest) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/tests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedTest.id,
          name: testName,
          category,
          price: parseFloat(price),
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في تعديل الفحص");
      }

      const { test } = await response.json();

      // Update the test in the list
      setTests(tests.map((t) => (t.id === selectedTest.id ? test : t)));

      // Close modals and reset form
      setShowEditConfirmModal(false);
      setShowEditModal(false);
      setSelectedTest(null);
      setOriginalTest(null);
      setIsSubmitting(false);

      toast.success("تم تعديل الفحص بنجاح");
    } catch (error: any) {
      console.error("Error editing test:", error);
      toast.error(error.message || "حدث خطأ أثناء تعديل الفحص");
      setIsSubmitting(false);
    }
  };

  // تحديد ما إذا كانت هناك تغييرات في النموذج
  const hasChanges = () => {
    if (!originalTest) return false;

    return (
      testName !== originalTest.name ||
      category !== originalTest.category ||
      parseFloat(price) !== originalTest.price ||
      description !== (originalTest.description || "")
    );
  };

  // Handle opening the delete confirmation modal
  const handleDeleteTest = (test: Test) => {
    setSelectedTest(test);
    setShowDeleteModal(true);
  };

  // Handle delete test
  const handleConfirmDelete = async () => {
    if (!selectedTest) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/tests?id=${selectedTest.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        // معالجة خاصة للفحوصات المخصصة لمرضى
        if (errorData.isAssigned) {
          toast.error("لا يمكن حذف هذا الفحص لأنه مخصص بالفعل لمرضى");
        } else {
          throw new Error(errorData.message || "فشل في حذف الفحص");
        }
      } else {
        // Remove test from list
        setTests(tests.filter((t) => t.id !== selectedTest.id));
        toast.success("تم حذف الفحص بنجاح");
      }

      // Close modal
      setShowDeleteModal(false);
      setSelectedTest(null);
      setIsDeleting(false);
    } catch (error: any) {
      console.error("Error deleting test:", error);
      toast.error(error.message || "حدث خطأ أثناء حذف الفحص");
      setIsDeleting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US") + " ل.س";
  };

  // تطبيق الفلترة والترتيب على قائمة الفحوصات
  const processedTests = useMemo(() => {
    return tests
      .filter((test) => {
        // البحث النصي
        const searchMatch =
          searchTerm === "" ||
          test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          formatCurrency(test.price).includes(searchTerm);

        // الفلترة حسب نوع التحليل
        const categoryMatch =
          categoryFilter === "ALL" || test.category === categoryFilter;

        return searchMatch && categoryMatch;
      })
      .sort((a, b) => {
        // الترتيب حسب الخيار المحدد
        switch (sortOrder) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "price_asc":
            return a.price - b.price;
          case "price_desc":
            return b.price - a.price;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [tests, searchTerm, categoryFilter, sortOrder]);

  if (!user) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">جاري تحميل البيانات...</h1>
      </div>
    );
  }

  // تعديل الصلاحيات للسماح لموظف الاستقبال
  if (
    user.role !== "ADMIN" &&
    user.role !== "LAB_TECHNICIAN" &&
    user.role !== "RECEPTIONIST"
  ) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h1>
        <p>ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة الفحوصات المخبرية</h1>
        <p className="text-gray-600">إدارة قائمة الفحوصات المخبرية وأسعارها.</p>
      </div>

      {/* Add New Test Form - only for ADMIN and LAB_TECHNICIAN */}
      {showAddForm &&
        (user.role === "ADMIN" || user.role === "LAB_TECHNICIAN") && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">إضافة فحص جديد</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="testName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  اسم الفحص
                </label>
                <input
                  id="testName"
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  نوع التحليل
                </label>
                <input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  السعر (ل.س)
                </label>
                <input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 ml-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        )}

      {/* Actions Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        {!showAddForm && (
          <div className="flex items-center gap-3">
            {/* إظهار زر إضافة فقط للمدير وفني المختبر */}
            {(user.role === "ADMIN" || user.role === "LAB_TECHNICIAN") && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus size={18} className="ml-2" />
                إضافة فحص جديد
              </button>
            )}

            {/* زر تخصيص فحوصات متعددة متاح للكل */}
            <button
              onClick={() => router.push("/tests/assign")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <LinkIcon size={18} className="ml-2" />
              تخصيص فحوصات متعددة
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="البحث عن فحص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
              dir="rtl"
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
            {(categoryFilter !== "ALL" || sortOrder !== "name_asc") && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* استخدام مكون الفلترة المنفصل */}
      <TestsFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearFilters={clearAllFilters}
        categories={categories}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="mr-2 text-gray-600">جاري تحميل الفحوصات...</span>
        </div>
      ) : (
        /* Tests Table */
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  اسم الفحص
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  نوع التحليل
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
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedTests.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {searchTerm || categoryFilter !== "ALL"
                      ? "لا توجد نتائج تطابق الفلاتر المحددة"
                      : "لا توجد فحوصات متاحة، قم بإضافة فحص جديد"}
                  </td>
                </tr>
              ) : (
                processedTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">
                      <p>{test.name}</p>
                      {test.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {test.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {test.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(test.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        {/* زر تخصيص متاح لجميع الأدوار */}
                        <button
                          onClick={() => handleAssignTest(test)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <LinkIcon className="ml-1 h-4 w-4" />
                          تخصيص
                        </button>

                        {/* إظهار زر التعديل فقط للمدير وفني المختبر */}
                        {(user.role === "ADMIN" ||
                          user.role === "LAB_TECHNICIAN") && (
                          <button
                            onClick={() => handleEditTest(test)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Edit className="ml-1 h-4 w-4" />
                            تعديل
                          </button>
                        )}

                        {/* إظهار زر الحذف للمدير وفني المختبر */}
                        {(user.role === "ADMIN" ||
                          user.role === "LAB_TECHNICIAN") && (
                          <button
                            onClick={() => handleDeleteTest(test)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <Trash className="ml-1 h-4 w-4" />
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Test Modal */}
      {showAssignModal && selectedTest && (
        <div className="modal-overlay">
          <div className="modal-content" dir="rtl">
            <div className="px-6 pt-5 pb-4">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  تخصيص فحص لمريض
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div>
                <div className="bg-gray-50 p-4 rounded-md mb-5 border border-gray-200">
                  <p className="font-semibold mb-2">معلومات الفحص:</p>
                  <p className="mb-1">الاسم: {selectedTest.name}</p>
                  <p className="mb-1">النوع: {selectedTest.category}</p>
                  <p>السعر: {formatCurrency(selectedTest.price)}</p>
                </div>

                {/* Patient Selection */}
                <div className="mb-5">
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
                      disabled={
                        isSearchingPatients || !patientSearchTerm.trim()
                      }
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

                  {/* Search Results */}
                  {searchedPatients.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-3">
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Patient */}
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
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse">
              <button
                type="button"
                onClick={assignTestToPatient}
                disabled={!selectedPatient || isAssigning}
                className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base ${
                  !selectedPatient || isAssigning
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                } mr-3`}
              >
                {isAssigning ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin ml-2" />
                    جارِ التخصيص...
                  </>
                ) : (
                  "تخصيص الفحص"
                )}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 text-base"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {showEditModal && selectedTest && (
        <div className="modal-overlay">
          <div className="modal-content" dir="rtl">
            <div className="px-6 pt-5 pb-4">
              <div className="flex justify-between items-center mb-5 border-b pb-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  تعديل الفحص
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditConfirm} className="space-y-4">
                <div>
                  <label
                    htmlFor="editTestName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    اسم الفحص
                  </label>
                  <input
                    id="editTestName"
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editCategory"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    نوع التحليل
                  </label>
                  <input
                    id="editCategory"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editPrice"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    السعر (ل.س)
                  </label>
                  <input
                    id="editPrice"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    وصف الفحص (اختياري)
                  </label>
                  <textarea
                    id="editDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 ml-2"
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center justify-center"
                    disabled={isSubmitting || !hasChanges()}
                  >
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد التعديل - استبدال بالمكون المشترك */}
      <ConfirmationModal
        isOpen={showEditConfirmModal}
        title="تأكيد تعديل الفحص"
        message={`هل أنت متأكد من رغبتك في حفظ التغييرات على فحص "${
          originalTest?.name || ""
        }"؟`}
        type="edit"
        isLoading={isSubmitting}
        onConfirm={handleEditSubmit}
        onCancel={() => setShowEditConfirmModal(false)}
        infoContent={
          originalTest && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">التغييرات:</h4>
              <ul className="space-y-1">
                {testName !== originalTest.name && (
                  <li>
                    <span className="text-gray-600">الاسم:</span>
                    <span className="line-through mr-1">
                      {originalTest.name}
                    </span>
                    <span className="text-indigo-600 mr-2">{testName}</span>
                  </li>
                )}
                {category !== originalTest.category && (
                  <li>
                    <span className="text-gray-600">التصنيف:</span>
                    <span className="line-through mr-1">
                      {originalTest.category}
                    </span>
                    <span className="text-indigo-600 mr-2">{category}</span>
                  </li>
                )}
                {parseFloat(price) !== originalTest.price && (
                  <li>
                    <span className="text-gray-600">السعر:</span>
                    <span className="line-through mr-1">
                      {formatCurrency(originalTest.price)}
                    </span>
                    <span className="text-indigo-600 mr-2">
                      {formatCurrency(parseFloat(price))}
                    </span>
                  </li>
                )}
                {description !== (originalTest.description || "") && (
                  <li>
                    <span className="text-gray-600">الوصف:</span>
                    <span className="line-through mr-1">
                      {originalTest.description || "غير متوفر"}
                    </span>
                    <span className="text-indigo-600 mr-2">
                      {description || "غير متوفر"}
                    </span>
                  </li>
                )}
                {!hasChanges() && (
                  <li className="text-yellow-600">لم يتم إجراء أي تغييرات</li>
                )}
              </ul>
            </div>
          )
        }
      />

      {/* نافذة تأكيد الحذف - استبدال بالمكون المشترك */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="تأكيد حذف الفحص"
        message={`هل أنت متأكد من رغبتك في حذف فحص "${
          selectedTest?.name || ""
        }"؟`}
        type="delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        infoContent={
          selectedTest && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">
                معلومات الفحص:
              </h4>
              <ul className="space-y-1">
                <li>
                  <span className="text-gray-600">الاسم:</span>{" "}
                  {selectedTest.name}
                </li>
                <li>
                  <span className="text-gray-600">التصنيف:</span>{" "}
                  {selectedTest.category}
                </li>
                <li>
                  <span className="text-gray-600">السعر:</span>{" "}
                  {formatCurrency(selectedTest.price)}
                </li>
              </ul>
            </div>
          )
        }
      />
    </div>
  );
}
