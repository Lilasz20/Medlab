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
    const { patientId, testId } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!patientId || !testId) {
      return NextResponse.json(
        { message: "معرف المريض ومعرف الفحص حقول مطلوبة" },
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

    // التحقق من وجود الفحص
    const test = await prisma.test.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json({ message: "الفحص غير موجود" }, { status: 404 });
    }

    // التحقق من عدم وجود تخصيص مسبق لنفس المريض ونفس الفحص
    const existingAssignment = await prisma.testAssignment.findFirst({
      where: {
        patientId,
        testId,
        status: { not: "CANCELLED" },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { message: "هذا الفحص مخصص بالفعل لهذا المريض" },
        { status: 409 }
      );
    }

    // إنشاء تخصيص جديد
    const newAssignment = await prisma.testAssignment.create({
      data: {
        patientId,
        testId,
        assignedById: payload.userId,
        status: "PENDING",
      },
      include: {
        patient: {
          select: {
            name: true,
            fileNumber: true,
          },
        },
        test: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "تم تخصيص الفحص للمريض بنجاح",
        assignment: newAssignment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error assigning test:", error);

    // رسائل خطأ خاصة
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "هذا الفحص مخصص بالفعل لهذا المريض" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "حدث خطأ أثناء تخصيص الفحص للمريض",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
