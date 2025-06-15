"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Clipboard,
  FileText,
  User,
  Phone,
  CalendarDays,
  History,
  Activity,
  ArrowLeft,
  Edit,
  Trash,
  Loader,
  Printer,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/components/auth/AuthContext";
import TestsList from "./components/TestsList";
import InvoicesList from "./components/InvoicesList";
import QueueRecords from "./components/QueueRecords";
import PatientHistory from "./components/PatientHistory";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

interface Patient {
  id: string;
  fileNumber: string;
  name: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
  address?: string;
  lastVisit: string;
}

export default function PatientDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (authLoading) return;

    const fetchPatient = async () => {
      try {
        console.log("Fetching patient data for ID:", id);
        const response = await fetch(`/api/patients/${id}`);

        if (!response.ok) {
          if (response.status === 401) {
            console.error("Unauthorized access, handled by AuthContext");
            return;
          }
          throw new Error("فشل في جلب بيانات المريض");
        }

        const data = await response.json();
        console.log("Patient data fetched successfully:", data);
        setPatient(data.patient);
      } catch (error) {
        console.error("Error fetching patient:", error);
        toast.error("فشل في تحميل بيانات المريض");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatient();
    }
  }, [id, authLoading, user]);

  const handleDeletePatient = async () => {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "فشل في حذف المريض");
      }

      toast.success("تم حذف المريض بنجاح");

      router.push("/patients");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error((error as Error).message || "فشل في حذف المريض");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handlePrintPatientData = () => {
    // تأكد من وجود بيانات المريض
    if (!patient) {
      toast.error("بيانات المريض غير متوفرة للطباعة");
      return;
    }

    // إنشاء محتوى الطباعة
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل في فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة");
      return;
    }

    // تهيئة مستند HTML للطباعة بتنسيق جميل
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>بيانات المريض - ${patient.name}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, Tahoma, sans-serif;
              padding: 20px;
              direction: rtl;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header .logo {
              font-weight: bold;
              font-size: 20px;
            }
            .header .date {
              font-size: 14px;
            }
            .section {
              margin-bottom: 20px;
            }
            h2 {
              margin-top: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th, td {
              padding: 8px;
              text-align: right;
            }
            th {
              background-color: #f2f2f2;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .info-item {
              padding: 5px;
            }
            .info-label {
              font-weight: bold;
              margin-left: 5px;
            }
            .no-data {
              text-align: center;
              color: #666;
              font-style: italic;
              padding: 20px;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              button.no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">المعمل الطبي</div>
            <h1>بيانات المريض</h1>
            <div class="date">${format(new Date(), "dd/MM/yyyy", {
              locale: ar,
            })}</div>
          </div>

          <!-- معلومات المريض -->
          <div class="section">
            <h2>المعلومات الشخصية</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">رقم الملف:</span>
                <span>${patient.fileNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">الاسم:</span>
                <span>${patient.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">الجنس:</span>
                <span>${patient.gender === "MALE" ? "ذكر" : "أنثى"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">رقم الهاتف:</span>
                <span>${patient.phone || "غير محدد"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">تاريخ الميلاد:</span>
                <span>${
                  patient.dateOfBirth
                    ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy", {
                        locale: ar,
                      })
                    : "غير محدد"
                }</span>
              </div>
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">العنوان:</span>
                <span style="white-space: pre-wrap;">${
                  patient.address || "غير محدد"
                }</span>
              </div>
              <div class="info-item">
                <span class="info-label">آخر زيارة:</span>
                <span>${
                  patient.lastVisit
                    ? format(new Date(patient.lastVisit), "dd/MM/yyyy", {
                        locale: ar,
                      })
                    : "لا يوجد"
                }</span>
              </div>
            </div>
          </div>

          <div class="buttons" style="margin: 20px 0; text-align: center;">
            <button class="no-print" onclick="window.print();" style="padding: 8px 16px; background-color: #4F46E5; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">طباعة</button>
            <button class="no-print" onclick="window.close();" style="padding: 8px 16px; background-color: #E5E7EB; color: #1F2937; border: none; border-radius: 4px; cursor: pointer;">إغلاق</button>
          </div>
        </body>
      </html>
    `);

    // إضافة fetchData وظيفة لجلب البيانات وإضافتها للصفحة
    printWindow.document.write(`
      <script>
        async function fetchData() {
          try {
            // جلب بيانات الفحوصات
            const testsResponse = await fetch('/api/patients/${id}/tests');
            const testsData = await testsResponse.json();
            const tests = testsData.tests || [];

            // جلب بيانات الفواتير
            const invoicesResponse = await fetch('/api/patients/${id}/invoices');
            const invoicesData = await invoicesResponse.json();
            const invoices = invoicesData.invoices || [];

            // إضافة قسم الفحوصات
            const testsSection = document.createElement('div');
            testsSection.className = 'section';
            testsSection.innerHTML = '<h2>الفحوصات المطلوبة</h2>';
            
            if (tests.length === 0) {
              testsSection.innerHTML += '<div class="no-data">لا توجد فحوصات مطلوبة</div>';
            } else {
              let testsTable = '<table><thead><tr><th>اسم الفحص</th><th>الفئة</th><th>الحالة</th><th>تاريخ الطلب</th></tr></thead><tbody>';
              
              tests.forEach(test => {
                const status = getStatusText(test.status);
                const date = new Date(test.assignedAt).toLocaleDateString('ar-SA');
                testsTable += \`<tr>
                  <td>\${test.test.name}</td>
                  <td>\${test.test.category}</td>
                  <td>\${status}</td>
                  <td>\${date}</td>
                </tr>\`;
              });
              
              testsTable += '</tbody></table>';
              testsSection.innerHTML += testsTable;
            }
            document.body.insertBefore(testsSection, document.querySelector('.buttons'));

            // إضافة قسم الفواتير
            const invoicesSection = document.createElement('div');
            invoicesSection.className = 'section';
            invoicesSection.innerHTML = '<h2>الفواتير</h2>';
            
            if (invoices.length === 0) {
              invoicesSection.innerHTML += '<div class="no-data">لا توجد فواتير</div>';
            } else {
              let invoicesTable = '<table><thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المبلغ الإجمالي</th><th>الحالة</th></tr></thead><tbody>';
              
              invoices.forEach(invoice => {
                const status = invoice.isPaid ? "مدفوع" : (invoice.paidAmount > 0 ? "مدفوع جزئياً" : "غير مدفوع");
                const date = new Date(invoice.invoiceDate).toLocaleDateString('ar-SA');
                invoicesTable += \`<tr>
                  <td>\${invoice.id.substring(0, 8)}</td>
                  <td>\${date}</td>
                  <td>\${invoice.totalAmount.toFixed(2)} ل.س</td>
                  <td>\${status}</td>
                </tr>\`;
              });
              
              invoicesTable += '</tbody></table>';
              invoicesSection.innerHTML += invoicesTable;
            }
            document.body.insertBefore(invoicesSection, document.querySelector('.buttons'));

          } catch (error) {
            console.error('Error fetching data for printing:', error);
          }
        }

        function getStatusText(status) {
          switch (status) {
            case "PENDING": return "قيد الانتظار";
            case "SAMPLE_COLLECTED": return "تم جمع العينة";
            case "PROCESSING": return "قيد المعالجة";
            case "COMPLETED": return "مكتمل";
            case "CANCELLED": return "ملغي";
            default: return status;
          }
        }

        // استدعاء الدالة عند تحميل الصفحة
        fetchData();
      </script>
    `);

    printWindow.document.close();
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-lg">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold">لم يتم العثور على المريض</h1>
        <Button onClick={() => router.push("/patients")}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/patients")}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">بيانات المريض</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintPatientData}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          {(user?.role === "ADMIN" || user?.role === "RECEPTIONIST") && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/patients/${id}/edit`)}
              >
                <Edit className="ml-2 h-4 w-4" />
                تعديل
              </Button>

              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="ml-2 h-4 w-4" />
                    حذف
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>هل أنت متأكد من حذف هذا المريض؟</DialogTitle>
                  </DialogHeader>
                  <p className="py-4">
                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بيانات المريض
                    بما في ذلك الفحوصات والفواتير.
                  </p>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button variant="destructive" onClick={handleDeletePatient}>
                      تأكيد الحذف
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>المعلومات الشخصية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center">
              <Clipboard className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الملف</p>
                <p className="font-medium">{patient.fileNumber}</p>
              </div>
            </div>
            <div className="flex items-center">
              <User className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{patient.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <User className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الجنس</p>
                <p className="font-medium">
                  {patient.gender === "MALE" ? "ذكر" : "أنثى"}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{patient.phone}</p>
              </div>
            </div>
            <div className="flex items-center">
              <CalendarDays className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                <p className="font-medium">
                  {patient.dateOfBirth
                    ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy", {
                        locale: ar,
                      })
                    : "غير محدد"}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="ml-2 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">آخر زيارة</p>
                <p className="font-medium">
                  {patient.lastVisit
                    ? format(new Date(patient.lastVisit), "dd/MM/yyyy", {
                        locale: ar,
                      })
                    : "لا يوجد"}
                </p>
              </div>
            </div>
            <div className="flex items-center lg:col-span-2">
              <MapPin className="ml-2 h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium whitespace-pre-wrap break-words">
                  {patient.address || "غير محدد"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-fit">
          <TabsTrigger value="tests" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>الفحوصات</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>الفواتير</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>قائمة الانتظار</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            <span>السجل الطبي</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          <TestsList patientId={id as string} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesList patientId={id as string} />
        </TabsContent>

        <TabsContent value="queue">
          <QueueRecords patientId={id as string} />
        </TabsContent>

        <TabsContent value="history">
          <PatientHistory patientId={id as string} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
