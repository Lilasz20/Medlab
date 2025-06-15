import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Patient, TestAssignmentWithRelations } from "@/types";

// دالة مساعدة لإعادة المحاولة مع تأخير تصاعدي
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      // تأخير تصاعدي قبل إعادة المحاولة (1s, 2s, 4s, ...)
      const delay = Math.pow(2, retries) * 1000;
      console.log(`محاولة الاتصال فشلت، إعادة المحاولة بعد ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // هذا السطر لن يتم الوصول إليه أبدًا، لكنه ضروري لإرضاء TypeScript
  throw new Error("فشل في الاتصال بعد عدة محاولات");
}

// هوك لإدارة البحث عن المرضى
export function usePatientSearch(token: string, initialPatientId?: string) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState<string>("");

  // جلب قائمة المرضى - تدعم البحث بالاسم أو رقم الملف
  const fetchPatients = async (searchTerm: string = "") => {
    // إذا لم يكن هناك مصطلح بحث وليس هناك مريض محدد مسبقاً، لا داعي للبحث
    if (!searchTerm && !initialPatientId) {
      return;
    }

    // تجنب تكرار نفس البحث
    if (searchTerm && searchTerm === lastSearchTerm) {
      return;
    }

    setLastSearchTerm(searchTerm);

    try {
      setIsLoadingPatients(true);
      // إضافة معلمة البحث إلى الطلب
      const url = searchTerm
        ? `/api/patients?search=${encodeURIComponent(searchTerm)}`
        : initialPatientId
        ? `/api/patients?id=${initialPatientId}`
        : "/api/patients";

      console.log("Fetching patients from:", url);

      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في جلب قائمة المرضى");
      }

      const data = await response.json();
      // التعامل مع الهيكل الصحيح للبيانات (كائن يحتوي على خاصية patients)
      if (data && typeof data === "object" && Array.isArray(data.patients)) {
        setPatients(data.patients);
      } else {
        console.error(
          "Expected patients data to be an object with patients array, got:",
          typeof data
        );
        setPatients([]);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("حدث خطأ أثناء جلب قائمة المرضى");
      setPatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  // جلب المريض المحدد عند تهيئة المكون
  useEffect(() => {
    if (token && initialPatientId) {
      fetchPatients();
    }
  }, [token, initialPatientId]);

  // البحث في المرضى
  const filteredPatients = Array.isArray(patients)
    ? patients.filter(
        (patient) =>
          patient &&
          typeof patient === "object" &&
          ((patient.name &&
            patient.name
              .toLowerCase()
              .includes(searchPatientTerm.toLowerCase())) ||
            (patient.fileNumber &&
              patient.fileNumber
                .toLowerCase()
                .includes(searchPatientTerm.toLowerCase())))
      )
    : [];

  return {
    patients,
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
  };
}

// هوك لإدارة فحوصات المريض
export function usePatientTestAssignments(token: string) {
  const [testAssignments, setTestAssignments] = useState<
    TestAssignmentWithRelations[]
  >([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);

  // جلب قائمة الفحوصات المعينة للمريض
  const fetchPatientTestAssignments = async (patientId: string) => {
    if (!patientId) return;

    try {
      setIsLoadingTests(true);
      // جلب جميع الفحوصات للمريض
      const url = `/api/tests/assignments?patientId=${patientId}`;
      console.log("Fetching all test assignments from:", url);

      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "خطأ غير معروف" }));
        console.error("Response error details:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          errorData.error || `فشل في جلب فحوصات المريض (${response.status})`
        );
      }

      const data = await response.json();
      console.log("Test assignments data received:", data);

      // التحقق من أن البيانات المستلمة هي مصفوفة
      if (!Array.isArray(data)) {
        console.error("Expected array of test assignments, got:", typeof data);
        setTestAssignments([]);
        setIsLoadingTests(false);
        return;
      }

      // إذا لم تكن هناك فحوصات، نعيد مصفوفة فارغة
      if (data.length === 0) {
        console.log("No test assignments found for patient:", patientId);
        setTestAssignments([]);
        setIsLoadingTests(false);
        return;
      }

      // تحويل البيانات إلى الشكل المطلوب
      const formattedAssignments = data.map((assignment: any) => {
        // طباعة كل تعيين للتصحيح
        console.log("Assignment:", JSON.stringify(assignment, null, 2));

        // التحقق من وجود معرف للتعيين
        if (!assignment.id) {
          console.error("Assignment missing ID:", assignment);
        }

        // التحقق من وجود معلومات الفحص
        if (!assignment.test) {
          console.warn("Assignment missing test info:", assignment);
        }

        return assignment;
      });

      // بعد جلب الفحوصات، نحتاج إلى التحقق من أيها يحتوي بالفعل على نتائج أشعة
      try {
        const radiationResultsResponse = await fetchWithRetry(
          `/api/radiation-results?patientId=${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!radiationResultsResponse.ok) {
          console.error(
            "Failed to fetch radiation results:",
            radiationResultsResponse.status
          );
          // حتى لو فشل جلب نتائج الأشعة، نستمر بعرض جميع الفحوصات
          setTestAssignments(formattedAssignments);
          setIsLoadingTests(false);
          return;
        }

        const radiationResults = await radiationResultsResponse.json();
        console.log("Radiation results received:", radiationResults);

        // استخراج معرفات الفحوصات التي تم بالفعل إضافة نتائج أشعة لها
        const assignmentsWithResults = new Set(
          Array.isArray(radiationResults)
            ? radiationResults.map((result: any) => result.testAssignmentId)
            : []
        );

        console.log("Assignments with existing results:", [
          ...assignmentsWithResults,
        ]);

        // إضافة معلومات عن وجود نتائج أشعة لكل فحص
        const enhancedAssignments = formattedAssignments.map((assignment) => ({
          ...assignment,
          hasRadiationResult: assignmentsWithResults.has(assignment.id),
        }));

        console.log(
          "Enhanced assignments with result info:",
          enhancedAssignments
        );
        setTestAssignments(enhancedAssignments);
      } catch (error) {
        console.error("Error checking radiation results:", error);
        // في حالة الخطأ، نستمر بعرض جميع الفحوصات
        setTestAssignments(formattedAssignments);
      } finally {
        setIsLoadingTests(false);
      }
    } catch (error) {
      console.error("Error fetching patient test assignments:", error);
      toast.error("حدث خطأ أثناء جلب فحوصات المريض");
      setTestAssignments([]);
      setIsLoadingTests(false);
    }
  };

  return { testAssignments, isLoadingTests, fetchPatientTestAssignments };
}

