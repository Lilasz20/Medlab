"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";

interface Test {
  id: string;
  status: string;
  assignedAt: string;
  test: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  samples: any[];
}

export default function TestsList({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientTests = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}/tests`);

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات الفحوصات");
        }

        const data = await response.json();
        setTests(data.tests || []);
      } catch (error) {
        console.error("Error fetching tests:", error);
        setError("فشل في تحميل بيانات الفحوصات");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientTests();
  }, [patientId]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "SAMPLE_COLLECTED":
        return "bg-blue-100 text-blue-800";
      case "PROCESSING":
        return "bg-purple-100 text-purple-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "قيد الانتظار";
      case "SAMPLE_COLLECTED":
        return "تم جمع العينة";
      case "PROCESSING":
        return "قيد المعالجة";
      case "COMPLETED":
        return "مكتمل";
      case "CANCELLED":
        return "ملغي";
      default:
        return status;
    }
  };

  const handleAddNewTest = () => {
    router.push(`/tests/assign?patientId=${patientId}`);
  };

  const handleViewTest = (testId: string) => {
    router.push(`/tests/${testId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>الفحوصات المطلوبة</CardTitle>
        {(user?.role === "ADMIN" || user?.role === "RECEPTIONIST") && (
          <Button onClick={handleAddNewTest}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة فحص جديد
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">لا توجد فحوصات مطلوبة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="flex flex-col md:flex-row justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => handleViewTest(test.id)}
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">{test.test.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {test.test.category}
                  </p>
                  <div className="flex items-center text-xs">
                    <Calendar className="ml-1 h-3 w-3" />
                    <span>
                      {format(new Date(test.assignedAt), "PPP", {
                        locale: ar,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center md:flex-col md:items-end mt-2 md:mt-0">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                      test.status
                    )}`}
                  >
                    {getStatusText(test.status)}
                  </span>
                  <p className="text-sm text-muted-foreground mr-2 md:mr-0 md:mt-1">
                    {test.samples.length > 0
                      ? `${test.samples.length} عينة`
                      : "لا توجد عينات"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
