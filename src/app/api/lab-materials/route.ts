import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - الحصول على قائمة المواد المخبرية
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

    // التحقق من الصلاحيات (المدير وفني المختبر والمحاسب)
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "LAB_TECHNICIAN" &&
      payload.role !== "ACCOUNTANT"
    ) {
      console.log("Access denied - User role:", payload.role);
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    } else {
      console.log(
        "Access granted to lab-materials API - User role:",
        payload.role
      );
    }

    // استخراج معلمات البحث والترتيب والترشيح
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || undefined;
    const lowStock = searchParams.get("lowStock") === "true";
    const sort = searchParams.get("sort") || "name";
    const order = searchParams.get("order") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // بناء شروط البحث
    const where: any = {};

    // إضافة شرط البحث إذا كان موجودًا
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    // إضافة شرط التصنيف إذا كان موجودًا
    if (category) {
      where.category = category;
    }

    // إضافة شرط المخزون المنخفض إذا كان مطلوبًا
    if (lowStock) {
      where.currentQuantity = {
        lte: { minimumQuantity: true },
      };
    }

    // الحصول على إجمالي عدد السجلات
    const total = await prisma.labMaterial.count({ where });

    // الحصول على المواد مع الترتيب والترشيح
    const materials = await prisma.labMaterial.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
    });

    // حساب عدد الصفحات
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      materials,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching lab materials:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات المواد المخبرية" },
      { status: 500 }
    );
  }
}

// POST - إضافة مادة مخبرية جديدة
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

    // التحقق من الصلاحيات (المدير وفني المختبر والمحاسب)
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "LAB_TECHNICIAN" &&
      payload.role !== "ACCOUNTANT"
    ) {
      console.log("Access denied - User role:", payload.role);
      return NextResponse.json(
        { message: "ليس لديك صلاحية لإضافة مواد مخبرية" },
        { status: 403 }
      );
    } else {
      console.log(
        "Access granted to lab-materials API - User role:",
        payload.role
      );
    }

    // استخراج بيانات المادة من طلب POST
    const {
      name,
      code,
      category,
      description,
      unit,
      currentQuantity,
      minimumQuantity,
      price,
      supplier,
      expiryDate,
      location,
      notes,
      batchNumber,
      invoiceNumber,
    } = await request.json();

    // التحقق من البيانات المطلوبة
    if (
      !name ||
      !category ||
      !unit ||
      currentQuantity === undefined ||
      minimumQuantity === undefined
    ) {
      return NextResponse.json(
        { message: "يرجى توفير جميع الحقول المطلوبة" },
        { status: 400 }
      );
    }

    try {
      // إنشاء المادة في قاعدة البيانات مع حركة الإضافة الأولية باستخدام معاملة
      const result = await prisma.$transaction(async (prisma) => {
        // 1. إنشاء المادة
        const material = await prisma.labMaterial.create({
          data: {
            name,
            code: code || null,
            category,
            description: description || null,
            unit,
            currentQuantity:
              typeof currentQuantity === "string"
                ? parseFloat(currentQuantity)
                : currentQuantity,
            minimumQuantity:
              typeof minimumQuantity === "string"
                ? parseFloat(minimumQuantity)
                : minimumQuantity,
            price: price
              ? typeof price === "string"
                ? parseFloat(price)
                : price
              : null,
            supplier: supplier || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            location: location || null,
            notes: notes || null,
            createdById: payload.userId,
          },
        });

        console.log("تم إنشاء المادة بنجاح:", material);
        console.log("معرف المستخدم:", payload.userId);

        // 2. إضافة حركة الإضافة الأولية
        const initialQuantity =
          typeof currentQuantity === "string"
            ? parseFloat(currentQuantity)
            : currentQuantity;
        if (initialQuantity > 0) {
          try {
            const transaction = await prisma.materialTransaction.create({
              data: {
                materialId: material.id,
                type: "ADD",
                quantity: initialQuantity,
                previousQuantity: 0,
                newQuantity: initialQuantity,
                reason: "إضافة أولية",
                batchNumber: batchNumber || null,
                invoiceNumber: invoiceNumber || null,
                createdById: payload.userId,
              },
            });
            console.log("تم إنشاء الحركة بنجاح:", transaction);
          } catch (transactionError) {
            console.error("فشل في إنشاء الحركة:", transactionError);
            throw transactionError;
          }
        }

        return material;
      });

      return NextResponse.json(
        {
          message: "تمت إضافة المادة المخبرية بنجاح",
          material: result,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating lab material:", error);
      return NextResponse.json(
        {
          message: "حدث خطأ أثناء إضافة المادة المخبرية",
          error: (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating lab material:", error);
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء إضافة المادة المخبرية",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
