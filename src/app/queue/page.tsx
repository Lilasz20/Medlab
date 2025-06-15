"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Users, Plus, Search, Filter, Printer, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function QueuePage() {
  const { user, token } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");
  const [searchQueueTerm, setSearchQueueTerm] = useState("");
  const [queueNumbers, setQueueNumbers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // جلب قائمة الانتظار من API
  useEffect(() => {
    if (!user || !token) return;

    const fetchQueueNumbers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/queue`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "حدث خطأ أثناء جلب بيانات قائمة الانتظار"
          );
        }

        const data = await response.json();
        // ترتيب البيانات بحيث تظهر أرقام الدور بشكل تنازلي (الأكبر في الأعلى)
        const sortedData = Array.isArray(data)
          ? [...data].sort((a, b) => {
              // ترتيب حسب رقم الدور بشكل تنازلي (من الكبير إلى الصغير)
              return b.number - a.number;
            })
          : data;

        setQueueNumbers(sortedData);
      } catch (err: any) {
        console.error("Error fetching queue numbers:", err);
        setError(err.message || "حدث خطأ أثناء جلب بيانات قائمة الانتظار");
      } finally {
        setLoading(false);
      }
    };

    fetchQueueNumbers();
  }, [user, token, refreshTrigger]);

  // البحث عن المرضى
  useEffect(() => {
    if (!searchPatientTerm || !token || !showAddModal) return;

    const searchTimeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(
          `/api/patients?search=${searchPatientTerm}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("خطأ في البحث عن المرضى");
        }

        const data = await response.json();
        // الاستجابة تكون على شكل { patients: [...], meta: {...} }
        const patientsArray = data.patients || [];
        setPatients(Array.isArray(patientsArray) ? patientsArray : []);
      } catch (err) {
        console.error("Error searching for patients:", err);
        setPatients([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchPatientTerm, token, showAddModal]);

  // Function to get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "WAITING":
        return {
          text: "في الانتظار",
          color: "bg-yellow-100 text-yellow-800",
        };
      case "PROCESSING":
        return {
          text: "قيد المعالجة",
          color: "bg-blue-100 text-blue-800",
        };
      case "COMPLETED":
        return {
          text: "تمت المعالجة",
          color: "bg-green-100 text-green-800",
        };
      case "CANCELLED":
        return {
          text: "ملغي",
          color: "bg-red-100 text-red-800",
        };
      default:
        return {
          text: status,
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  // إضافة مريض إلى قائمة الانتظار
  const handleAddToQueue = async (patientId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "حدث خطأ أثناء إضافة المريض إلى قائمة الانتظار"
        );
      }

      const data = await response.json();
      // إضافة العنصر الجديد إلى القائمة مع الحفاظ على الترتيب التنازلي حسب رقم الدور
      setQueueNumbers((prev) => {
        const newList = [...prev, data];
        return newList.sort((a, b) => b.number - a.number);
      });
      setShowAddModal(false);
      toast.success("تم إضافة المريض إلى قائمة الانتظار بنجاح");
    } catch (err: any) {
      console.error("Error adding patient to queue:", err);
      toast.error(
        err.message || "حدث خطأ أثناء إضافة المريض إلى قائمة الانتظار"
      );
    }
  };

  // تحديث حالة رقم الانتظار
  const handleUpdateQueueStatus = async (queueId: string, status: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "حدث خطأ أثناء تحديث حالة رقم الانتظار"
        );
      }

      const data = await response.json();

      // تحديث القائمة محلياً مع الحفاظ على الترتيب
      setQueueNumbers((prev) => {
        const updated = prev.map((q) => (q.id === queueId ? data : q));
        // إعادة ترتيب القائمة تنازلياً حسب رقم الدور
        return updated.sort((a, b) => b.number - a.number);
      });

      toast.success("تم تحديث حالة رقم الانتظار بنجاح");
    } catch (err: any) {
      console.error("Error updating queue status:", err);
      toast.error(err.message || "حدث خطأ أثناء تحديث حالة رقم الانتظار");
    }
  };

  // طباعة تذكرة الانتظار
  const handlePrintTicket = (queue: any) => {
    const printContent = `
      <html dir="rtl">
      <head>
        <title>تذكرة انتظار</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
          }
          .ticket {
            width: 80mm;
            margin: 0 auto;
            border: 1px solid #ccc;
            padding: 10px;
          }
          .number {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
          }
          .info {
            margin: 5px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h2>رقم الانتظار</h2>
          <div class="number">${queue.number}</div>
          <div class="info">اسم المريض: ${queue.patientName}</div>
          <div class="info">رقم الملف: ${queue.fileNumber}</div>
          <div class="info">تاريخ: ${new Date().toLocaleDateString(
            "ar-SA"
          )}</div>
          <div class="info">وقت الوصول: ${queue.arrivalTime}</div>
          <div class="footer">شكراً لانتظاركم</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      toast.error("فشل في فتح نافذة الطباعة. يرجى التحقق من إعدادات متصفحك.");
    }
  };

  // Filter queue based on search term
  const filteredQueue = queueNumbers.filter(
    (item) =>
      item.patientName?.toLowerCase().includes(searchQueueTerm.toLowerCase()) ||
      item.fileNumber?.toLowerCase().includes(searchQueueTerm.toLowerCase()) ||
      item.number.toString().includes(searchQueueTerm) ||
      item.arrivalTime?.includes(searchQueueTerm)
  );

  // Filter patients based on search term
  const filteredPatients = Array.isArray(patients)
    ? patients.filter(
        (patient) =>
          patient.name
            ?.toLowerCase()
            .includes(searchPatientTerm.toLowerCase()) ||
          patient.fileNumber
            ?.toLowerCase()
            .includes(searchPatientTerm.toLowerCase())
      )
    : [];

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة قائمة الانتظار</h1>
        <p className="text-gray-600">إدارة أرقام الدور وقائمة انتظار المرضى.</p>
      </div>

      {/* Current date display */}
      <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-center">
        <h2 className="text-lg font-semibold text-indigo-700">
          {new Date().toLocaleDateString("ar-SA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h2>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Plus size={18} className="ml-2" />
          إضافة مريض للانتظار
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="البحث في قائمة الانتظار..."
              value={searchQueueTerm}
              onChange={(e) => setSearchQueueTerm(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
              dir="rtl"
            />
          </div>
          <button className="bg-gray-100 p-2.5 rounded-lg flex items-center text-gray-700">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Queue Numbers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQueueTerm
              ? "لا توجد نتائج مطابقة للبحث"
              : "لا توجد أرقام انتظار لهذا اليوم"}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  رقم الدور
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
                  رقم الملف
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  وقت الوصول
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
              {filteredQueue.map((queue) => {
                const statusInfo = getStatusInfo(queue.status);
                return (
                  <tr key={queue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {queue.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {queue.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {queue.fileNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {queue.arrivalTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}
                      >
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintTicket(queue)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Printer size={16} className="ml-1" />
                          طباعة
                        </button>
                        {queue.status === "WAITING" && (
                          <>
                            <button
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                              onClick={() =>
                                handleUpdateQueueStatus(queue.id, "PROCESSING")
                              }
                            >
                              <Check size={16} className="ml-1" />
                              بدء
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900 flex items-center"
                              onClick={() =>
                                handleUpdateQueueStatus(queue.id, "CANCELLED")
                              }
                            >
                              <X size={16} className="ml-1" />
                              إلغاء
                            </button>
                          </>
                        )}
                        {queue.status === "PROCESSING" && (
                          <button
                            className="text-green-600 hover:text-green-900 flex items-center"
                            onClick={() =>
                              handleUpdateQueueStatus(queue.id, "COMPLETED")
                            }
                          >
                            <Check size={16} className="ml-1" />
                            إكمال
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Patient to Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              إضافة مريض إلى قائمة الانتظار
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البحث عن مريض
              </label>
              <input
                type="text"
                placeholder="اسم المريض أو رقم الملف..."
                value={searchPatientTerm}
                onChange={(e) => setSearchPatientTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {/* Patient search results */}
            <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg">
              {searchLoading ? (
                <div className="p-4 flex justify-center">
                  <LoadingSpinner className="w-6 h-6" />
                </div>
              ) : filteredPatients.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <li
                      key={patient.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddToQueue(patient.id)}
                    >
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-gray-500">
                        {patient.fileNumber}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-center text-gray-500">
                  {searchPatientTerm
                    ? "لم يتم العثور على نتائج"
                    : "ابدأ البحث بكتابة اسم المريض أو رقم الملف"}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
