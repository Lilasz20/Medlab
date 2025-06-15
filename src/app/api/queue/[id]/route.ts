import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { RouteParams } from "@/types/route-handlers";

// PATCH /api/queue/[id] - تحديث حالة رقم انتظار
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams<{ id: string }>
) {
  try {
    // استخراج معرف رقم الانتظار من المعلمات
    const id = params.id;

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

    // التحقق من المعلمات
    if (!id) {
      return NextResponse.json(
        { error: "معرف رقم الانتظار مطلوب" },
        { status: 400 }
      );
    }

    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
    }

    // التحقق من وجود رقم الانتظار
    const queueNumber = await prisma.queueNumber.findUnique({
      where: { id },
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

    if (!queueNumber) {
      return NextResponse.json(
        { error: "رقم الانتظار غير موجود" },
        { status: 404 }
      );
    }

    // تحديث حالة رقم الانتظار
    const updatedQueueNumber = await prisma.queueNumber.update({
      where: { id },
      data: { status },
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
    if (!updatedQueueNumber.patient) {
      return NextResponse.json(
        { error: "لم يتم العثور على بيانات المريض" },
        { status: 500 }
      );
    }

    // تنسيق البيانات قبل إرجاعها
    const formattedQueue = {
      id: updatedQueueNumber.id,
      number: updatedQueueNumber.number,
      patientId: updatedQueueNumber.patientId,
      patientName: updatedQueueNumber.patient.name,
      fileNumber: updatedQueueNumber.patient.fileNumber,
      date: updatedQueueNumber.date,
      arrivalTime: new Date(updatedQueueNumber.date).toLocaleTimeString(
        "ar-SA",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      status: updatedQueueNumber.status,
    };

    return NextResponse.json(formattedQueue);
  } catch (error) {
    console.error("Error updating queue number:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث حالة رقم الانتظار" },
      { status: 500 }
    );
  }
}

// DELETE /api/queue/[id] - حذف رقم انتظار
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams<{ id: string }>
) {
  try {
    // استخراج معرف رقم الانتظار من المعلمات
    const id = params.id;

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

    // التحقق من المعلمات
    if (!id) {
      return NextResponse.json(
        { error: "معرف رقم الانتظار مطلوب" },
        { status: 400 }
      );
    }

    // التحقق من وجود رقم الانتظار
    const queueNumber = await prisma.queueNumber.findUnique({
      where: { id },
    });

    if (!queueNumber) {
      return NextResponse.json(
        { error: "رقم الانتظار غير موجود" },
        { status: 404 }
      );
    }

    // حذف رقم الانتظار
    await prisma.queueNumber.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting queue number:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف رقم الانتظار" },
      { status: 500 }
    );
  }
}
