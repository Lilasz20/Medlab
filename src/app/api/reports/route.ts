import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/prisma";
import { ReportType } from "@/types";

interface DbReport {
  id: string;
  title: string;
  type: ReportType;
  description: string | null;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  pdfUrl: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
}

interface ReportResponse {
  id: string;
  title: string;
  type: ReportType;
  description: string;
  createdAt: string;
  createdBy: string;
  pdfUrl?: string;
  startDate: string;
  endDate: string;
}

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const { userId, role } = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { message: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    // استعلام قاعدة البيانات للحصول على التقارير
    const dbReports = await prisma.report.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // تحويل البيانات إلى التنسيق المطلوب
    const reports: ReportResponse[] = dbReports.map((r: DbReport) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      description: r.description || "",
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdById,
      pdfUrl: r.pdfUrl || undefined,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
    }));

    // تصفية التقارير حسب دور المستخدم
    let filteredReports = [...reports];
    if (role !== "ADMIN") {
      // تصفية التقارير استناداً إلى الدور
      if (role === "ACCOUNTANT") {
        // المحاسبين يرون التقارير المالية فقط
        filteredReports = reports.filter(
          (report: ReportResponse) => report.type === "FINANCIAL"
        );
      } else if (role === "LAB_TECHNICIAN") {
        // فنيو المختبر يرون تقارير العينات والفحوصات فقط
        filteredReports = reports.filter(
          (report: ReportResponse) =>
            report.type === "SAMPLE" || report.type === "TEST"
        );
      }
      // يمكن إضافة المزيد من الأدوار والتصفية حسب الحاجة
    }

    return NextResponse.json({ reports: filteredReports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء جلب التقارير" },
      { status: 500 }
    );
  }
}
