import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/prisma";
import { ReportType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const { userId, role } = await verifyAuth(request);

    if (!userId) {
      return NextResponse.json(
        { message: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    // استخراج بيانات طلب التقرير
    const requestData = await request.json();
    const { type, period, startDate, endDate } = requestData;

    // التحقق من البيانات المطلوبة
    if (!type) {
      return NextResponse.json(
        { message: "نوع التقرير مطلوب" },
        { status: 400 }
      );
    }

    if (!period) {
      return NextResponse.json(
        { message: "الفترة الزمنية مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من الفترة المخصصة
    if (period === "CUSTOM" && (!startDate || !endDate)) {
      return NextResponse.json(
        { message: "تاريخ البداية والنهاية مطلوبان للفترة المخصصة" },
        { status: 400 }
      );
    }

    // التحقق من الصلاحيات (مثال: المحاسبين فقط يمكنهم توليد تقارير مالية)
    if (type === "FINANCIAL" && role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لتوليد تقارير مالية" },
        { status: 403 }
      );
    }

    // تحديد تواريخ الفترة
    let startDateTime = new Date();
    let endDateTime = new Date();

    switch (period) {
      case "TODAY":
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "YESTERDAY":
        // ضبط بداية الأمس (اليوم السابق في الساعة 00:00:00)
        startDateTime.setDate(startDateTime.getDate() - 1);
        startDateTime.setHours(0, 0, 0, 0);
        // ضبط نهاية الأمس (اليوم السابق في الساعة 23:59:59)
        endDateTime.setDate(endDateTime.getDate() - 1);
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "THIS_WEEK":
        const day = startDateTime.getDay();
        const diff = startDateTime.getDate() - day + (day === 0 ? -6 : 1);
        startDateTime = new Date(startDateTime.setDate(diff));
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "LAST_WEEK":
        const lastWeekDay = startDateTime.getDay();
        startDateTime.setDate(startDateTime.getDate() - lastWeekDay - 6);
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setDate(
          endDateTime.getDate() - endDateTime.getDay() - 6 + 6
        );
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "THIS_MONTH":
        startDateTime.setDate(1);
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "LAST_MONTH":
        startDateTime.setDate(1);
        startDateTime.setMonth(startDateTime.getMonth() - 1);
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setDate(1);
        endDateTime.setDate(0);
        endDateTime.setHours(23, 59, 59, 999);
        break;
      case "CUSTOM":
        startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        break;
    }

    // استخدام Prisma لاستعلام البيانات وإنشاء التقرير بناءً على النوع
    let reportData;
    let title = "";

    switch (type) {
      case "PATIENT":
        title = "تقرير المرضى";

        // استعلام بيانات المرضى خلال الفترة المحددة
        const patients = await prisma.patient.findMany({
          where: {
            createdAt: {
              gte: startDateTime,
              lte: endDateTime,
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

        // حساب متوسط العمر (إذا توفر تاريخ الميلاد)
        let totalAge = 0;
        let patientsWithAge = 0;

        patients.forEach((patient) => {
          if (patient.dateOfBirth) {
            const birthDate = new Date(patient.dateOfBirth);
            const ageInYears =
              new Date().getFullYear() - birthDate.getFullYear();
            totalAge += ageInYears;
            patientsWithAge++;
          }
        });

        const averageAge =
          patientsWithAge > 0 ? Math.round(totalAge / patientsWithAge) : 0;

        // إحصاء المرضى العائدين (المرضى الذين تم تسجيلهم قبل الفترة ولكن لديهم زيارات في هذه الفترة)
        const returningPatients = await prisma.patient.count({
          where: {
            createdAt: {
              lt: startDateTime,
            },
            testAssignments: {
              some: {
                assignedAt: {
                  gte: startDateTime,
                  lte: endDateTime,
                },
              },
            },
          },
        });

        reportData = {
          totalCount: totalPatientsInSystem, // إجمالي عدد المرضى في النظام
          maleCount,
          femaleCount,
          averageAge,
          newPatients: patients.length, // المرضى المسجلين في هذه الفترة
          returnPatients: returningPatients,
          patientsWithTests: patients.filter(
            (p) => p.testAssignments.length > 0
          ).length,
        };
        break;

      case "TEST":
        title = "تقرير الفحوصات";

        // استعلام بيانات الفحوصات خلال الفترة المحددة
        const testAssignments = await prisma.testAssignment.findMany({
          where: {
            assignedAt: {
              gte: startDateTime,
              lte: endDateTime,
            },
          },
          include: {
            test: true,
            samples: true,
          },
        });

        // الحصول على إحصائيات الفحوصات حسب الحالة
        const pendingTests = testAssignments.filter(
          (t) => t.status === "PENDING"
        ).length;
        const sampleCollectedTests = testAssignments.filter(
          (t) => t.status === "SAMPLE_COLLECTED"
        ).length;
        const processingTests = testAssignments.filter(
          (t) => t.status === "PROCESSING"
        ).length;
        const completedTests = testAssignments.filter(
          (t) => t.status === "COMPLETED"
        ).length;
        const cancelledTests = testAssignments.filter(
          (t) => t.status === "CANCELLED"
        ).length;

        // إحصاء الفحوصات الأكثر شيوعًا
        const testCounts = new Map();
        testAssignments.forEach((assignment) => {
          const testName = assignment.test.name;
          testCounts.set(testName, (testCounts.get(testName) || 0) + 1);
        });

        // ترتيب الفحوصات حسب التكرار
        const sortedTests = [...testCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        reportData = {
          totalTests: testAssignments.length,
          pendingTests,
          sampleCollectedTests,
          processingTests,
          completedTests,
          cancelledTests,
          mostCommonTests: sortedTests,
          testsWithSamples: testAssignments.filter((t) => t.samples.length > 0)
            .length,
        };
        break;

      case "FINANCIAL":
        title = "التقرير المالي";

        // استعلام بيانات الفواتير خلال الفترة المحددة
        const invoices = await prisma.invoice.findMany({
          where: {
            invoiceDate: {
              gte: startDateTime,
              lte: endDateTime,
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

        // حساب الإجماليات والمدفوعات
        let totalRevenue = 0;
        let paidAmount = 0;
        let pendingAmount = 0;

        invoices.forEach((invoice) => {
          totalRevenue += invoice.totalAmount;
          paidAmount += invoice.paidAmount;
          pendingAmount += invoice.totalAmount - invoice.paidAmount;
        });

        // حساب إيرادات كل نوع من الفحوصات
        const serviceRevenue = new Map();

        invoices.forEach((invoice) => {
          invoice.items.forEach((item) => {
            const testName = item.testAssignment.test.name;
            serviceRevenue.set(
              testName,
              (serviceRevenue.get(testName) || 0) + item.subtotal
            );
          });
        });

        // ترتيب الخدمات حسب الإيرادات
        const topServices = [...serviceRevenue.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, revenue]) => ({ name, revenue }));

        reportData = {
          totalRevenue,
          paidAmount,
          pendingAmount,
          invoiceCount: invoices.length,
          paidInvoices: invoices.filter((i) => i.isPaid).length,
          unpaidInvoices: invoices.filter((i) => !i.isPaid).length,
          topServices,
          averageInvoiceValue:
            invoices.length > 0 ? totalRevenue / invoices.length : 0,
        };
        break;

      case "SAMPLE":
        title = "تقرير العينات";

        // استعلام بيانات العينات خلال الفترة المحددة
        const samples = await prisma.sample.findMany({
          where: {
            collectedAt: {
              gte: startDateTime,
              lte: endDateTime,
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

        // تحليل بيانات العينات
        const samplesWithResults = samples.filter((s) => s.results).length;
        const samplesWithoutResults = samples.filter((s) => !s.results).length;

        // بيانات إضافية قد تكون موجودة في أنواع العينات
        // في هذا المثال، نفترض أن نوع العينة يمكن استخلاصه من الملاحظات
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

        reportData = {
          totalSamples: samples.length,
          samplesWithResults,
          samplesWithoutResults,
          sampleDistribution: {
            blood: bloodSamples,
            urine: urineSamples,
            stool: stoolSamples,
            other: otherSamples,
          },
        };
        break;

      case "SUMMARY":
        title = "تقرير ملخص";

        // استعلامات متعددة للحصول على بيانات الملخص
        const [patientsCount, testsCount, invoicesData, samplesCount] =
          await Promise.all([
            prisma.patient.count({
              where: { createdAt: { gte: startDateTime, lte: endDateTime } },
            }),
            prisma.testAssignment.count({
              where: { assignedAt: { gte: startDateTime, lte: endDateTime } },
            }),
            prisma.invoice.findMany({
              where: { invoiceDate: { gte: startDateTime, lte: endDateTime } },
              select: { totalAmount: true },
            }),
            prisma.sample.count({
              where: { collectedAt: { gte: startDateTime, lte: endDateTime } },
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

        reportData = {
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

      default:
        return NextResponse.json(
          { message: "نوع التقرير غير صالح" },
          { status: 400 }
        );
    }

    // إنشاء التقرير في قاعدة البيانات
    let reportTitle = "";
    let periodText = "";

    // تحديد نص الفترة
    switch (period) {
      case "TODAY":
        periodText = "اليوم";
        break;
      case "YESTERDAY":
        periodText = "الأمس";
        break;
      case "THIS_WEEK":
        periodText = "هذا الأسبوع";
        break;
      case "LAST_WEEK":
        periodText = "الأسبوع الماضي";
        break;
      case "THIS_MONTH":
        periodText = "هذا الشهر";
        break;
      case "LAST_MONTH":
        periodText = "الشهر الماضي";
        break;
      case "CUSTOM":
        periodText = `الفترة من ${new Date(startDate).toLocaleDateString(
          "ar-EG"
        )} إلى ${new Date(endDate).toLocaleDateString("ar-EG")}`;
        break;
    }

    // تحديد عنوان التقرير
    if (type === "PATIENT") {
      reportTitle = `تقرير المرضى - ${periodText}`;
    } else if (type === "TEST") {
      reportTitle = `تقرير الفحوصات - ${periodText}`;
    } else if (type === "FINANCIAL") {
      reportTitle = `التقرير المالي - ${periodText}`;
    } else if (type === "SAMPLE") {
      reportTitle = `تقرير العينات - ${periodText}`;
    } else if (type === "SUMMARY") {
      reportTitle = `تقرير ملخص - ${periodText}`;
    }

    // تحديد وصف التقرير
    const periodFormatted = `للفترة من ${startDateTime.toLocaleDateString(
      "ar-EG"
    )} إلى ${endDateTime.toLocaleDateString("ar-EG")}`;

    // إضافة معلومات تشخيصية
    const diagnosticInfo = {
      periodType: period,
      actualStartDate: startDateTime.toISOString(),
      actualEndDate: endDateTime.toISOString(),
      reportGeneratedAt: new Date().toISOString(),
    };

    // دمج المعلومات التشخيصية مع بيانات التقرير
    const finalReportData = {
      ...reportData,
      diagnosticInfo,
    };

    // تحويل البيانات إلى JSON لتخزينها في الوصف إذا كان نموذج Report لا يدعم حقل data
    const reportDataJson = JSON.stringify(finalReportData);

    // إنشاء التقرير
    const newReport = await prisma.report.create({
      data: {
        title: reportTitle,
        type: type as ReportType,
        description: periodFormatted,
        startDate: startDateTime,
        endDate: endDateTime,
        createdById: userId,
        // استخدام رابط PDF للحفاظ على البيانات التفصيلية مؤقتًا
        pdfUrl: null,
      },
    });

    return NextResponse.json(
      {
        message: "تم توليد التقرير بنجاح",
        report: {
          id: newReport.id,
          title: newReport.title,
          type: newReport.type,
          description: newReport.description,
          startDate: newReport.startDate.toISOString(),
          endDate: newReport.endDate.toISOString(),
          createdAt: newReport.createdAt.toISOString(),
          data: finalReportData,
          generatedBy: userId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء توليد التقرير" },
      { status: 500 }
    );
  }
}
