import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - استرجاع فاتورة بواسطة المعرف
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // استخراج معرف الفاتورة (مع مراعاة أنه قد يكون Promise)
    const id = params instanceof Promise ? (await params).id : params.id;

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

    // التحقق من الصلاحيات    if (      payload.role !== "ADMIN" &&      payload.role !== "ACCOUNTANT"    ) {      return NextResponse.json(        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },        { status: 403 }      );    }

    // التحقق من وجود الفاتورة
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fileNumber: true,
            phone: true,
          },
        },
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
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "الفاتورة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات الفاتورة" },
      { status: 500 }
    );
  }
}

// PUT - تحديث فاتورة بواسطة المعرف
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // استخراج معرف الفاتورة (مع مراعاة أنه قد يكون Promise)
    const id = params instanceof Promise ? (await params).id : params.id;

    // التحقق من المصادقة
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

    // التحقق من الصلاحيات
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لتحديث الفواتير" },
        { status: 403 }
      );
    }

    const { patientId, totalAmount, paidAmount, isPaid, dueDate, items } =
      await request.json();

    // التحقق من وجود الفاتورة
    const invoiceExists = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoiceExists) {
      return NextResponse.json(
        { message: "الفاتورة غير موجودة" },
        { status: 404 }
      );
    }

    let updatedInvoice;

    // Handle the update in steps if items provided
    if (items && Array.isArray(items)) {
      // First delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Then update the invoice and create new items
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          patientId: patientId !== undefined ? patientId : undefined,
          totalAmount: totalAmount !== undefined ? totalAmount : undefined,
          paidAmount: paidAmount !== undefined ? paidAmount : undefined,
          isPaid: isPaid !== undefined ? isPaid : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          items: {
            create: items.map((item: any) => ({
              testAssignmentId: item.testAssignmentId,
              price: item.price,
              quantity: item.quantity || 1,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          patient: {
            select: {
              name: true,
              fileNumber: true,
            },
          },
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
              name: true,
            },
          },
        },
      });
    } else {
      // Just update the invoice without touching items
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          patientId: patientId !== undefined ? patientId : undefined,
          totalAmount: totalAmount !== undefined ? totalAmount : undefined,
          paidAmount: paidAmount !== undefined ? paidAmount : undefined,
          isPaid: isPaid !== undefined ? isPaid : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        },
        include: {
          patient: {
            select: {
              name: true,
              fileNumber: true,
            },
          },
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
              name: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      message: "تم تحديث الفاتورة بنجاح",
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("Error updating invoice:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "يوجد خطأ في البيانات المقدمة. تأكد من صحة المعلومات" },
        { status: 409 }
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          message:
            "أحد العناصر المرجعية غير موجود. تأكد من صحة معرفات الفحوصات",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "حدث خطأ أثناء تحديث الفاتورة",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف فاتورة بواسطة المعرف
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // استخراج معرف الفاتورة (مع مراعاة أنه قد يكون Promise)
    const id = params instanceof Promise ? (await params).id : params.id;

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

    // التحقق من الصلاحيات
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لحذف الفواتير" },
        { status: 403 }
      );
    }

    // التحقق من وجود الفاتورة
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "الفاتورة غير موجودة" },
        { status: 404 }
      );
    }

    // استخدام معاملة لحذف عناصر الفاتورة أولاً ثم الفاتورة نفسها
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      }),
      prisma.invoice.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "تم حذف الفاتورة بنجاح" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء حذف الفاتورة" },
      { status: 500 }
    );
  }
}
