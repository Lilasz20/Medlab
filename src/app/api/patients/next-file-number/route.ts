import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - استرجاع الرقم التسلسلي التالي لملف المريض
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

    // التحقق من الصلاحيات (يمكن للمدير وموظف الاستقبال فقط)
    if (payload.role !== "ADMIN" && payload.role !== "RECEPTIONIST") {
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    }

    // البحث عن آخر رقم ملف في قاعدة البيانات
    const patients = await prisma.patient.findMany({
      select: {
        fileNumber: true,
      },
      orderBy: {
        fileNumber: "desc",
      },
    });

    let nextNumber = 1; // الافتراضي هو PT-1

    // استخراج جميع الأرقام المستخدمة حالياً
    const usedNumbers = new Set<number>();

    patients.forEach((patient) => {
      const match = patient.fileNumber.match(/PT-(\d+)/);
      if (match && match[1]) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    // إيجاد أول رقم غير مستخدم
    if (usedNumbers.size > 0) {
      // البحث عن أعلى رقم وإضافة 1
      const maxNumber = Math.max(...Array.from(usedNumbers));
      nextNumber = maxNumber + 1;

      // التأكد من أن الرقم الجديد غير مستخدم
      while (usedNumbers.has(nextNumber)) {
        nextNumber++;
      }
    }

    // تنسيق رقم الملف الجديد
    const nextFileNumber = `PT-${nextNumber}`;

    // التأكد من أن الرقم الجديد غير مستخدم بالفعل
    const existingPatient = await prisma.patient.findUnique({
      where: { fileNumber: nextFileNumber },
    });

    // إذا كان الرقم مستخدماً بالفعل، نبحث عن الرقم التالي المتاح
    if (existingPatient) {
      let alternativeNumber = nextNumber + 1;
      let alternativeFileNumber = `PT-${alternativeNumber}`;

      // البحث عن أول رقم غير مستخدم
      while (
        await prisma.patient.findUnique({
          where: { fileNumber: alternativeFileNumber },
        })
      ) {
        alternativeNumber++;
        alternativeFileNumber = `PT-${alternativeNumber}`;
      }

      return NextResponse.json({
        nextFileNumber: alternativeFileNumber,
        message: "تم توليد رقم ملف بديل لأن الرقم الأصلي مستخدم بالفعل",
      });
    }

    return NextResponse.json({
      nextFileNumber,
    });
  } catch (error) {
    console.error("Error generating next file number:", error);
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء توليد رقم الملف التالي",
        nextFileNumber: "PT-1", // قيمة افتراضية في حالة الخطأ
      },
      { status: 500 }
    );
  }
}
