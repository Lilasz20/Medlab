import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface SampleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSampleRegistered: () => void;
}

export default function SampleRegistrationModal({
  isOpen,
  onClose,
  onSampleRegistered,
}: SampleRegistrationModalProps) {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pending tests that need sample collection
  useEffect(() => {
    if (isOpen && token) {
      fetchPendingTests();
    }
  }, [isOpen, token]);

  const fetchPendingTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tests/assignments?status=PENDING", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("فشل جلب الفحوصات المعلقة");
      }

      const data = await response.json();
      console.log("تم استلام", data.length, "فحص من واجهة API");

      const filteredTests = data.filter((test: any) => {
        const isValidStatus = test.status === "PENDING";
        return isValidStatus;
      });

      console.log("تم تصفية الفحوصات، متبقي:", filteredTests.length);
      setPendingTests(filteredTests);
    } catch (err: any) {
      console.error("خطأ في جلب الفحوصات:", err);
      setError("حدث خطأ أثناء جلب الفحوصات المعلقة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) {
      setError("يرجى اختيار فحص");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // إنشاء معرف فريد للطلب للمساعدة في تتبع الطلبات المتزامنة
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    try {
      // إضافة retry logic - نحاول مرتين بحد أقصى
      let retryCount = 0;
      const maxRetries = 2;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          // إضافة التأخير في المحاولات اللاحقة
          if (retryCount > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`إعادة محاولة #${retryCount} لتسجيل العينة...`);
          }

          const response = await fetch("/api/samples", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              testAssignmentId: selectedTest,
              notes: notes,
              forceReplace: true,
              timestamp: Date.now(),
              requestId, // إرسال معرف الطلب للمساعدة في التتبع
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error("خطأ في استجابة API:", response.status, data);

            if (response.status === 409) {
              // حالة وجود عينة مسجلة من قبل
              setError(
                "تم تسجيل عينة لهذا الفحص بالفعل. جاري إعادة تحميل القائمة..."
              );

              setTimeout(() => {
                fetchPendingTests();
                setSelectedTest("");
                setStep(1);
                setError(null);
              }, 1500);

              return;
            } else if (response.status === 429) {
              // حالة وجود عملية تسجيل جارية لنفس الفحص
              console.log("هناك عملية تسجيل جارية، يتم الانتظار...");
              // زيادة العداد ومحاولة مرة أخرى بعد فترة
              retryCount++;

              if (retryCount >= maxRetries) {
                throw new Error(
                  "هناك عملية تسجيل أخرى جارية لهذا الفحص. الرجاء الانتظار لحظات ثم المحاولة مرة أخرى"
                );
              }

              continue; // استمر في الحلقة للمحاولة مرة أخرى
            } else {
              throw new Error(
                data.error || data.details || "حدث خطأ أثناء تسجيل العينة"
              );
            }
          }

          // نجحت العملية
          console.log("تم تسجيل العينة بنجاح:", data);
          setSuccess(true);
          success = true;

          setTimeout(() => {
            fetchPendingTests();
            onSampleRegistered();

            setTimeout(() => {
              onClose();
              setSelectedTest("");
              setNotes("");
              setStep(1);
              setSuccess(false);
            }, 1000);
          }, 1000);

          break; // الخروج من الحلقة لأن العملية نجحت
        } catch (innerError: any) {
          // إذا كان الخطأ متعلق بتكرار رمز العينة، نحاول مرة أخرى
          if (
            innerError.message &&
            innerError.message.includes("Unique constraint failed")
          ) {
            console.error("خطأ تكرار في رمز العينة، محاولة مرة أخرى...");
            retryCount++;

            if (retryCount >= maxRetries) {
              throw new Error(
                "فشلت عدة محاولات لتسجيل العينة بسبب تكرار رمز العينة. الرجاء المحاولة لاحقًا"
              );
            }

            continue;
          }

          // بالنسبة للأخطاء الأخرى، نرفعها للمعالجة الخارجية
          throw innerError;
        }
      }
    } catch (err: any) {
      console.error("خطأ تسجيل العينة:", err);

      // عرض رسالة خطأ مُحسّنة
      let errorMessage = err.message || "حدث خطأ أثناء عملية تسجيل العينة";

      // تحسين رسائل الخطأ
      if (
        errorMessage.includes("P2002") ||
        errorMessage.includes("Unique constraint failed")
      ) {
        errorMessage = "تعذر إنشاء رمز فريد للعينة. الرجاء المحاولة مرة أخرى.";
      } else if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        errorMessage =
          "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
      }

      setError(errorMessage);
      setSelectedTest("");

      setTimeout(() => {
        fetchPendingTests();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form state
      setSelectedTest("");
      setNotes("");
      setStep(1);
      setSuccess(false);
      setError(null);
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
        dir="rtl"
      >
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-right align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-gray-900"
                  >
                    تسجيل عينة جديدة
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <LoadingSpinner />
                    <span className="mr-2 text-gray-500">
                      جاري تحميل البيانات...
                    </span>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                    <div className="mt-3 flex justify-between">
                      <button
                        onClick={() => {
                          setError(null);
                          fetchPendingTests();
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 border border-indigo-200 rounded-md"
                      >
                        تحديث القائمة
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setStep(1);
                        }}
                        className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1"
                      >
                        إغلاق الخطأ
                      </button>
                    </div>
                  </div>
                ) : success ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                    تم تسجيل العينة بنجاح!
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {step === 1 && (
                      <div>
                        <div className="mb-4">
                          <label
                            htmlFor="testAssignment"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            اختر الفحص
                          </label>
                          <select
                            id="testAssignment"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={selectedTest}
                            onChange={(e) => setSelectedTest(e.target.value)}
                            required
                          >
                            <option value="">-- اختر الفحص --</option>
                            {pendingTests.map((test) => (
                              <option key={test.id} value={test.id}>
                                {test.test?.name} - {test.patient?.name} (
                                {test.patient?.fileNumber})
                              </option>
                            ))}
                          </select>
                          {pendingTests.length === 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              لا توجد فحوصات معلقة تحتاج لتسجيل عينات
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => setStep(2)}
                            disabled={!selectedTest}
                          >
                            التالي
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <div className="mb-4">
                          <label
                            htmlFor="notes"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            ملاحظات (اختياري)
                          </label>
                          <textarea
                            id="notes"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-between">
                          <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => setStep(1)}
                            disabled={isSubmitting}
                          >
                            السابق
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                            disabled={isSubmitting}
                          >
                            {isSubmitting && (
                              <LoadingSpinner className="w-4 h-4 mr-2" />
                            )}
                            تسجيل العينة
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
