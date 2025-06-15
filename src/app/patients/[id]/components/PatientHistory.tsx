"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface Test {
  id: string;
  status: string;
  assignedAt: string;
  test: {
    id: string;
    name: string;
    category: string;
  };
  samples: any[];
}

interface Invoice {
  id: string;
  invoiceDate: string;
  totalAmount: number;
  isPaid: boolean;
}

interface QueueRecord {
  id: string;
  number: number;
  date: string;
  status: string;
}

interface HistoryEntry {
  id: string;
  type: "test" | "invoice" | "queue";
  date: Date;
  title: string;
  subtitle?: string;
  status: string;
  details?: any;
}

export default function PatientHistory({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}/history`);

        if (!response.ok) {
          throw new Error("فشل في جلب سجل المريض");
        }

        const data = await response.json();

        if (!data.patientHistory) {
          throw new Error("لم يتم العثور على بيانات");
        }

        // تجميع وترتيب البيانات التاريخية
        const historyItems: HistoryEntry[] = [];

        // إضافة الفحوصات
        const tests = data.patientHistory.testAssignments || [];
        tests.forEach((test: Test) => {
          historyItems.push({
            id: test.id,
            type: "test",
            date: new Date(test.assignedAt),
            title: test.test.name,
            subtitle: test.test.category,
            status: test.status,
            details: test,
          });
        });

        // إضافة الفواتير
        const invoices = data.patientHistory.invoices || [];
        invoices.forEach((invoice: Invoice) => {
          historyItems.push({
            id: invoice.id,
            type: "invoice",
            date: new Date(invoice.invoiceDate),
            title: `#${invoice.id.substring(0, 8)} فاتورة`,
            subtitle: `${invoice.totalAmount.toFixed(2)} ل.س`,
            status: invoice.isPaid ? "PAID" : "UNPAID",
            details: invoice,
          });
        });

        // إضافة سجل قائمة الانتظار
        const queueRecords = data.patientHistory.queueNumbers || [];
        queueRecords.forEach((record: QueueRecord) => {
          historyItems.push({
            id: record.id,
            type: "queue",
            date: new Date(record.date),
            title: `رقم الانتظار ${record.number}`,
            status: record.status,
            details: record,
          });
        });

        // ترتيب العناصر حسب التاريخ من الأحدث للأقدم
        historyItems.sort((a, b) => b.date.getTime() - a.date.getTime());

        setHistory(historyItems);
      } catch (error) {
        console.error("Error fetching patient history:", error);
        setError("فشل في تحميل سجل المريض");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  const getStatusBadgeColor = (type: string, status: string) => {
    if (type === "test") {
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
    } else if (type === "invoice") {
      switch (status) {
        case "PAID":
          return "bg-green-100 text-green-800";
        case "PARTIAL":
          return "bg-yellow-100 text-yellow-800";
        case "UNPAID":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    } else if (type === "queue") {
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
    }
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (type: string, status: string) => {
    if (type === "test") {
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
    } else if (type === "invoice") {
      switch (status) {
        case "PAID":
          return "مدفوع";
        case "PARTIAL":
          return "مدفوع جزئياً";
        case "UNPAID":
          return "غير مدفوع";
        default:
          return status;
      }
    } else if (type === "queue") {
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
    }
    return status;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "test":
        return <Activity className="h-5 w-5 text-blue-500" />;
      case "invoice":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "queue":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleItemClick = (item: HistoryEntry) => {
    if (item.type === "test") {
      router.push(`/tests/${item.id}`);
    } else if (item.type === "invoice") {
      router.push(`/invoices/${item.id}`);
    }
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
      <CardHeader>
        <CardTitle>السجل الطبي</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">لا يوجد سجل طبي</p>
          </div>
        ) : (
          <div className="relative">
            {/* خط السجل الزمني */}
            <div className="absolute top-0 bottom-0 right-7 w-0.5 bg-muted"></div>

            <div className="space-y-6">
              {history.map((item) => (
                <div key={`${item.type}-${item.id}`} className="relative">
                  {/* دائرة النقطة في السجل الزمني */}
                  <div className="absolute right-5 -translate-x-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-background border-2 border-muted z-10">
                    <div
                      className={`rounded-full h-2 w-2 ${
                        item.type === "test"
                          ? "bg-blue-500"
                          : item.type === "invoice"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    ></div>
                  </div>

                  {/* محتوى السجل الزمني */}
                  <div
                    className={`mr-12 p-4 border rounded-md hover:bg-muted/50 ${
                      item.type === "test" || item.type === "invoice"
                        ? "cursor-pointer"
                        : ""
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          {getIcon(item.type)}
                          <h3 className="font-medium text-lg mr-2">
                            {item.title}
                          </h3>
                        </div>
                        {item.subtitle && (
                          <p className="text-sm text-muted-foreground">
                            {item.subtitle}
                          </p>
                        )}
                        <div className="flex items-center text-xs">
                          <Calendar className="ml-1 h-3 w-3" />
                          <span>
                            {format(item.date, "PPP", {
                              locale: ar,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                            item.type,
                            item.status
                          )}`}
                        >
                          {getStatusText(item.type, item.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
