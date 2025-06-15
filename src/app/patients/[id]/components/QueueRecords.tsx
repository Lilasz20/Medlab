"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";

interface QueueRecord {
  id: string;
  number: number;
  date: string;
  status: "WAITING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
}

export default function QueueRecords({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueueRecords = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}/queue`);

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات قائمة الانتظار");
        }

        const data = await response.json();
        setQueueRecords(data.queueRecords || []);
      } catch (error) {
        console.error("Error fetching queue records:", error);
        setError("فشل في تحميل بيانات قائمة الانتظار");
      } finally {
        setLoading(false);
      }
    };

    fetchQueueRecords();
  }, [patientId]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-yellow-100 text-yellow-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
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
      case "WAITING":
        return "في الانتظار";
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

  const handleAddToQueue = () => {
    router.push(`/queue/new?patientId=${patientId}`);
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
        <CardTitle>سجل قائمة الانتظار</CardTitle>
        {(user?.role === "ADMIN" || user?.role === "RECEPTIONIST") && (
          <Button onClick={handleAddToQueue}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة للقائمة
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {queueRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              لا يوجد سجل في قائمة الانتظار
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-col md:flex-row justify-between p-4 border rounded-md hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">رقم {record.number}</h3>
                  <div className="flex items-center text-xs">
                    <Calendar className="ml-1 h-3 w-3" />
                    <span>
                      {format(new Date(record.date), "PPP", {
                        locale: ar,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center mt-2 md:mt-0">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                      record.status
                    )}`}
                  >
                    {getStatusText(record.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
