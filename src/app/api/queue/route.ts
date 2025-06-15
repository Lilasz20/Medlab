import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET /api/queue - جلب قائمة الانتظار ليوم محدد
export async function GET(request: NextRequest) {
  try {
    // التحقق من صلاحية التوكن
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

    // الحصول على التاريخ من معلمات الطلب
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // تحديد تاريخ اليوم إذا لم يتم توفير تاريخ
    let date = new Date();
    if (dateParam) {
      date = new Date(dateParam);
    }

    // ضبط التاريخ ليبدأ من الساعة 00:00:00
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // ضبط التاريخ لينتهي عند الساعة 23:59:59
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // الحصول على قائمة الانتظار ليوم محدد
    const queueNumbers = await prisma.queueNumber.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fileNumber: true,
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    // تنسيق البيانات قبل إرجاعها
    const formattedQueue = queueNumbers.map((q) => {
      // التحقق من وجود بيانات المريض
      if (!q.patient) {
        return {
          id: q.id,
          number: q.number,
          patientId: q.patientId,
          patientName: "غير معروف",
          fileNumber: "غير معروف",
          date: q.date,
          arrivalTime: new Date(q.date).toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: q.status,
        };
      }

      return {
        id: q.id,
        number: q.number,
        patientId: q.patientId,
        patientName: q.patient.name,
        fileNumber: q.patient.fileNumber,
        date: q.date,
        arrivalTime: new Date(q.date).toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: q.status,
      };
    });

    return NextResponse.json(formattedQueue);
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات قائمة الانتظار" },
      { status: 500 }
    );
  }
}

// POST /api/queue - إضافة مريض إلى قائمة الانتظار
export async function POST(request: NextRequest) {
  try {
    // التحقق من صلاحية التوكن
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

    // الحصول على البيانات من الطلب
    const { patientId } = await request.json();

    if (!patientId) {
      return NextResponse.json({ error: "معرف المريض مطلوب" }, { status: 400 });
    }

    // التحقق من وجود المريض
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
    }

    // التحقق من عدم وجود رقم انتظار للمريض في نفس اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingQueueNumber = await prisma.queueNumber.findFirst({
      where: {
        patientId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingQueueNumber) {
      return NextResponse.json(
        { error: "المريض لديه رقم انتظار مسجل بالفعل اليوم" },
        { status: 409 }
      );
    }

    // الحصول على أعلى رقم في قائمة الانتظار لهذا اليوم
    const highestNumber = await prisma.queueNumber.findFirst({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        number: "desc",
      },
    });

    // تحديد الرقم التالي
    const nextNumber = highestNumber ? highestNumber.number + 1 : 1;

    // إنشاء رقم انتظار جديد
    const queueNumber = await prisma.queueNumber.create({
      data: {
        number: nextNumber,
        patientId,
        date: new Date(),
        status: "WAITING",
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fileNumber: true,
          },
        },
      },
    });

    // التحقق من وجود بيانات المريض
    if (!queueNumber.patient) {
      return NextResponse.json(
        { error: "لم يتم العثور على بيانات المريض" },
        { status: 500 }
      );
    }

    // تنسيق البيانات قبل إرجاعها
    const formattedQueue = {
      id: queueNumber.id,
      number: queueNumber.number,
      patientId: queueNumber.patientId,
      patientName: queueNumber.patient.name,
      fileNumber: queueNumber.patient.fileNumber,
      date: queueNumber.date,
      arrivalTime: new Date(queueNumber.date).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: queueNumber.status,
    };

    return NextResponse.json(formattedQueue);
  } catch (error) {
    console.error("Error adding patient to queue:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة المريض إلى قائمة الانتظار" },
      { status: 500 }
    );
  }
}
