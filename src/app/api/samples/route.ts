import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// نظام قفل بسيط لمنع المعالجة المتزامنة
const processingLocks = new Map<string, boolean>();

// GET /api/samples - Get all samples
export async function GET(request: NextRequest) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let userId;
    try {
      const decoded = await verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid token");
      }
      userId = decoded.userId;
    } catch (err) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const testAssignmentId = searchParams.get("testAssignmentId");

    // Build filter criteria
    const where: any = {};
    if (testAssignmentId) {
      where.testAssignmentId = testAssignmentId;
    }

    // Fetch samples with related data
    const samples = await prisma.sample.findMany({
      where,
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
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(samples);
  } catch (error) {
    console.error("Error fetching samples:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات العينات" },
      { status: 500 }
    );
  }
}

// POST /api/samples - Create a new sample
export async function POST(request: NextRequest) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let userId;
    try {
      const decoded = await verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid token");
      }
      userId = decoded.userId;
    } catch (err) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // Get request body
    const data = await request.json();
    const {
      testAssignmentId,
      notes,
      forceReplace,
      requestId = Date.now().toString(),
    } = data;

    if (!testAssignmentId) {
      return NextResponse.json(
        { error: "معرف تعيين الاختبار مطلوب" },
        { status: 400 }
      );
    }

    // التحقق من وجود قفل تجهيز - لمنع التنفيذ المتزامن لنفس الطلب
    if (processingLocks.get(testAssignmentId)) {
      return NextResponse.json(
        {
          error:
            "هناك عملية تسجيل جارية لهذا الفحص. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى",
          code: "PROCESSING_LOCKED",
        },
        { status: 429 }
      );
    }

    // قفل المعالجة لهذا الـ testAssignmentId
    processingLocks.set(testAssignmentId, true);

    try {
      // 1. التأكد من وجود الفحص والحصول على بيانات المريض
      const existingTestAssignment = await prisma.testAssignment.findUnique({
        where: { id: testAssignmentId },
        include: {
          patient: {
            select: {
              id: true,
              fileNumber: true,
            },
          },
        },
      });

      if (!existingTestAssignment) {
        return NextResponse.json(
          { error: "تعيين الاختبار غير موجود" },
          { status: 404 }
        );
      }

      // التأكد من وجود بيانات المريض
      if (!existingTestAssignment.patient) {
        return NextResponse.json(
          { error: "بيانات المريض غير متوفرة" },
          { status: 404 }
        );
      }

      // 2. التحقق من وجود عينات سابقة - خارج المعاملة
      const existingSamples = await prisma.sample.findMany({
        where: { testAssignmentId },
      });

      // إذا وجدت عينات سابقة ولم يتم طلب الاستبدال القسري، أرجع خطأ 409
      if (existingSamples.length > 0 && forceReplace !== true) {
        return NextResponse.json(
          {
            error: "توجد عينة مسجلة بالفعل لهذا الفحص",
            code: "SAMPLE_EXISTS",
            sampleCount: existingSamples.length,
          },
          { status: 409 }
        );
      }

      // 3. إنشاء رمز العينة بالتنسيق الجديد: S-{رقم ملف المريض}-{رقم تسلسلي}
      const patientFileNumber = existingTestAssignment.patient.fileNumber;

      // الحصول على العينات السابقة لهذا المريض لتحديد الرقم التسلسلي
      const patientSamples = await prisma.sample.findMany({
        where: {
          testAssignment: {
            patientId: existingTestAssignment.patient.id,
          },
        },
        orderBy: {
          collectedAt: "desc",
        },
      });

      // توليد رقم تسلسلي للعينة
      let sequenceNumber = 1;

      // البحث عن رمز العينة السابقة للمريض ومحاولة استخراج الرقم التسلسلي منه
      if (patientSamples.length > 0) {
        // البحث عن أعلى رقم تسلسلي موجود
        for (const sample of patientSamples) {
          const match = sample.sampleCode.match(/S-(.+)-(\d+)$/);
          if (match && match[2]) {
            const existingSequence = parseInt(match[2], 10);
            if (
              !isNaN(existingSequence) &&
              existingSequence >= sequenceNumber
            ) {
              sequenceNumber = existingSequence + 1;
            }
          }
        }
      }

      // إنشاء رمز العينة الجديد
      const sampleCode = `S-${patientFileNumber}-${sequenceNumber}`;

      // 4. تنفيذ المعاملة
      return await prisma.$transaction(async (tx) => {
        // حذف العينات الموجودة إذا كان هناك
        if (existingSamples.length > 0) {
          await tx.sample.deleteMany({
            where: { testAssignmentId },
          });
          console.log(
            `تم حذف ${existingSamples.length} عينات موجودة للفحص: ${testAssignmentId}`
          );
        }

        // إنشاء العينة الجديدة
        try {
          const sample = await tx.sample.create({
            data: {
              sampleCode,
              testAssignmentId,
              collectedById: userId,
              notes: notes || "",
            },
          });

          // تحديث حالة الفحص
          await tx.testAssignment.update({
            where: { id: testAssignmentId },
            data: { status: "SAMPLE_COLLECTED" },
          });

          return NextResponse.json({
            success: true,
            message: "تم تسجيل العينة بنجاح",
            sample,
          });
        } catch (createError: any) {
          console.error("خطأ في إنشاء العينة:", createError);

          // التعامل مع خطأ تكرار رمز العينة
          if (createError.code === "P2002") {
            // في حالة التكرار، زيادة الرقم التسلسلي وإعادة المحاولة
            const retrySampleCode = `S-${patientFileNumber}-${
              sequenceNumber + 1
            }`;

            try {
              // إعادة المحاولة
              const sample = await tx.sample.create({
                data: {
                  sampleCode: retrySampleCode,
                  testAssignmentId,
                  collectedById: userId,
                  notes: notes || "",
                },
              });

              // تحديث حالة الفحص
              await tx.testAssignment.update({
                where: { id: testAssignmentId },
                data: { status: "SAMPLE_COLLECTED" },
              });

              return NextResponse.json({
                success: true,
                message: "تم تسجيل العينة بنجاح (إعادة محاولة)",
                sample,
              });
            } catch (retryError: any) {
              console.error("فشل إعادة المحاولة:", retryError);
              throw new Error(
                "فشلت محاولة إنشاء العينة مرتين، يرجى المحاولة لاحقًا"
              );
            }
          }

          // أي خطأ آخر
          throw createError;
        }
      });
    } finally {
      // إزالة القفل بعد الانتهاء
      setTimeout(() => {
        processingLocks.delete(testAssignmentId);
      }, 2000); // نترك القفل لمدة ثانيتين لتجنب المحاولات المتتالية السريعة
    }
  } catch (error: any) {
    console.error("خطأ كامل في عملية إنشاء العينة:", error);

    // للأخطاء المتوقعة
    const errorMessage = error.message || "حدث خطأ أثناء تسجيل العينة";
    const errorCode = error.code || "UNKNOWN_ERROR";
    const errorDetails = error.meta ? JSON.stringify(error.meta) : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

// دالة لإنشاء رمز عينة فريد
async function generateUniqueSampleCode(
  patientPrefix: string
): Promise<string> {
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 1000);

  // الحصول على الرقم التسلسلي التالي
  let sequenceNumber = await getNextSequenceNumber();

  // إنشاء رمز العينة بتنسيق: S-{prefixمريض}-{رقم تسلسلي}
  return `S-${patientPrefix}-${sequenceNumber}`;
}

// دالة مساعدة للحصول على رقم تسلسلي جديد بطريقة آمنة للتزامن
async function getNextSequenceNumber(): Promise<number> {
  // استخدام المعاملة لتجنب مشكلات التزامن
  return await prisma.$transaction(async (tx) => {
    // 1. البحث عن أعلى رقم حالي
    const highestSample = await tx.sample.findFirst({
      orderBy: { id: "desc" },
    });

    // 2. إنشاء الرقم التسلسلي الجديد
    let nextNumber = 1;
    if (highestSample) {
      // الحصول على عدد كبير بما يكفي لتجنب التكرار
      nextNumber =
        (parseInt(highestSample.id.substring(0, 8), 16) % 10000) +
        Math.floor(Math.random() * 100) +
        1;
    }

    return nextNumber;
  });
}
