import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/prisma";
import { ReportType } from "@/types";
import { RouteParams } from "@/types/route-handlers";

export async function GET(
  request: NextRequest,
  { params }: RouteParams<{ id: string }>
) {
  try {
    // التحقق من المصادقة
    const { userId, role } = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { message: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { message: "معرف التقرير مطلوب" },
        { status: 400 }
      );
    }

    // استرجاع التقرير من قاعدة البيانات
    const dbReport = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!dbReport) {
      return NextResponse.json(
        { message: "لم يتم العثور على التقرير" },
        { status: 404 }
      );
    }

    // التحقق من صلاحيات المستخدم للوصول إلى نوع التقرير
    if (
      dbReport.type === "FINANCIAL" &&
      role !== "ADMIN" &&
      role !== "ACCOUNTANT"
    ) {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لعرض التقارير المالية" },
        { status: 403 }
      );
    }

    // إعداد بيانات التقرير الأساسية
    let report = {
      id: dbReport.id,
      title: dbReport.title,
      type: dbReport.type,
      description: dbReport.description || "",
      createdAt: dbReport.createdAt.toISOString(),
      startDate: dbReport.startDate.toISOString(),
      endDate: dbReport.endDate.toISOString(),
      pdfUrl: dbReport.pdfUrl || undefined,
      createdBy: dbReport.createdBy.name,
    };

    // إضافة البيانات التفصيلية حسب نوع التقرير
    let additionalData = {};

    // استخراج فترة التقرير للاستعلامات اللاحقة
    const startDate = new Date(dbReport.startDate);
    const endDate = new Date(dbReport.endDate);
    // ضبط الساعات للتأكد من الدقة
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    switch (dbReport.type) {
      case "PATIENT":
        // استعلام بيانات المرضى للتقرير
        const patients = await prisma.patient.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            testAssignments: true,
          },
        });

        // الحصول على إجمالي المرضى في النظام
        const totalPatientsInSystem = await prisma.patient.count();

        // تحليل البيانات للتقرير
        const maleCount = patients.filter((p) => p.gender === "MALE").length;
        const femaleCount = patients.filter(
          (p) => p.gender === "FEMALE"
        ).length;
        const newPatientsCount = patients.length; // المرضى الجدد الذين تم تسجيلهم في الفترة

        // حساب متوسط العمر (إذا توفر تاريخ الميلاد)
        let totalAge = 0;
        let patientsWithAge = 0;
        let ageDistribution = [
          { range: "0-18", count: 0 },
          { range: "19-35", count: 0 },
          { range: "36-50", count: 0 },
          { range: "51+", count: 0 },
        ];

        patients.forEach((patient) => {
          if (patient.dateOfBirth) {
            const birthDate = new Date(patient.dateOfBirth);
            const ageInYears =
              new Date().getFullYear() - birthDate.getFullYear();
            totalAge += ageInYears;
            patientsWithAge++;

            // تصنيف العمر
            if (ageInYears <= 18) {
              ageDistribution[0].count++;
            } else if (ageInYears <= 35) {
              ageDistribution[1].count++;
            } else if (ageInYears <= 50) {
              ageDistribution[2].count++;
            } else {
              ageDistribution[3].count++;
            }
          }
        });

        const averageAge =
          patientsWithAge > 0 ? Math.round(totalAge / patientsWithAge) : 0;
        const patientTestAssignments = patients.reduce(
          (sum, p) => sum + p.testAssignments.length,
          0
        );

        // الحصول على المرضى العائدين بشكل دقيق
        // المرضى العائدين: زيارات لمرضى مسجلين قبل هذه الفترة
        const returningPatients = await prisma.patient.count({
          where: {
            createdAt: {
              lt: startDate,
            },
            testAssignments: {
              some: {
                assignedAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        });

        additionalData = {
          totalCount: totalPatientsInSystem, // إجمالي عدد المرضى في النظام
          maleCount,
          femaleCount,
          averageAge,
          newPatients: newPatientsCount, // عدد المرضى الجدد في الفترة المحددة
          returnPatients: returningPatients, // عدد المرضى العائدين في الفترة المحددة
          ageDistribution,
          testAssignments: patientTestAssignments,
        };
        break;

      case "TEST":
        // استعلام بيانات الفحوصات
        const tests = await prisma.testAssignment.findMany({
          where: {
            assignedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            test: true,
            samples: true,
          },
        });

        // حساب إحصائيات حالات الفحوصات
        const completedTests = tests.filter(
          (t) => t.status === "COMPLETED"
        ).length;
        const pendingTests = tests.filter((t) => t.status === "PENDING").length;
        const sampleCollectedTests = tests.filter(
          (t) => t.status === "SAMPLE_COLLECTED"
        ).length;
        const processingTests = tests.filter(
          (t) => t.status === "PROCESSING"
        ).length;
        const cancelledTests = tests.filter(
          (t) => t.status === "CANCELLED"
        ).length;

        // حساب فئات الفحوصات
        const categoriesMap = new Map();
        tests.forEach((assignment) => {
          const category = assignment.test.category;
          categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
        });

        const testCategories = Array.from(categoriesMap.entries()).map(
          ([name, count]) => ({
            name,
            count,
          })
        );

        additionalData = {
          totalTests: tests.length,
          completedTests,
          pendingTests,
          sampleCollectedTests,
          processingTests,
          cancelledTests,
          testCategories,
          testsWithSamples: tests.filter((t) => t.samples.length > 0).length,
        };
        break;

      case "FINANCIAL":
        // استعلام بيانات الفواتير
        const invoices = await prisma.invoice.findMany({
          where: {
            invoiceDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            items: {
              include: {
                testAssignment: {
                  include: {
                    test: true,
                  },
                },
              },
            },
          },
        });

        // حساب الإجماليات المالية
        let totalRevenue = 0;
        let paidAmount = 0;
        let pendingAmount = 0;

        invoices.forEach((invoice) => {
          totalRevenue += invoice.totalAmount;
          paidAmount += invoice.paidAmount;
          pendingAmount += invoice.totalAmount - invoice.paidAmount;
        });

        // حساب الإيرادات حسب الفحوصات
        const serviceRevenueMap = new Map();

        invoices.forEach((invoice) => {
          invoice.items.forEach((item) => {
            const testName = item.testAssignment.test.name;
            serviceRevenueMap.set(
              testName,
              (serviceRevenueMap.get(testName) || 0) + item.subtotal
            );
          });
        });

        const topServices = Array.from(serviceRevenueMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, revenue]) => ({ name, revenue }));

        additionalData = {
          totalRevenue,
          paidAmount,
          pendingAmount,
          invoiceCount: invoices.length,
          paidInvoices: invoices.filter((i) => i.isPaid).length,
          unpaidInvoices: invoices.filter((i) => !i.isPaid).length,
          topServices,
        };
        break;

      case "SAMPLE":
        // استعلام بيانات العينات
        const samples = await prisma.sample.findMany({
          where: {
            collectedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            testAssignment: {
              include: {
                test: true,
              },
            },
          },
        });

        // تحليل البيانات للعينات
        const samplesWithResults = samples.filter((s) => s.results).length;
        const samplesWithoutResults = samples.filter((s) => !s.results).length;

        // تصنيف العينات حسب النوع (باستخدام الملاحظات)
        const bloodSamples = samples.filter(
          (s) => s.notes?.includes("دم") || s.notes?.includes("blood")
        ).length;
        const urineSamples = samples.filter(
          (s) => s.notes?.includes("بول") || s.notes?.includes("urine")
        ).length;
        const stoolSamples = samples.filter(
          (s) => s.notes?.includes("براز") || s.notes?.includes("stool")
        ).length;
        const otherSamples =
          samples.length - bloodSamples - urineSamples - stoolSamples;

        additionalData = {
          totalSamples: samples.length,
          samplesWithResults,
          samplesWithoutResults,
          collectionTypeDistribution: {
            blood: bloodSamples,
            urine: urineSamples,
            stool: stoolSamples,
            other: otherSamples,
          },
        };
        break;

      case "SUMMARY":
        // استعلامات متعددة للحصول على بيانات الملخص
        const [patientsCount, testsCount, invoicesData, samplesCount] =
          await Promise.all([
            prisma.patient.count({
              where: { createdAt: { gte: startDate, lte: endDate } },
            }),
            prisma.testAssignment.count({
              where: { assignedAt: { gte: startDate, lte: endDate } },
            }),
            prisma.invoice.findMany({
              where: { invoiceDate: { gte: startDate, lte: endDate } },
              select: { totalAmount: true },
            }),
            prisma.sample.count({
              where: { collectedAt: { gte: startDate, lte: endDate } },
            }),
          ]);

        // حساب إجمالي الإيرادات ومتوسطها
        const totalRevenueSummary = invoicesData.reduce(
          (sum, invoice) => sum + invoice.totalAmount,
          0
        );

        const averageRevenue =
          invoicesData.length > 0
            ? totalRevenueSummary / invoicesData.length
            : 0;

        additionalData = {
          patientCount: patientsCount,
          testCount: testsCount,
          sampleCount: samplesCount,
          invoiceCount: invoicesData.length,
          revenueSummary: {
            total: totalRevenueSummary,
            average: averageRevenue,
          },
        };
        break;
    }

    // دمج البيانات الأساسية مع البيانات التفصيلية
    report = { ...report, ...additionalData };

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء جلب بيانات التقرير" },
      { status: 500 }
    );
  }
}
