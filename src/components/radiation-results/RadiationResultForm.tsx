"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader,
  X,
  Search,
  Check,
  ChevronDown,
  Upload,
  File,
  Image,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";
import {
  RadiationResult,
  RadiationResultFormData,
  Patient,
  TestAssignmentWithRelations,
} from "@/types";
import {
  usePatientSearch,
  usePatientTestAssignments,
  useFileUpload,
  mapStatusToArabic,
} from "./RadiationResultFormHooks";
import {
  PatientSelector,
  TestSelector,
  FormFields,
  FileUploader,
  ConfirmationDialog,
} from "./RadiationResultFormFields";

interface RadiationResultFormProps {
  isOpen: boolean;
  onClose: (success?: boolean) => void;
  initialData?: RadiationResult;
  patientId?: string;
  testAssignmentId?: string;
  mode: "create" | "edit";
}

export default function RadiationResultForm({
  isOpen,
  onClose,
  initialData,
  patientId,
  testAssignmentId,
  mode,
}: RadiationResultFormProps) {
  // استخدام سياق المصادقة للحصول على التوكن
  const { token } = useAuth();
  const router = useRouter();

  // مراجع DOM
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const previousPatientIdRef = useRef<string | null>(null);

  // حالة النموذج
  const [formData, setFormData] = useState<RadiationResultFormData>({
    title: "",
    description: "",
    resultDetails: "",
    reportText: "",
    patientId: "",
    testAssignmentId: "",
    imageUrl: "",
    pdfUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // استخدام الهوكات المخصصة
  const {
    filteredPatients,
    isLoadingPatients,
    selectedPatient,
    setSelectedPatient,
    searchPatientTerm,
    setSearchPatientTerm,
    showPatientDropdown,
    setShowPatientDropdown,
    isSearching,
    setIsSearching,
    fetchPatients,
  } = usePatientSearch(token || "", patientId || initialData?.patientId);

  const { testAssignments, isLoadingTests, fetchPatientTestAssignments } =
    usePatientTestAssignments(token || "");

  const {
    isUploading: isUploadingImage,
    file: imageFile,
    fileUrl: imageUrl,
    setFileUrl: setImageUrl,
    handleFileUpload: handleImageUpload,
    resetFile: resetImage,
  } = useFileUpload(token || "", "image");

  const {
    isUploading: isUploadingPdf,
    file: pdfFile,
    fileUrl: pdfUrl,
    setFileUrl: setPdfUrl,
    handleFileUpload: handlePdfUpload,
    resetFile: resetPdf,
  } = useFileUpload(token || "", "pdf");

  // إضافة state لتخزين بيانات نتيجة الأشعة بما فيها معلومات المريض والفحص
  const [fullResultData, setFullResultData] = useState<any>(null);

  // تهيئة النموذج بالبيانات الأولية إذا كانت متوفرة
  useEffect(() => {
    if (mode === "edit" && initialData) {
      console.log("Initializing form with edit data:", initialData);

      // التأكد من تعيين معرفات المريض والفحص بشكل صحيح
      const formInitialData = {
        title: initialData.title,
        description: initialData.description || "",
        resultDetails: initialData.resultDetails,
        reportText: initialData.reportText || "",
        patientId: initialData.patientId,
        testAssignmentId: initialData.testAssignmentId,
        imageUrl: initialData.imageUrl || "",
        pdfUrl: initialData.pdfUrl || "",
      };

      setFormData(formInitialData);

      // طباعة لمعرفة إذا كانت البيانات صحيحة
      console.log("Form initialized with data:", formInitialData);

      // تعيين روابط الملفات في هوكات رفع الملفات
      if (initialData.imageUrl) {
        setImageUrl(initialData.imageUrl);
      }

      if (initialData.pdfUrl) {
        setPdfUrl(initialData.pdfUrl);
      }
    } else if (mode === "create") {
      setFormData({
        title: "",
        description: "",
        resultDetails: "",
        reportText: "",
        patientId: patientId || "",
        testAssignmentId: testAssignmentId || "",
        imageUrl: "",
        pdfUrl: "",
      });
    }
  }, [initialData, mode, patientId, testAssignmentId, setImageUrl, setPdfUrl]);

  // تعديل useEffect التي تعالج فتح النموذج لتشمل جلب بيانات كاملة عن نتيجة الأشعة في وضع التعديل
  useEffect(() => {
    if (isOpen && token) {
      console.log("Form opened, mode:", mode);
      console.log("Initial patientId:", patientId);
      console.log("Initial testAssignmentId:", testAssignmentId);

      // في حالة التعديل
      if (mode === "edit" && initialData) {
        console.log(
          "Edit mode, fetching full radiation result data:",
          initialData.id
        );

        // جلب البيانات التفصيلية لنتيجة الأشعة
        const fetchFullRadiationResultData = async () => {
          try {
            const response = await fetch(
              `/api/radiation-results/${initialData.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error("فشل في جلب تفاصيل نتيجة الأشعة");
            }

            const data = await response.json();
            console.log("Full radiation result data:", data);
            setFullResultData(data);
          } catch (error) {
            console.error("Error fetching radiation result details:", error);
            toast.error("حدث خطأ أثناء جلب تفاصيل نتيجة الأشعة");
          }
        };

        fetchFullRadiationResultData();
      }

      // في حالة إضافة نتيجة لمريض محدد مسبقًا
      if (mode === "create" && patientId) {
        console.log(
          "Create mode with patient ID, fetching test assignments for:",
          patientId
        );
        fetchPatientTestAssignments(patientId || "");
      }
    }
  }, [isOpen, token, mode, patientId, initialData, testAssignmentId]);

  // تحديث قائمة الفحوصات عند اختيار مريض
  useEffect(() => {
    if (formData.patientId && formData.patientId !== patientId) {
      // تحقق مما إذا كان هناك تغيير فعلي في معرف المريض
      if (previousPatientIdRef.current !== formData.patientId) {
        previousPatientIdRef.current = formData.patientId;

        // طباعة معلومات تشخيصية
        console.log(
          "Patient ID changed, fetching test assignments for:",
          formData.patientId
        );

        // استخدام تأخير بسيط لتجنب طلبات API متعددة
        const timeoutId = setTimeout(() => {
          fetchPatientTestAssignments(formData.patientId);
        }, 300);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.patientId, patientId, fetchPatientTestAssignments]);

  // إعادة تعيين فحص محدد في مكون منفصل عند تغيير المريض
  useEffect(() => {
    if (
      formData.patientId &&
      formData.patientId !== patientId &&
      previousPatientIdRef.current === formData.patientId
    ) {
      setFormData((prev) => ({
        ...prev,
        testAssignmentId: "",
      }));
    }
  }, [formData.patientId, patientId]);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowPatientDropdown]);

  // معالجة تغيير حقول النموذج
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // اختيار المريض من القائمة المنسدلة
  const handleSelectPatient = (patient: any) => {
    console.log("Selected patient:", patient);
    setSelectedPatient(patient);
    if (patient && typeof patient === "object") {
      setFormData((prev) => ({
        ...prev,
        patientId: patient.id,
      }));

      // جلب فحوصات المريض فور اختياره
      console.log("Fetching test assignments for patient:", patient.id);
      fetchPatientTestAssignments(patient.id);
    }
    setSearchPatientTerm("");
    setShowPatientDropdown(false);
  };

  // معالجة البحث عن المرضى
  const handlePatientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchPatientTerm(searchValue);

    // إظهار القائمة المنسدلة عند الكتابة
    if (!showPatientDropdown) {
      setShowPatientDropdown(true);
    }

    // تأخير البحث لتجنب إجراء طلبات متعددة أثناء الكتابة
    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      if (searchValue.length >= 2) {
        // البحث فقط إذا كان هناك حرفين على الأقل
        fetchPatients(searchValue);
      } else if (searchValue.length === 0) {
        // إذا تم مسح حقل البحث، قم بإفراغ قائمة المرضى
        // setPatients([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // تحديث حالة الفلترة للبحث عن المرضى
  const handlePatientSearchFocus = () => {
    // إذا كانت القائمة مغلقة، افتحها
    if (!showPatientDropdown) {
      setShowPatientDropdown(true);
    }

    // إذا لم يكن هناك مريض محدد وليست هناك نتائج بحث، ابدأ البحث تلقائياً
    if (
      !selectedPatient &&
      filteredPatients.length === 0 &&
      searchPatientTerm.length >= 2
    ) {
      fetchPatients(searchPatientTerm);
    }
  };

  // معالجة تحميل الصورة
  const handleImageUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const url = await handleImageUpload(files[0]);
    if (url) {
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    }
  };

  // معالجة تحميل ملف PDF
  const handlePdfUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const url = await handlePdfUpload(files[0]);
    if (url) {
      setFormData((prev) => ({ ...prev, pdfUrl: url }));
    }
  };

  // Añadir esta función para verificar si la prueba ya tiene resultados
  const checkTestHasResults = (
    testId: string,
    testAssignments: TestAssignmentWithRelations[]
  ) => {
    const selectedTest = testAssignments.find((test) => test.id === testId);
    return selectedTest && (selectedTest as any).hasRadiationResult;
  };

  // Actualizar la función handleSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica - تعديل للتمييز بين حالة الإنشاء والتعديل
    if (mode === "create") {
      // في حالة الإنشاء نتحقق من جميع الحقول المطلوبة
      if (
        !formData.title ||
        !formData.resultDetails ||
        !formData.patientId ||
        !formData.testAssignmentId
      ) {
        toast.error("يرجى ملء جميع الحقول المطلوبة");
        return;
      }

      // التحقق مما إذا كان الفحص المحدد لديه نتائج بالفعل
      if (checkTestHasResults(formData.testAssignmentId, testAssignments)) {
        toast.error(
          "هذا الفحص لديه نتيجة أشعة مسجلة بالفعل. يرجى اختيار فحص آخر أو تعديل النتيجة الموجودة."
        );
        return;
      }
    } else {
      // في حالة التعديل نتحقق فقط من العنوان والتفاصيل
      if (!formData.title || !formData.resultDetails) {
        toast.error("يرجى ملء العنوان وتفاصيل النتيجة");
        return;
      }
    }

    // إذا كان الوضع هو التعديل، نعرض نافذة التأكيد أولاً
    if (mode === "edit" && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        mode === "create"
          ? "/api/radiation-results"
          : `/api/radiation-results/${initialData?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "حدث خطأ أثناء حفظ نتيجة الأشعة");
      }

      toast.success(
        mode === "create"
          ? "تم إضافة نتيجة الأشعة بنجاح"
          : "تم تحديث نتيجة الأشعة بنجاح"
      );

      // إعادة تحميل البيانات
      router.refresh();
      // إغلاق النموذج مع إشارة إلى نجاح العملية
      onClose(true);
    } catch (error) {
      console.error("Error saving radiation result:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ نتيجة الأشعة"
      );
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  // دالة للتعامل مع تأكيد التعديل
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // تخطي مرحلة تأكيد التعديل والانتقال مباشرة إلى الإرسال
    setIsSubmitting(true);

    try {
      // تأكد من أننا نمتلك معرف نتيجة الأشعة
      if (!initialData?.id) {
        throw new Error("لا يمكن تحديث النتيجة: معرف النتيجة غير متوفر");
      }

      // تحضير البيانات للإرسال - نرسل فقط الحقول التي يمكن تعديلها
      const updateData = {
        title: formData.title,
        description: formData.description,
        resultDetails: formData.resultDetails,
        reportText: formData.reportText,
        imageUrl: formData.imageUrl,
        pdfUrl: formData.pdfUrl,
        // لا نرسل معرفات المريض أو الفحص لأنها لا يمكن تغييرها في التعديل
      };

      console.log("Sending update data:", updateData);

      const url = `/api/radiation-results/${initialData.id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "حدث خطأ أثناء تحديث نتيجة الأشعة");
      }

      toast.success("تم تحديث نتيجة الأشعة بنجاح");

      // إعادة تحميل البيانات
      router.refresh();
      // إغلاق النموذج مع إشارة إلى نجاح العملية
      onClose(true);
    } catch (error) {
      console.error("Error updating radiation result:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث نتيجة الأشعة"
      );
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  // Añadir esta función para manejar el cambio de selección de prueba
  const handleTestSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const testId = e.target.value;

    // Verificar si la prueba seleccionada ya tiene resultados
    if (testId && checkTestHasResults(testId, testAssignments)) {
      toast.error(
        "تنبيه: هذا الفحص لديه نتيجة أشعة مسجلة بالفعل. يفضل اختيار فحص آخر أو تعديل النتيجة الموجودة.",
        {
          duration: 5000,
        }
      );
    }

    // Actualizar el estado del formulario
    handleChange(e);
  };

  // إلغاء عملية التأكيد
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  // مسح اختيار المريض
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setFormData((prev) => ({ ...prev, patientId: "" }));
  };

  // مسح ملف الصورة
  const handleClearImage = () => {
    resetImage();
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

  // مسح ملف PDF
  const handleClearPdf = () => {
    resetPdf();
    setFormData((prev) => ({ ...prev, pdfUrl: "" }));
  };

  // تعديل دالة getPatientInfo للاستفادة من البيانات المجلوبة
  const getPatientInfo = () => {
    if (selectedPatient) {
      return selectedPatient;
    }

    // في وضع التعديل، نستخدم البيانات المجلوبة من API
    if (mode === "edit" && fullResultData?.patient) {
      return fullResultData.patient;
    }

    // احتياطي إذا لم تكن البيانات متاحة
    if (mode === "edit" && initialData) {
      return {
        id: initialData.patientId,
        name: "جاري تحميل بيانات المريض...",
        fileNumber: "...",
      };
    }

    return null;
  };

  // تعديل دالة getTestInfo للاستفادة من البيانات المجلوبة
  const getTestInfo = () => {
    // في وضع التعديل، نستخدم البيانات المجلوبة من API
    if (mode === "edit" && fullResultData?.testAssignment) {
      const { testAssignment } = fullResultData;
      return {
        name: testAssignment.test?.name || "فحص غير معروف",
        status: testAssignment.status || "COMPLETED",
      };
    }

    // احتياطي إذا لم تكن البيانات متاحة
    if (mode === "edit" && initialData) {
      return {
        name: "جاري تحميل بيانات الفحص...",
        status: "COMPLETED",
      };
    }

    return null;
  };

  // عرض معلومات المريض بشكل أفضل - يمكن استخدامها في قسم معلومات المريض
  const renderPatientDetails = () => {
    const patient = getPatientInfo();

    if (!patient) {
      return (
        <div className="p-2 border border-gray-200 rounded-md bg-gray-50 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      );
    }

    return (
      <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
        <div className="flex flex-col items-end text-right">
          <div className="flex items-center justify-end">
            <span className="font-medium text-lg">{patient.name}</span>
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-1 text-sm text-gray-600">
            <span>رقم الملف: {patient.fileNumber}</span>
          </div>
        </div>
      </div>
    );
  };

  // عرض معلومات الفحص بشكل أفضل - يمكن استخدامها في قسم معلومات الفحص
  const renderTestDetails = () => {
    const testInfo = getTestInfo();

    if (!testInfo) {
      return (
        <div className="p-2 border border-gray-200 rounded-md bg-gray-50 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      );
    }

    return (
      <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
        <div className="flex flex-col items-end text-right">
          <div className="flex items-center justify-end">
            <span className="font-medium text-lg">{testInfo.name}</span>
          </div>

          <div className="flex justify-end gap-2 mt-1 text-sm text-gray-600">
            <span>الحالة: {mapStatusToArabic(testInfo.status)}</span>

            {fullResultData?.testAssignment?.test?.category && (
              <span>الفئة: {fullResultData.testAssignment.test.category}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            {mode === "create"
              ? "إضافة نتيجة أشعة جديدة"
              : "تعديل نتيجة الأشعة"}
          </h2>
          <button
            onClick={() => onClose()}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* اختيار المريض - يظهر فقط في حالة الإضافة وليس التعديل */}
          {mode === "create" && (
            <PatientSelector
              searchTerm={searchPatientTerm}
              onSearchChange={handlePatientSearch}
              onFocus={handlePatientSearchFocus}
              showDropdown={showPatientDropdown}
              setShowDropdown={setShowPatientDropdown}
              patients={filteredPatients}
              isLoading={isLoadingPatients}
              isSearching={isSearching}
              selectedPatient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onClearPatient={handleClearPatient}
              disabled={isSubmitting}
              dropdownRef={patientDropdownRef}
            />
          )}

          {/* اختيار الفحص - يظهر فقط في حالة الإضافة وليس التعديل */}
          {mode === "create" && (
            <TestSelector
              testAssignments={testAssignments}
              selectedTestId={formData.testAssignmentId}
              onSelectTest={handleTestSelection}
              isLoading={isLoadingTests}
              patientId={formData.patientId}
              disabled={isSubmitting}
            />
          )}

          {/* عرض معلومات المريض والفحص في حالة التعديل */}
          {mode === "edit" && (
            <>
              {/* معلومات المريض */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المريض
                </label>
                {renderPatientDetails()}
              </div>

              {/* معلومات الفحص */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفحص
                </label>
                {renderTestDetails()}
              </div>
            </>
          )}

          {/* حقول النموذج الأساسية */}
          <FormFields
            title={formData.title}
            description={formData.description}
            resultDetails={formData.resultDetails}
            reportText={formData.reportText}
            onChange={handleChange}
            disabled={isSubmitting}
          />

          {/* رفع الصورة */}
          <FileUploader
            type="image"
            fileUrl={formData.imageUrl}
            isUploading={isUploadingImage}
            file={imageFile}
            onUpload={handleImageUploadChange}
            onClear={handleClearImage}
            disabled={isSubmitting}
          />

          {/* رفع ملف PDF */}
          <FileUploader
            type="pdf"
            fileUrl={formData.pdfUrl}
            isUploading={isUploadingPdf}
            file={pdfFile}
            onUpload={handlePdfUploadChange}
            onClear={handleClearPdf}
            disabled={isSubmitting}
          />

          {/* أزرار الإجراءات */}
          <div className="flex justify-end space-x-reverse space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center min-w-[80px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader size={18} className="animate-spin" />
              ) : mode === "create" ? (
                "إضافة"
              ) : (
                "تحديث"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* نافذة تأكيد التعديل */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelConfirmation}
        title={formData.title}
        resultDetails={formData.resultDetails}
      />
    </div>
  );
}
