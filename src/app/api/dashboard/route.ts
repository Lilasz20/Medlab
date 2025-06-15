import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - استرجاع إحصائيات لوحة التحكم والنشاط الأخير
export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة باستخدام Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // التحقق من صلاحية التوكن
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // ---------------------------
    // استرجاع الإحصائيات
    // ---------------------------

    // تحديد بداية اليوم ونهايته للإحصائيات اليومية
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // استعلامات متوازية للإحصائيات
    const [
      totalPatients,
      activeTests,
      pendingSamples,
      todayRevenue,
      recentActivities,
    ] = await Promise.all([
      // 1. إجمالي المرضى
      prisma.patient.count(),

      // 2. الفحوصات النشطة (كل ما هو ليس مكتمل أو ملغي)
      prisma.testAssignment.count({
        where: {
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
      }),

      // 3. العينات المعلقة (التي تم جمعها ولكن ليس لها نتائج بعد)
      prisma.sample.count({
        where: {
          results: null,
        },
      }),

      // 4. إيرادات اليوم
      prisma.invoice.aggregate({
        where: {
          invoiceDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),

      // ---------------------------
      // استرجاع النشاط الأخير
      // ---------------------------
      getRecentActivities(),
    ]);

    // إعداد البيانات للإرجاع
    return NextResponse.json({
      stats: {
        totalPatients,
        activeTests,
        pendingSamples,
        todayRevenue: {
          total: todayRevenue._sum.totalAmount || 0,
          paid: todayRevenue._sum.paidAmount || 0,
        },
      },
      recentActivities,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات لوحة التحكم" },
      { status: 500 }
    );
  }
}

// دالة مساعدة لاسترجاع النشاط الأخير
async function getRecentActivities() {
  // استرجاع آخر 10 أنشطة (سنقوم بتصفيتها واختيار 5 منها)
  const [newPatients, newSamples, newInvoices, completedTests] =
    await Promise.all([
      // آخر المرضى
      prisma.patient.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),

      // آخر العينات
      prisma.sample.findMany({
        select: {
          id: true,
          collectedAt: true,
          testAssignment: {
            select: {
              patient: {
                select: {
                  name: true,
                },
              },
              test: {
                select: {
                  name: true,
                },
              },
            },
          },
          collectedBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          collectedAt: "desc",
        },
        take: 5,
      }),

      // آخر الفواتير
      prisma.invoice.findMany({
        select: {
          id: true,
          totalAmount: true,
          invoiceDate: true,
          patient: {
            select: {
              name: true,
            },
          },
          createdBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          invoiceDate: "desc",
        },
        take: 5,
      }),

      // آخر الفحوصات المكتملة
      prisma.testAssignment.findMany({
        where: {
          status: "COMPLETED",
        },
        select: {
          id: true,
          updatedAt: true,
          test: {
            select: {
              name: true,
            },
          },
          patient: {
            select: {
              name: true,
            },
          },
          assignedBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      }),
    ]);

  // تحويل النتائج إلى تنسيق موحد للنشاط
  const activities = [
    ...newPatients.map((patient) => ({
      id: `patient-${patient.id}`,
      type: "patient",
      action: "تسجيل مريض جديد",
      subject: patient.name,
      user: patient.createdBy.name,
      timestamp: patient.createdAt,
    })),

    ...newSamples.map((sample) => ({
      id: `sample-${sample.id}`,
      type: "sample",
      action: "جمع عينة",
      subject: `${sample.testAssignment.patient.name} - ${sample.testAssignment.test.name}`,
      user: sample.collectedBy.name,
      timestamp: sample.collectedAt,
    })),

    ...newInvoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      action: "إنشاء فاتورة",
      subject: `${invoice.patient.name} - ${invoice.totalAmount} ل.س`,
      user: invoice.createdBy.name,
      timestamp: invoice.invoiceDate,
    })),

    ...completedTests.map((test) => ({
      id: `test-${test.id}`,
      type: "test",
      action: "اكتمال فحص",
      subject: `${test.patient.name} - ${test.test.name}`,
      user: test.assignedBy.name,
      timestamp: test.updatedAt,
    })),
  ];

  // ترتيب النشاطات حسب الوقت وأخذ أحدث 5
  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5)
    .map((activity) => {
      // حساب الوقت النسبي منذ النشاط (للعرض بشكل "منذ x دقيقة")
      const timeDiff = calculateTimeDifference(activity.timestamp);

      return {
        ...activity,
        time: timeDiff,
      };
    });
}

// دالة مساعدة لحساب الفرق الزمني وتحويله إلى نص (منذ x دقيقة/ساعة)
function calculateTimeDifference(timestamp: Date): string {
  const now = new Date();
  const date = new Date(timestamp);

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) {
    return "الآن";
  } else if (diffMins < 60) {
    return `منذ ${diffMins} دقيقة`;
  } else if (diffMins < 1440) {
    // أقل من يوم
    const hours = Math.floor(diffMins / 60);
    return `منذ ${hours} ساعة`;
  } else {
    const days = Math.floor(diffMins / 1440);
    return `منذ ${days} يوم`;
  }
}
