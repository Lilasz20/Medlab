import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

interface RouteParams {
  params: {
    id: string;
    action: string;
  };
}

// GET - الحصول على بيانات المريض بناءً على الإجراء المطلوب
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, action } = params;

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

    // التحقق من وجود المريض
    const patientExists = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patientExists) {
      return NextResponse.json(
        { message: "المريض غير موجود" },
        { status: 404 }
      );
    }

    // تنفيذ الإجراء المطلوب بناءً على نوع الإجراء
    switch (action) {
      case "tests":
        // التحقق من الصلاحيات للوصول إلى بيانات الفحوصات
        if (
          payload.role !== "ADMIN" &&
          payload.role !== "RECEPTIONIST" &&
          payload.role !== "LAB_TECH"
        ) {
          return NextResponse.json(
            { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
            { status: 403 }
          );
        }

        // الحصول على فحوصات المريض
        const tests = await prisma.testAssignment.findMany({
          where: { patientId: id },
          include: {
            test: true,
            samples: true,
            assignedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            assignedAt: "desc",
          },
        });

        return NextResponse.json({ tests });

      case "invoices": // التحقق من الصلاحيات للوصول إلى بيانات الفواتير        if (          payload.role !== "ADMIN" &&          payload.role !== "ACCOUNTANT"        ) {          return NextResponse.json(            { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },            { status: 403 }          );        }
        // الحصول على فواتير المريض
        const invoices = await prisma.invoice.findMany({
          where: { patientId: id },
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
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            invoiceDate: "desc",
          },
        });

        return NextResponse.json({ invoices });

      case "queue":
        // التحقق من الصلاحيات للوصول إلى بيانات قائمة الانتظار
        if (payload.role !== "ADMIN" && payload.role !== "RECEPTIONIST") {
          return NextResponse.json(
            { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
            { status: 403 }
          );
        }

        // الحصول على سجلات قائمة الانتظار للمريض
        const queueRecords = await prisma.queueNumber.findMany({
          where: { patientId: id },
          orderBy: {
            date: "desc",
          },
        });

        return NextResponse.json({ queueRecords });

      case "history":
        // التحقق من الصلاحيات للوصول إلى سجل المريض
        if (
          payload.role !== "ADMIN" &&
          payload.role !== "RECEPTIONIST" &&
          payload.role !== "LAB_TECH"
        ) {
          return NextResponse.json(
            { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
            { status: 403 }
          );
        }

        // الحصول على سجل كامل للمريض مع ترتيب زمني
        const patientHistory = await prisma.patient.findUnique({
          where: { id },
          include: {
            testAssignments: {
              include: {
                test: true,
                samples: true,
              },
              orderBy: {
                assignedAt: "desc",
              },
            },
            invoices: {
              include: {
                items: true,
              },
              orderBy: {
                invoiceDate: "desc",
              },
            },
            queueNumbers: {
              orderBy: {
                date: "desc",
              },
            },
          },
        });

        return NextResponse.json({ patientHistory });

      default:
        return NextResponse.json(
          { message: "الإجراء غير معروف" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      `Error processing action ${params.action} for patient ${params.id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء معالجة الطلب",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