// هوك لإدارة رفع الملفات
export function useFileUpload(token: string, fileType: "image" | "pdf") {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    // التحقق من نوع الملف
    if (fileType === "image" && !selectedFile.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة صالح");
      return;
    }

    if (fileType === "pdf" && selectedFile.type !== "application/pdf") {
      toast.error("الرجاء اختيار ملف PDF صالح");
      return;
    }

    setFile(selectedFile);

    // رفع الملف إلى الخادم
    const formDataUpload = new FormData();
    formDataUpload.append("file", selectedFile);

    try {
      setIsUploading(true);

      const response = await fetchWithRetry(`/api/upload?type=${fileType}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error(
          `فشل في رفع ${fileType === "image" ? "الصورة" : "ملف PDF"}`
        );
      }

      const data = await response.json();

      // تحديث رابط الملف
      setFileUrl(data.url);

      toast.success(
        `تم رفع ${fileType === "image" ? "الصورة" : "ملف PDF"} بنجاح`
      );
      return data.url;
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `حدث خطأ أثناء رفع ${fileType === "image" ? "الصورة" : "ملف PDF"}`
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setFileUrl("");
  };

  return {
    isUploading,
    file,
    fileUrl,
    setFileUrl,
    handleFileUpload,
    resetFile,
  };
}

// دوال مساعدة
export function mapStatusToArabic(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: "قيد الانتظار",
    SAMPLE_COLLECTED: "تم جمع العينة",
    PROCESSING: "قيد المعالجة",
    COMPLETED: "مكتمل",
    CANCELED: "ملغي",
  };
  return statusMap[status] || status;
}

export function getTestName(assignment: any): string {
  try {
    if (!assignment) {
      console.warn("getTestName called with null/undefined assignment");
      return "فحص غير معروف";
    }

    console.log(
      "getTestName - assignment:",
      JSON.stringify(assignment, null, 2)
    );

    // إذا كان الفحص عبارة عن كائن مع خاصية test
    if (assignment.test) {
      console.log(
        "getTestName - assignment has test property:",
        typeof assignment.test
      );

      // إذا كان test كائن به خاصية name
      if (typeof assignment.test === "object" && assignment.test !== null) {
        if (assignment.test.name) {
          console.log(
            "getTestName - test is object with name:",
            assignment.test.name
          );
          return assignment.test.name;
        } else {
          console.log("getTestName - test is object without name");
          return `فحص معرف: ${assignment.test.id || "غير معروف"}`;
        }
      }

      // إذا كان test رقم أو نص
      if (
        typeof assignment.test === "string" ||
        typeof assignment.test === "number"
      ) {
        console.log("getTestName - test is string/number:", assignment.test);
        return `فحص رقم: ${assignment.test}`;
      }
    }

    // إذا كان للتعيين خاصية testId
    if (assignment.testId) {
      console.log("getTestName - assignment has testId:", assignment.testId);
      return `فحص معرف: ${assignment.testId}`;
    }

    // إذا كان للتعيين خاصية name مباشرة (في حالة كان كائن الفحص نفسه)
    if (assignment.name) {
      console.log(
        "getTestName - assignment has name property:",
        assignment.name
      );
      return assignment.name;
    }

    // في حالة وجود خاصية id فقط
    if (assignment.id) {
      console.log("getTestName - assignment has only id:", assignment.id);
      return `فحص تعيين رقم: ${assignment.id}`;
    }

    // في حال عدم وجود معلومات كافية
    console.warn("getTestName - insufficient information:", assignment);
    return "فحص غير معروف";
  } catch (error) {
    console.error("Error in getTestName:", error);
    return "فحص غير معروف";
  }
}
