import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// الحصول على نتيجة أشعة محددة
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // التحقق من المصادقة
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "توكن غير صالح" }, { status: 401 });
    }

    // التحقق من الصلاحيات - فقط المسؤول وفني المختبر يمكنهم الوصول
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { error: "غير مصرح لك بالوصول إلى هذا المورد" },
        { status: 403 }
      );
    }

    // جلب نتيجة الأشعة مع العلاقات
    const radiationResult = await prisma.radiationResult.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fileNumber: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        testAssignment: {
          select: {
            id: true,
            test: {
              select: {
                id: true,
                name: true,
                category: true,
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

    if (!radiationResult) {
      return NextResponse.json(
        { error: "نتيجة الأشعة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json(radiationResult);
  } catch (error) {
    console.error("Error fetching radiation result:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب نتيجة الأشعة" },
      { status: 500 }
    );
  }
}

// تحديث نتيجة أشعة
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // التحقق من المصادقة
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "توكن غير صالح" }, { status: 401 });
    }

    // التحقق من الصلاحيات - فقط المسؤول وفني المختبر يمكنهم تحديث نتائج الأشعة
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { error: "غير مصرح لك بتحديث نتائج الأشعة" },
        { status: 403 }
      );
    }

    // التحقق من وجود نتيجة الأشعة
    const existingResult = await prisma.radiationResult.findUnique({
      where: { id },
    });

    if (!existingResult) {
      return NextResponse.json(
        { error: "نتيجة الأشعة غير موجودة" },
        { status: 404 }
      );
    }

    // استخراج بيانات الطلب
    const data = await req.json();
    const { title, description, resultDetails, reportText, imageUrl, pdfUrl } =
      data;

    // تحديث نتيجة الأشعة
    const updatedRadiationResult = await prisma.radiationResult.update({
      where: { id },
      data: {
        title,
        description,
        resultDetails,
        reportText,
        imageUrl,
        pdfUrl,
        // لا نسمح بتحديث المريض أو تعيين الفحص لتجنب مشاكل تكامل البيانات
      },
    });

    return NextResponse.json(updatedRadiationResult);
  } catch (error) {
    console.error("Error updating radiation result:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث نتيجة الأشعة" },
      { status: 500 }
    );
  }
}

// حذف نتيجة أشعة
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // التحقق من المصادقة
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "توكن غير صالح" }, { status: 401 });
    }

    // التحقق من الصلاحيات - فقط المسؤول وفني المختبر يمكنهم حذف نتائج الأشعة
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { error: "غير مصرح لك بحذف نتائج الأشعة" },
        { status: 403 }
      );
    }

    // التحقق من وجود نتيجة الأشعة
    const existingResult = await prisma.radiationResult.findUnique({
      where: { id },
    });

    if (!existingResult) {
      return NextResponse.json(
        { error: "نتيجة الأشعة غير موجودة" },
        { status: 404 }
      );
    }

    // حذف نتيجة الأشعة
    await prisma.radiationResult.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "تم حذف نتيجة الأشعة بنجاح" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting radiation result:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف نتيجة الأشعة" },
      { status: 500 }
    );
  }
}
