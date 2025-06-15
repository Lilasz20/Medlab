import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { RouteParams } from "@/types/route-handlers";

// DELETE /api/samples/[sampleCode] - حذف عينة
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams<{ sampleCode: string }>
) {
  try {
    // التحقق من توكن المستخدم
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
      const decoded = await verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("توكن غير صالح");
      }
      userId = decoded.userId;
    } catch (err) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // التحقق من صلاحية المستخدم (يجب أن يكون فني مختبر أو مشرف)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== "LAB_TECHNICIAN" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "غير مصرح لك بإجراء هذه العملية" },
        { status: 403 }
      );
    }

    // استخراج رمز العينة
    const sampleCode = params.sampleCode;

    // البحث عن العينة
    const sample = await prisma.sample.findFirst({
      where: { sampleCode },
      include: { testAssignment: true },
    });

    if (!sample) {
      return NextResponse.json({ error: "العينة غير موجودة" }, { status: 404 });
    }

    // حذف العينة
    await prisma.sample.delete({
      where: { id: sample.id },
    });

    // تحديث حالة تعيين الاختبار إلى معلق
    if (sample.testAssignment) {
      await prisma.testAssignment.update({
        where: { id: sample.testAssignmentId },
        data: { status: "PENDING" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting sample:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "العينة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف العينة" },
      { status: 500 }
    );
  }
}

// أضف الآن API endpoint للتعامل مع نتائج العينة
export async function GET(
  request: NextRequest,
  { params }: RouteParams<{ sampleCode: string }>
) {
  try {
    // التحقق من توكن المستخدم
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = await verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("توكن غير صالح");
      }
    } catch (err) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // استخراج رمز العينة
    const sampleCode = params.sampleCode;

    // البحث عن العينة
    const sample = await prisma.sample.findFirst({
      where: { sampleCode },
      include: {
        testAssignment: {
          include: {
            patient: true,
            test: true,
          },
        },
        collectedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sample) {
      return NextResponse.json({ error: "العينة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(sample);
  } catch (error) {
    console.error("Error fetching sample:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات العينة" },
      { status: 500 }
    );
  }
}
