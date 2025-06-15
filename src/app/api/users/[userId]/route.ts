import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { RouteParams } from "@/types/route-handlers";

// DELETE /api/users/[userId] - حذف مستخدم
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams<{ userId: string }>
) {
  try {
    const { userId } = params;
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
        { message: "غير مصرح لك بحذف المستخدمين" },
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

    // منع حذف المستخدم الحالي
    if (userId === payload.userId) {
      return NextResponse.json(
        { message: "لا يمكنك حذف حسابك الخاص" },
        { status: 400 }
      );
    }

    // التحقق من أن المستخدم ليس المسؤول الوحيد إذا كان مسؤولاً
    if (targetUser.role === "ADMIN" && targetUser.approved) {
      const adminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          approved: true,
          NOT: {
            id: userId,
          },
        },
      });

      if (adminCount === 0) {
        return NextResponse.json(
          { message: "لا يمكن حذف المسؤول الوحيد في النظام" },
          { status: 400 }
        );
      }
    }

    // حذف المستخدم
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "تم حذف المستخدم بنجاح",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء حذف المستخدم" },
      { status: 500 }
    );
  }
}
