import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    if (!userId) {
      return NextResponse.json(
        { message: "معرف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // الحصول على توكن المصادقة
    let token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      token = request.cookies.get("auth-token")?.value;
    }

    if (!token) {
      return NextResponse.json(
        { message: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    // التحقق من صحة التوكن
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { message: "توكن المصادقة غير صالح" },
        { status: 401 }
      );
    }

    // التحقق من صلاحيات المستخدم (يجب أن يكون مسؤول)
    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { message: "غير مصرح لك بتغيير أدوار المستخدمين" },
        { status: 403 }
      );
    }

    // التحقق من وجود المستخدم المطلوب تغيير دوره
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // الحصول على الدور الجديد من الطلب
    const { role } = await request.json();
    if (!role) {
      return NextResponse.json(
        { message: "الدور الجديد مطلوب" },
        { status: 400 }
      );
    }

    // التحقق من أن الدور صالح
    const validRoles = [
      "ADMIN",
      "RECEPTIONIST",
      "LAB_TECHNICIAN",
      "ACCOUNTANT",
      "PENDING",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "الدور المحدد غير صالح" },
        { status: 400 }
      );
    }

    // تحديث دور المستخدم وزيادة رقم نسخة الجلسة لإبطال الجلسات القديمة
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        sessionVersion: { increment: 1 }, // زيادة نسخة الجلسة لإبطال جميع الجلسات القديمة
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
        sessionVersion: true,
      },
    });

    return NextResponse.json({
      message:
        "تم تغيير دور المستخدم بنجاح وإبطال جلساته القديمة. سيتم تسجيل خروجه تلقائيًا خلال الدقيقة القادمة.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تغيير دور المستخدم" },
      { status: 500 }
    );
  }
}
