import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// الحصول على قائمة نتائج الأشعة
export async function GET(req: NextRequest) {
  try {
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

    // استخراج معلمات البحث
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const testAssignmentId = searchParams.get("testAssignmentId");

    // بناء استعلام البحث
    const whereClause: any = {};

    if (patientId) {
      whereClause.patientId = patientId;
    }

    if (testAssignmentId) {
      whereClause.testAssignmentId = testAssignmentId;
    }

    // جلب نتائج الأشعة مع العلاقات
    const radiationResults = await prisma.radiationResult.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fileNumber: true,
          },
        },
        testAssignment: {
          select: {
            id: true,
            test: {
              select: {
                id: true,
                name: true,
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
        createdAt: "desc",
      },
    });

    return NextResponse.json(radiationResults);
  } catch (error) {
    console.error("Error fetching radiation results:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب نتائج الأشعة" },
      { status: 500 }
    );
  }
}

// إنشاء نتيجة أشعة جديدة
export async function POST(req: NextRequest) {
  try {
    // التحقق من المصادقة
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "توكن غير صالح" }, { status: 401 });
    }

    // التحقق من الصلاحيات - فقط المسؤول وفني المختبر يمكنهم إنشاء نتائج أشعة
    if (payload.role !== "ADMIN" && payload.role !== "LAB_TECHNICIAN") {
      return NextResponse.json(
        { error: "غير مصرح لك بإنشاء نتائج أشعة" },
        { status: 403 }
      );
    }

    // استخراج بيانات الطلب
    const data = await req.json();
    const {
      title,
      description,
      resultDetails,
      reportText,
      patientId,
      testAssignmentId,
      imageUrl,
      pdfUrl,
    } = data;

    // التحقق من البيانات المطلوبة
    if (!title || !resultDetails || !patientId || !testAssignmentId) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة" },
        { status: 400 }
      );
    }

    // التحقق من وجود المريض وتعيين الفحص
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    const testAssignment = await prisma.testAssignment.findUnique({
      where: { id: testAssignmentId },
    });

    if (!patient || !testAssignment) {
      return NextResponse.json(
        { error: "المريض أو تعيين الفحص غير موجود" },
        { status: 404 }
      );
    }

    // إنشاء نتيجة أشعة جديدة
    const newRadiationResult = await prisma.radiationResult.create({
      data: {
        title,
        description,
        resultDetails,
        reportText,
        imageUrl,
        pdfUrl,
        patientId,
        testAssignmentId,
        createdById: payload.userId,
      },
    });

    // تحديث حالة تعيين الفحص إلى "مكتمل" إذا لم يكن كذلك بالفعل
    if (testAssignment.status !== "COMPLETED") {
      await prisma.testAssignment.update({
        where: { id: testAssignmentId },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json(newRadiationResult, { status: 201 });
  } catch (error) {
    console.error("Error creating radiation result:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء نتيجة الأشعة" },
      { status: 500 }
    );
  }
}
