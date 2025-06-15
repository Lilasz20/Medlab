import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAndAuthorize, handleApiError } from "@/lib/auth/helpers";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - استرجاع بيانات مريض واحد بناءً على المعرف
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // استرجاع بيانات المريض
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
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

    if (!patient) {
      return NextResponse.json(
        { message: "المريض غير موجود" },
        { status: 404 }
      );
    }

    // إرجاع البيانات
    return NextResponse.json({ patient });
  } catch (error) {
    return handleApiError(error, "استرجاع بيانات المريض");
  }
}

// PUT - تحديث بيانات مريض
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // التحقق من وجود المريض
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { message: "المريض غير موجود" },
        { status: 404 }
      );
    }

    // استخراج بيانات التحديث من الطلب
    const { name, fileNumber, phone, gender, dateOfBirth, address } =
      await request.json();

    // التحقق من البيانات المطلوبة
    if (!name || !fileNumber || !gender) {
      return NextResponse.json(
        { message: "الاسم ورقم الملف والجنس حقول مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من عدم تكرار رقم الملف (إذا تم تغييره)
    if (fileNumber !== existingPatient.fileNumber) {
      const duplicateFileNumber = await prisma.patient.findUnique({
        where: { fileNumber },
      });

      if (duplicateFileNumber) {
        return NextResponse.json(
          { message: "رقم الملف مستخدم بالفعل. الرجاء استخدام رقم آخر" },
          { status: 409 }
        );
      }
    }

    // تحديث بيانات المريض
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        name,
        fileNumber,
        phone: phone || null,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "تم تحديث بيانات المريض بنجاح",
      patient: updatedPatient,
    });
  } catch (error) {
    return handleApiError(error, "تحديث بيانات المريض");
  }
}

// DELETE - حذف مريض
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // التحقق من المصادقة والصلاحيات (للمدير وموظف الاستقبال)
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // التحقق من وجود المريض
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            testAssignments: true,
            invoices: true,
            queueNumbers: true,
          },
        },
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { message: "المريض غير موجود" },
        { status: 404 }
      );
    }

    // التحقق من وجود سجلات مرتبطة
    if (
      existingPatient._count.testAssignments > 0 ||
      existingPatient._count.invoices > 0 ||
      existingPatient._count.queueNumbers > 0
    ) {
      // حذف السجلات المرتبطة أولاً
      // يجب أن نبدأ بحذف السجلات التي تعتمد على سجلات أخرى

      // 1. حذف أرقام الطابور
      if (existingPatient._count.queueNumbers > 0) {
        await prisma.queueNumber.deleteMany({
          where: { patientId: id },
        });
      }

      // 2. حذف عناصر الفواتير المرتبطة بتعيينات الاختبارات لهذا المريض
      if (existingPatient._count.testAssignments > 0) {
        // الحصول على جميع تعيينات الاختبارات للمريض
        const testAssignments = await prisma.testAssignment.findMany({
          where: { patientId: id },
          select: { id: true },
        });

        const testAssignmentIds = testAssignments.map((ta) => ta.id);

        // حذف عناصر الفواتير المرتبطة بهذه التعيينات
        if (testAssignmentIds.length > 0) {
          await prisma.invoiceItem.deleteMany({
            where: {
              testAssignmentId: { in: testAssignmentIds },
            },
          });
        }

        // 3. حذف العينات المرتبطة بتعيينات الاختبارات
        await prisma.sample.deleteMany({
          where: {
            testAssignmentId: { in: testAssignmentIds },
          },
        });

        // 4. حذف تعيينات الاختبارات نفسها
        await prisma.testAssignment.deleteMany({
          where: { patientId: id },
        });
      }

      // 5. حذف الفواتير وعناصرها
      if (existingPatient._count.invoices > 0) {
        // أي عناصر فواتير متبقية
        await prisma.invoiceItem.deleteMany({
          where: {
            invoice: { patientId: id },
          },
        });

        // ثم حذف الفواتير
        await prisma.invoice.deleteMany({
          where: { patientId: id },
        });
      }
    }

    // حذف المريض نفسه بعد حذف جميع السجلات المرتبطة
    await prisma.patient.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "تم حذف المريض بنجاح",
    });
  } catch (error) {
    console.error(`Error deleting patient with ID ${params.id}:`, error);

    // تفاصيل أكثر لرسائل الخطأ
    if ((error as any).code === "P2003") {
      return NextResponse.json(
        {
          message:
            "لا يمكن حذف المريض لوجود سجلات مرتبطة به. يرجى حذف جميع السجلات المرتبطة أولاً.",
          details: (error as any).meta,
        },
        { status: 400 }
      );
    }

    if ((error as any).code === "P2025") {
      return NextResponse.json(
        { message: "المريض غير موجود أو تم حذفه بالفعل" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "حدث خطأ أثناء حذف المريض",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
