import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    // التحقق من صلاحية التوكن
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // التحقق من الصلاحيات (المدير وموظف الاستقبال والفني)
    if (!["ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN"].includes(payload.role)) {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لتخصيص فحوصات للمرضى" },
        { status: 403 }
      );
    }

    // استخراج بيانات التخصيص من الطلب
    const { patientId, testIds } = await request.json();

    // التحقق من البيانات المطلوبة
    if (
      !patientId ||
      !testIds ||
      !Array.isArray(testIds) ||
      testIds.length === 0
    ) {
      return NextResponse.json(
        { message: "معرف المريض وقائمة معرفات الفحوصات حقول مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من وجود المريض
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { message: "المريض غير موجود" },
        { status: 404 }
      );
    }

    // التحقق من وجود جميع الفحوصات
    const tests = await prisma.test.findMany({
      where: { id: { in: testIds } },
    });

    if (tests.length !== testIds.length) {
      return NextResponse.json(
        { message: "بعض الفحوصات المحددة غير موجودة" },
        { status: 404 }
      );
    }

    // التحقق من عدم وجود تخصيصات مسبقة لنفس المريض ونفس الفحوصات
    const existingAssignments = await prisma.testAssignment.findMany({
      where: {
        patientId,
        testId: { in: testIds },
        status: { not: "CANCELLED" },
      },
    });

    if (existingAssignments.length > 0) {
      const existingTestIds = existingAssignments.map((ea) => ea.testId);

      // الحصول على أسماء الفحوصات المخصصة مسبقًا
      const existingTests = await prisma.test.findMany({
        where: { id: { in: existingTestIds } },
        select: { name: true },
      });

      const existingTestNames = existingTests.map((et) => et.name).join(", ");

      return NextResponse.json(
        {
          message: "بعض الفحوصات مخصصة بالفعل لهذا المريض",
          existingTestIds,
          existingTestNames,
        },
        { status: 409 }
      );
    }

    // بناء قائمة التخصيصات الجديدة
    const testAssignmentData = testIds.map((testId) => ({
      patientId,
      testId,
      assignedById: payload.userId,
      status: "PENDING",
    }));

    // إنشاء تخصيصات جديدة
    const createdAssignments = await prisma.$transaction(
      testAssignmentData.map((data) =>
        prisma.testAssignment.create({
          data,
          include: {
            test: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: `تم تخصيص ${createdAssignments.length} فحص للمريض بنجاح`,
        assignments: createdAssignments,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error assigning multiple tests:", error);

    // رسائل خطأ خاصة
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "بعض الفحوصات مخصصة بالفعل لهذا المريض" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "حدث خطأ أثناء تخصيص الفحوصات للمريض",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
