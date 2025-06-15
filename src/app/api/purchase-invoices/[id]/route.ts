import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - الحصول على تفاصيل فاتورة شراء واحدة
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // استخراج معرف الفاتورة من context.params مع استخدام await
    const params = await context.params;
    const invoiceId = params.id;

    // التحقق من المصادقة
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // التحقق من الصلاحيات (المدير والمحاسب فقط)
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    }

    // البحث عن الفاتورة في قاعدة البيانات
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
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
        { message: "لم يتم العثور على فاتورة الشراء" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error fetching purchase invoice:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات فاتورة الشراء" },
      { status: 500 }
    );
  }
}

// PUT - تحديث فاتورة شراء
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // استخراج معرف الفاتورة من context.params مع استخدام await
    const params = await context.params;
    const invoiceId = params.id;

    // التحقق من المصادقة
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // التحقق من الصلاحيات (المدير والمحاسب فقط)
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لتحديث بيانات فاتورة الشراء" },
        { status: 403 }
      );
    }

    // التحقق من وجود الفاتورة
    const existingInvoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { message: "لم يتم العثور على فاتورة الشراء" },
        { status: 404 }
      );
    }

    // استخراج بيانات التحديث من الطلب
    const {
      supplierName,
      invoiceNumber,
      totalAmount,
      paidAmount,
      isPaid,
      dueDate,
      notes,
      items,
    } = await request.json();

    // التحقق من البيانات المطلوبة
    if (
      !supplierName ||
      !totalAmount ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { message: "اسم المورد والمبلغ الإجمالي وعناصر الفاتورة حقول مطلوبة" },
        { status: 400 }
      );
    }

    // تحديث الفاتورة باستخدام المعاملة
    const updatedInvoice = await prisma.$transaction(async (prisma) => {
      // 1. حذف العناصر الموجودة
      await prisma.purchaseInvoiceItem.deleteMany({
        where: { invoiceId: invoiceId },
      });

      // 2. تحديث الفاتورة نفسها
      const updatedInvoice = await prisma.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          supplierName,
          invoiceNumber,
          totalAmount,
          paidAmount: paidAmount || 0,
          isPaid: isPaid || false,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 3. إنشاء عناصر الفاتورة الجديدة
      const invoiceItems = await Promise.all(
        items.map((item: any) =>
          prisma.purchaseInvoiceItem.create({
            data: {
              invoiceId: invoiceId,
              itemName: item.itemName,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            },
          })
        )
      );

      return {
        ...updatedInvoice,
        items: invoiceItems,
      };
    });

    return NextResponse.json({
      message: "تم تحديث فاتورة الشراء بنجاح",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Error updating purchase invoice:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تحديث بيانات فاتورة الشراء" },
      { status: 500 }
    );
  }
}

// DELETE - حذف فاتورة شراء
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // استخراج معرف الفاتورة من context.params مع استخدام await
    const params = await context.params;
    const invoiceId = params.id;

    // التحقق من المصادقة
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // التحقق من الصلاحيات (المدير والمحاسب فقط)
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لحذف فاتورة الشراء" },
        { status: 403 }
      );
    }

    // التحقق من وجود الفاتورة
    const existingInvoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { message: "لم يتم العثور على فاتورة الشراء" },
        { status: 404 }
      );
    }

    // حذف الفاتورة والعناصر المرتبطة بها باستخدام المعاملة
    await prisma.$transaction(async (prisma) => {
      // 1. حذف عناصر الفاتورة أولاً
      await prisma.purchaseInvoiceItem.deleteMany({
        where: { invoiceId: invoiceId },
      });

      // 2. حذف الفاتورة نفسها
      await prisma.purchaseInvoice.delete({
        where: { id: invoiceId },
      });
    });

    return NextResponse.json({
      message: "تم حذف فاتورة الشراء وجميع عناصرها بنجاح",
    });
  } catch (error) {
    console.error("Error deleting purchase invoice:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء حذف فاتورة الشراء" },
      { status: 500 }
    );
  }
}
