"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Plus, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";

interface InvoiceItem {
  id: string;
  testAssignment: {
    test: {
      name: string;
    };
  };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  items: InvoiceItem[];
}

export default function InvoicesList({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}/invoices`);

        if (!response.ok) {
          throw new Error("فشل في جلب بيانات الفواتير");
        }

        const data = await response.json();
        setInvoices(data.invoices || []);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setError("فشل في تحميل بيانات الفواتير");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [patientId]);

  const getStatusBadgeColor = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return "bg-green-100 text-green-800";
    } else if (invoice.paidAmount > 0) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const getStatusText = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return "مدفوع";
    } else if (invoice.paidAmount > 0) {
      return "مدفوع جزئياً";
    } else {
      return "غير مدفوع";
    }
  };

  const handleCreateInvoice = () => {
    router.push(`/invoices/new?patientId=${patientId}`);
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
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
        <CardTitle>الفواتير</CardTitle>
        {(user?.role === "ADMIN" || user?.role === "ACCOUNTANT") && (
          <Button onClick={handleCreateInvoice}>
            <Plus className="ml-2 h-4 w-4" />
            إنشاء فاتورة جديدة
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">لا توجد فواتير</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col md:flex-row justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => handleViewInvoice(invoice.id)}
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-lg flex items-center">
                    <span className="mx-1" style={{ direction: "ltr" }}>
                      {" "}
                      #{invoice.id.substring(0, 8)}
                    </span>
                    <span>فاتورة</span>
                  </h3>
                  <div className="flex items-center text-xs">
                    <Calendar className="ml-1 h-3 w-3" />
                    <span>
                      {format(new Date(invoice.invoiceDate), "PPP", {
                        locale: ar,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.items.length} عنصر
                  </p>
                </div>
                <div className="flex flex-col items-end mt-2 md:mt-0">
                  <div className="flex items-center mb-1">
                    <span className="font-medium">
                      {invoice.totalAmount.toFixed(2)} ل.س
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                      invoice
                    )}`}
                  >
                    {getStatusText(invoice)}
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
