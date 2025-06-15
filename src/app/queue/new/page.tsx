"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";

interface Patient {
  id: string;
  fileNumber: string;
  name: string;
  gender: string;
}

// مكون منفصل للتعامل مع query parameters
function PatientIdHandler({
  onPatientIdFound,
}: {
  onPatientIdFound: (id: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (patientId) {
      onPatientIdFound(patientId);
    }
  }, [searchParams, onPatientIdFound]);

  return null;
}

export default function AddToQueuePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, token } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [nextQueueNumber, setNextQueueNumber] = useState<number>(0);

  useEffect(() => {
    if (authLoading || !patientId) return;

    // تحقق من تسجيل الدخول والصلاحيات
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // تحقق من الصلاحيات
    if (user.role !== "ADMIN" && user.role !== "RECEPTIONIST") {
      toast.error("ليس لديك صلاحية لإضافة مرضى لقائمة الانتظار");
      router.push("/dashboard");
      return;
    }

    const fetchPatientAndQueueData = async () => {
      if (!patientId) {
        toast.error("لم يتم تحديد المريض");
        router.push("/patients");
        return;
      }

      try {
        // جلب بيانات المريض
        const patientResponse = await fetch(`/api/patients/${patientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!patientResponse.ok) {
          throw new Error("فشل في جلب بيانات المريض");
        }

        const patientData = await patientResponse.json();
        setPatient(patientData.patient);

        // جلب رقم الطابور التالي
        const queueResponse = await fetch("/api/queue/next-number", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!queueResponse.ok) {
          throw new Error("فشل في جلب رقم الطابور التالي");
        }

        const queueData = await queueResponse.json();
        setNextQueueNumber(queueData.nextNumber || 1);
      } catch (error) {
        console.error("Error:", error);
        toast.error("حدث خطأ أثناء تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientAndQueueData();
  }, [patientId, router, user, authLoading, token]);

  const handleAddToQueue = async () => {
    if (!patient) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: patient.id,
          number: nextQueueNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في إضافة المريض للطابور");
      }

      toast.success(
        `تمت إضافة المريض إلى قائمة الانتظار برقم ${nextQueueNumber}`
      );

      // العودة إلى صفحة تفاصيل المريض
      router.push(`/patients/${patientId}`);
    } catch (error: any) {
      console.error("Error adding to queue:", error);
      toast.error(error.message || "حدث خطأ أثناء إضافة المريض للطابور");
    } finally {
      setIsSubmitting(false);
    }
  };

  // عرض حالة التحميل
  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-lg">جاري تحميل البيانات...</p>
      </div>
    );
  }

  // التحقق من وجود بيانات المريض
  if (!patient) {
    return (
      <div className="container p-4 mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-lg text-red-600">
            لم يتم العثور على بيانات المريض
          </p>
          <Button onClick={() => router.push("/patients")}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة لقائمة المرضى
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto">
      <Suspense fallback={null}>
        <PatientIdHandler onPatientIdFound={setPatientId} />
      </Suspense>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">إضافة مريض لقائمة الانتظار</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>بيانات المريض</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <div>
                <p className="text-sm text-muted-foreground">رقم الملف</p>
                <p className="font-medium">{patient.fileNumber}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{patient.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div>
                <p className="text-sm text-muted-foreground">الجنس</p>
                <p className="font-medium">
                  {patient.gender === "MALE" ? "ذكر" : "أنثى"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة لقائمة الانتظار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الطابور</p>
                <p className="font-medium text-xl">{nextQueueNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">تاريخ اليوم</p>
                <p className="font-medium">
                  {new Date().toLocaleDateString("ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
              <Button onClick={handleAddToQueue} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري الإضافة...
                  </span>
                ) : (
                  "إضافة للطابور"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
