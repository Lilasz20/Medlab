import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAndAuthorize, handleApiError } from "@/lib/auth/helpers";

// GET - الحصول على رقم الطابور التالي
export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // الحصول على تاريخ اليوم - في بداية اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // البحث عن آخر رقم في الطابور لليوم الحالي
    const latestQueueNumber = await prisma.queueNumber.findFirst({
      where: {
        date: {
          gte: today,
        },
      },
      orderBy: {
        number: "desc",
      },
      select: {
        number: true,
      },
    });

    // تحديد الرقم التالي (إذا لم يوجد أرقام، يبدأ من 1)
    const nextNumber = latestQueueNumber ? latestQueueNumber.number + 1 : 1;

    return NextResponse.json({
      nextNumber,
    });
  } catch (error) {
    return handleApiError(error, "الحصول على رقم الطابور التالي");
  }
}
