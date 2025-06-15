import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// دالة مساعدة لتنظيف نصوص البحث
function sanitizeSearchString(searchText: string): string {
  if (!searchText) return "";

  // إزالة الرموز الخاصة التي قد تسبب مشاكل في MySQL search
  return searchText.trim().replace(/[%_\\]/g, ""); // إزالة الرموز الخاصة في MySQL LIKE
}

// GET - استرجاع قائمة فواتير الشراء
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

    // التحقق من الصلاحيات (يمكن للمدير والمحاسب فقط الوصول)
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    }

    // معالجة معلمات البحث والترتيب
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;
    const status = searchParams.get("status"); // PAID, UNPAID, PARTIAL
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "newest";

    // تنظيف نص البحث
    const sanitizedSearch = sanitizeSearchString(search);

    // بناء استعلام بحث
    let where: any = {};

    // فلترة بناء على حالة الدفع
    if (status) {
      if (status === "PAID") {
        where.isPaid = true;
      } else if (status === "UNPAID") {
        where.isPaid = false;
        where.paidAmount = 0;
      } else if (status === "PARTIAL") {
        where.isPaid = false;
        where.paidAmount = {
          gt: 0,
        };
      }
    }

    // فلترة بناء على التاريخ
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate) {
        // إضافة يوم واحد للتاريخ النهائي للشمول
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        where.invoiceDate.lte = endDateObj;
      }
    }

    // فلترة البحث
    if (sanitizedSearch) {
      try {
        // التحقق من أن النص المبحوث عنه ليس فارغًا بعد التنظيف
        if (sanitizedSearch.length > 0) {
          where.OR = [
            {
              supplierName: {
                contains: sanitizedSearch,
              },
            },
            {
              invoiceNumber: {
                contains: sanitizedSearch,
              },
            },
            {
              id: {
                contains: sanitizedSearch,
              },
            },
          ];
        }
      } catch (searchError) {
        console.error("Error in search processing:", searchError, {
          sanitizedSearch,
        });
        // في حالة حدوث خطأ في البحث، استمر بدون تطبيق فلتر البحث
      }
    }

    // تحديد الترتيب بناءً على معلمة sort
    let orderBy: any = {};

    switch (sort) {
      case "oldest":
        orderBy = { invoiceDate: "asc" };
        break;
      case "amount_asc":
        orderBy = { totalAmount: "asc" };
        break;
      case "amount_desc":
        orderBy = { totalAmount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { invoiceDate: "desc" };
        break;
    }

    // استرجاع فواتير الشراء مع العدد الإجمالي
    const [invoices, totalCount] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          items: true,
        },
      }),
      prisma.purchaseInvoice.count({ where }),
    ]);

    // إرجاع البيانات مع معلومات الصفحات
    return NextResponse.json({
      invoices,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);

    // تحسين رسالة الخطأ لتضمين المزيد من المعلومات
    let errorMessage = "حدث خطأ أثناء استرجاع بيانات فواتير الشراء";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      console.error(error.stack);
    }

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// POST - إنشاء فاتورة شراء جديدة
export async function POST(request: NextRequest) {
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

    // التحقق من الصلاحيات (يمكن للمدير والمحاسب فقط الإضافة)
    if (payload.role !== "ADMIN" && payload.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية لإضافة فاتورة شراء جديدة" },
        { status: 403 }
      );
    }

    // استخراج بيانات الفاتورة من الطلب
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

    // إنشاء فاتورة الشراء مع العناصر
    const newInvoice = await prisma.purchaseInvoice.create({
      data: {
        supplierName,
        invoiceNumber,
        totalAmount,
        paidAmount: paidAmount || 0,
        isPaid: isPaid || false,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        createdById: payload.userId,
        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "تم إنشاء فاتورة الشراء بنجاح",
        invoice: newInvoice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating purchase invoice:", error);

    // رسائل خطأ أكثر تفصيلاً
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "يوجد خطأ في البيانات المقدمة. تأكد من صحة المعلومات" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "حدث خطأ أثناء إنشاء فاتورة الشراء",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
