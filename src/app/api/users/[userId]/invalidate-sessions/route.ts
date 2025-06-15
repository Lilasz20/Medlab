import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

export async function POST(
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

    // التحقق من صلاحيات المستخدم (يجب أن يكون مسؤول أو نفس المستخدم)
    if (payload.role !== "ADMIN" && payload.userId !== userId) {
      return NextResponse.json(
        { message: "غير مصرح لك بإبطال جلسات هذا المستخدم" },
        { status: 403 }
      );
    }

    // التحقق من وجود المستخدم
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // تعديل حقل sessionVersion في قاعدة البيانات
    // هذا الحقل سيكون بمثابة علامة للتحقق من صلاحية الجلسات
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        sessionVersion: { increment: 1 }, // زيادة نسخة الجلسة
      },
      select: {
        id: true,
        name: true,
        email: true,
        sessionVersion: true,
      },
    });

    return NextResponse.json({
      message: "تم إبطال جميع جلسات المستخدم بنجاح",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error invalidating user sessions:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء إبطال جلسات المستخدم" },
      { status: 500 }
    );
  }
}
