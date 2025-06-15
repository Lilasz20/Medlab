"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Loader,
  Trash,
  Edit,
  Eye,
  AlertTriangle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "react-hot-toast";
import ConfirmationModal from "@/components/common/ConfirmationModal";
import PatientsFilters from "@/components/patients/PatientsFilters";

interface Patient {
  id: string;
  fileNumber: string;
  name: string;
  gender: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export default function PatientsPage() {
  const { user, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // إضافة حالات الفلترة والترتيب
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    // تحقق من وجود مستخدم مصرح قبل جلب البيانات
    if (authLoading) return; // انتظر حتى يكتمل التحقق من المصادقة

    // إذا لم يكن المستخدم مسجلاً، عد إلى صفحة تسجيل الدخول
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // إذا كان المستخدم ليس لديه صلاحية، لا داعي لجلب البيانات
    if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
      setLoading(false);
      return;
    }

    const fetchPatients = async () => {
      try {
        setLoading(true);
        // إرسال token في header
        const response = await fetch("/api/patients", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات المرضى");
        }

        const data = await response.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
        setError("حدث خطأ أثناء جلب بيانات المرضى");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user, authLoading, router, token]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // تنظيف جميع الفلاتر
  const clearAllFilters = () => {
    setSearchQuery("");
    setGenderFilter("ALL");
    setSortOrder("newest");
  };

  // تطبيق الفلترة والترتيب على قائمة المرضى
  const processedPatients = patients
    .filter((patient) => {
      // البحث النصي
      const searchMatch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.fileNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.phone && patient.phone.includes(searchQuery));

      // الفلترة حسب الجنس
      const genderMatch =
        genderFilter === "ALL" || patient.gender === genderFilter;

      return searchMatch && genderMatch;
    })
    .sort((a, b) => {
      // الترتيب حسب تاريخ التسجيل
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const handleViewPatient = (id: string) => {
    router.push(`/patients/${id}`);
  };

  const handleEditPatient = (id: string) => {
    router.push(`/patients/${id}/edit`);
  };

  const handleDeletePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDeleteModal(true);
  };

  const confirmDeletePatient = async () => {
    if (!selectedPatient) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في حذف المريض");
      }

      // تحديث القائمة بعد الحذف
      setPatients(patients.filter((p) => p.id !== selectedPatient.id));
      setShowDeleteModal(false);
      setSelectedPatient(null);
      toast.success("تم حذف المريض بنجاح");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("حدث خطأ أثناء حذف المريض");
    } finally {
      setIsDeleting(false);
    }
  };

  // عرض شاشة التحميل إذا كان التحقق من المصادقة جاريًا
  if (authLoading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // التحقق من وجود مستخدم (تم نقل هذا المنطق إلى useEffect)
  if (!user) {
    return null; // سيقوم useEffect بإعادة التوجيه
  }

  // التحقق من الصلاحيات
  if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h1>
        <p>ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    );
  }

  // عرض حالة تحميل البيانات
  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري تحميل بيانات المرضى...</p>
        </div>
      </div>
    );
  }

  // عرض الخطأ إن وجد
  if (error) {
    return (
      <div className="w-full p-6 text-right">
        <h1 className="text-2xl font-bold mb-4 text-red-600">حدث خطأ</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة المرضى</h1>
        <p className="text-gray-600">إدارة سجلات المرضى وبياناتهم.</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <Link
          href="/patients/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <UserPlus size={18} className="ml-2" />
          إضافة مريض جديد
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="البحث عن مريض..."
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
              dir="rtl"
              value={searchQuery}
              onChange={handleSearch}
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
            {(genderFilter !== "ALL" || sortOrder !== "newest") && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* استخدام مكون الفلترة المنفصل */}
      <PatientsFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        genderFilter={genderFilter}
        setGenderFilter={setGenderFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearFilters={clearAllFilters}
      />

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                رقم الملف
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                الاسم
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                الجنس
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                رقم الهاتف
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                تاريخ الميلاد
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                تاريخ التسجيل
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
            {processedPatients.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  {searchQuery || genderFilter !== "ALL"
                    ? "لا توجد نتائج مطابقة للفلاتر المحددة"
                    : "لا توجد بيانات"}
                </td>
              </tr>
            ) : (
              processedPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {patient.fileNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.gender === "MALE" ? "ذكر" : "أنثى"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.phone || "غير متوفر"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {patient.dateOfBirth
                      ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy", {
                          locale: ar,
                        })
                      : "غير متوفر"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {format(new Date(patient.createdAt), "dd/MM/yyyy", {
                      locale: ar,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        onClick={() => handleViewPatient(patient.id)}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        <span>عرض</span>
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900 flex items-center mr-2"
                        onClick={() => handleEditPatient(patient.id)}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        <span>تعديل</span>
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900 flex items-center mr-2"
                        onClick={() => handleDeletePatient(patient)}
                      >
                        <Trash className="h-4 w-4 ml-1" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* استبدال نافذة تأكيد الحذف بالمكون المشترك */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="تأكيد حذف المريض"
        message={`هل أنت متأكد من رغبتك في حذف المريض "${
          selectedPatient?.name || ""
        }"؟`}
        type="delete"
        isLoading={isDeleting}
        onConfirm={confirmDeletePatient}
        onCancel={() => setShowDeleteModal(false)}
        infoContent={
          selectedPatient && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-700">
                معلومات المريض:
              </h4>
              <ul className="space-y-1">
                <li>
                  <span className="text-gray-600">الاسم:</span>{" "}
                  {selectedPatient.name}
                </li>
                <li>
                  <span className="text-gray-600">رقم الملف:</span>{" "}
                  {selectedPatient.fileNumber}
                </li>
                <li>
                  <span className="text-gray-600">الجنس:</span>{" "}
                  {selectedPatient.gender === "MALE" ? "ذكر" : "أنثى"}
                </li>
                {selectedPatient.phone && (
                  <li>
                    <span className="text-gray-600">رقم الهاتف:</span>{" "}
                    {selectedPatient.phone}
                  </li>
                )}
              </ul>
            </div>
          )
        }
      />
    </div>
  );
}
