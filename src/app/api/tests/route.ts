import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - استرجاع قائمة الفحوصات
export async function GET(request: NextRequest) {
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

    // معالجة معلمات البحث والترتيب
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // بناء استعلام بحث
    const where = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { category: { contains: search } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    };

    // استرجاع الفحوصات مع العدد الإجمالي
    const [tests, totalCount] = await Promise.all([
      prisma.test.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.test.count({ where }),
    ]);

    // إرجاع البيانات مع معلومات الصفحات
    return NextResponse.json({
      tests,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات الفحوصات" },
      { status: 500 }
    );
  }
}

// POST - إضافة فحص جديد
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

    // التحقق من الصلاحيات (يمكن للمدير وفني المختبر فقط إضافة فحوصات)
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لإضافة فحص جديد" },
        { status: 403 }
      );
    }

    // استخراج بيانات الفحص من الطلب
    const { name, category, price, description } = await request.json();

    // التحقق من البيانات المطلوبة
    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { message: "الاسم والتصنيف والسعر حقول مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من أن السعر رقم
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return NextResponse.json(
        { message: "السعر يجب أن يكون رقماً" },
        { status: 400 }
      );
    }

    // إنشاء فحص جديد
    const newTest = await prisma.test.create({
      data: {
        name,
        category,
        price: parsedPrice,
        description: description || null,
      },
    });

    return NextResponse.json(
      {
        message: "تم إضافة الفحص بنجاح",
        test: newTest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating test:", error);
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء إضافة الفحص",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - تعديل فحص موجود
export async function PUT(request: NextRequest) {
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

    // التحقق من الصلاحيات (يمكن للمدير وفني المختبر فقط تعديل الفحوصات)
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لتعديل الفحوصات" },
        { status: 403 }
      );
    }

    // استخراج بيانات الفحص من الطلب
    const { id, name, category, price, description } = await request.json();

    // التحقق من وجود المعرف
    if (!id) {
      return NextResponse.json(
        { message: "معرف الفحص مطلوب" },
        { status: 400 }
      );
    }

    // التحقق من وجود الفحص
    const existingTest = await prisma.test.findUnique({
      where: { id },
      include: {
        testAssignments: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existingTest) {
      return NextResponse.json({ message: "الفحص غير موجود" }, { status: 404 });
    }

    // التحقق من البيانات المطلوبة
    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { message: "الاسم والتصنيف والسعر حقول مطلوبة" },
        { status: 400 }
      );
    }

    // التحقق من أن السعر رقم
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return NextResponse.json(
        { message: "السعر يجب أن يكون رقماً" },
        { status: 400 }
      );
    }

    // تحديث الفحص
    const updatedTest = await prisma.test.update({
      where: { id },
      data: {
        name,
        category,
        price: parsedPrice,
        description: description || null,
      },
    });

    return NextResponse.json({
      message: "تم تعديل الفحص بنجاح",
      test: updatedTest,
    });
  } catch (error: any) {
    console.error("Error updating test:", error);
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء تعديل الفحص",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف فحص
export async function DELETE(request: NextRequest) {
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

    // التحقق من الصلاحيات (يمكن للمدير وفني المختبر حذف الفحوصات)
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لحذف الفحوصات" },
        { status: 403 }
      );
    }

    // استخراج معرف الفحص من معلمات الطلب
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "معرف الفحص مطلوب" },
        { status: 400 }
      );
    }

    // التحقق من وجود الفحص وما إذا كان مرتبطاً بتخصيصات
    const existingTest = await prisma.test.findUnique({
      where: { id },
      include: {
        testAssignments: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existingTest) {
      return NextResponse.json({ message: "الفحص غير موجود" }, { status: 404 });
    }

    // التحقق مما إذا كان الفحص مخصصاً لمرضى
    if (existingTest.testAssignments.length > 0) {
      return NextResponse.json(
        {
          message: "لا يمكن حذف هذا الفحص لأنه مخصص بالفعل لمرضى",
          isAssigned: true,
        },
        { status: 400 }
      );
    }

    // حذف الفحص
    await prisma.test.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "تم حذف الفحص بنجاح",
    });
  } catch (error: any) {
    console.error("Error deleting test:", error);
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء حذف الفحص",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
