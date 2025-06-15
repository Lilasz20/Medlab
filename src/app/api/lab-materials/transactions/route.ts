import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - الحصول على قائمة معاملات المواد المخبرية
export async function GET(request: NextRequest) {
  try {
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

    // تسجيل معلومات المستخدم للتشخيص
    console.log(
      "User accessing transactions API - Role:",
      payload.role,
      "UserID:",
      payload.userId
    );

    // التحقق من الصلاحيات (المدير وفني المختبر والمحاسب)
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "LAB_TECHNICIAN" &&
      payload.role !== "ACCOUNTANT"
    ) {
      console.log(
        "Access denied to transactions API - User role:",
        payload.role
      );
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    } else {
      console.log(
        "Access granted to transactions API - User role:",
        payload.role
      );
    }

    // استخراج معلمات البحث والترتيب والترشيح
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");
    const type = searchParams.get("type") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // بناء شروط البحث
    const where: any = {};

    // إضافة شرط المادة إذا كان موجودًا
    if (materialId) {
      where.materialId = materialId;
    }

    // إضافة شرط نوع المعاملة إذا كان موجودًا
    if (type) {
      where.type = type;
    }

    // إضافة شرط تاريخ المعاملة إذا كان موجودًا
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // نضيف يوم كامل لتضمين اليوم المحدد بالكامل
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    // الحصول على إجمالي عدد السجلات
    const total = await prisma.materialTransaction.count({ where });

    // الحصول على المعاملات مع الترتيب والترشيح
    const transactions = await prisma.materialTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        material: {
          select: {
            name: true,
            unit: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // حساب عدد الصفحات
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      transactions,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching material transactions:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات معاملات المواد المخبرية" },
      { status: 500 }
    );
  }
}

// POST - إضافة معاملة مادة مخبرية جديدة (إضافة أو تخفيض)
export async function POST(request: NextRequest) {
  try {
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

    // تسجيل معلومات المستخدم للتشخيص
    console.log(
      "User POST to transactions API - Role:",
      payload.role,
      "UserID:",
      payload.userId
    );

    // التحقق من الصلاحيات (المدير وفني المختبر والمحاسب)
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "LAB_TECHNICIAN" &&
      payload.role !== "ACCOUNTANT"
    ) {
      console.log(
        "Access denied to transactions API - User role:",
        payload.role
      );
      return NextResponse.json(
        { message: "ليس لديك صلاحية لإدارة المواد المخبرية" },
        { status: 403 }
      );
    } else {
      console.log(
        "Access granted to transactions API - User role:",
        payload.role
      );
    }

    // استخراج بيانات المعاملة من طلب POST
    const { materialId, type, quantity, reason, batchNumber, invoiceNumber } =
      await request.json();

    // التحقق من البيانات المطلوبة
    if (!materialId || !type || quantity === undefined || quantity <= 0) {
      return NextResponse.json(
        { message: "يرجى توفير جميع الحقول المطلوبة" },
        { status: 400 }
      );
    }

    try {
      // البحث عن المادة
      const material = await prisma.labMaterial.findUnique({
        where: { id: materialId },
      });

      if (!material) {
        return NextResponse.json(
          { message: "لم يتم العثور على المادة المخبرية" },
          { status: 404 }
        );
      }

      // حساب الكمية الجديدة بناءً على نوع المعاملة
      let newQuantity = material.currentQuantity;
      const parsedQuantity =
        typeof quantity === "string" ? parseFloat(quantity) : quantity;

      if (type === "ADD") {
        newQuantity += parsedQuantity;
      } else if (type === "REDUCE") {
        // التحقق من أن الكمية المتوفرة كافية
        if (material.currentQuantity < parsedQuantity) {
          return NextResponse.json(
            { message: "الكمية المتوفرة غير كافية للتخفيض المطلوب" },
            { status: 400 }
          );
        }
        newQuantity -= parsedQuantity;
      } else if (type === "ADJUST") {
        newQuantity = parsedQuantity;
      } else {
        return NextResponse.json(
          { message: "نوع المعاملة غير صالح" },
          { status: 400 }
        );
      }

      try {
        // إجراء المعاملة وتحديث المادة باستخدام معاملة قاعدة البيانات
        const result = await prisma.$transaction(async (prisma) => {
          // 1. إنشاء معاملة المادة
          const transaction = await prisma.materialTransaction.create({
            data: {
              materialId,
              type,
              quantity: parsedQuantity,
              previousQuantity: material.currentQuantity,
              newQuantity,
              reason:
                reason ||
                (type === "ADD"
                  ? "إضافة للمخزون"
                  : type === "REDUCE"
                  ? "استهلاك من المخزون"
                  : "تعديل المخزون"),
              batchNumber: batchNumber || null,
              invoiceNumber: invoiceNumber || null,
              createdById: payload.userId,
            },
          });

          // 2. تحديث كمية المادة
          const updatedMaterial = await prisma.labMaterial.update({
            where: { id: materialId },
            data: {
              currentQuantity: newQuantity,
            },
          });

          return {
            transaction,
            material: updatedMaterial,
          };
        });

        return NextResponse.json(
          {
            message:
              type === "ADD"
                ? "تمت إضافة الكمية بنجاح"
                : type === "REDUCE"
                ? "تم تخفيض الكمية بنجاح"
                : "تم تعديل الكمية بنجاح",
            transaction: result.transaction,
            material: result.material,
          },
          { status: 201 }
        );
      } catch (error) {
        console.error("Error processing transaction:", error);
        return NextResponse.json(
          {
            message: "حدث خطأ أثناء معالجة العملية",
            error: (error as Error).message,
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error finding material:", error);
      return NextResponse.json(
        {
          message: "حدث خطأ أثناء البحث عن المادة",
          error: (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating material transaction:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء إجراء معاملة المادة المخبرية" },
      { status: 500 }
    );
  }
}
