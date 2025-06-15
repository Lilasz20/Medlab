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
        { message: "غير مصرح لك بإلغاء الموافقة على المستخدمين" },
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

    // التحقق من أن المستخدم ليس المسؤول الوحيد
    if (targetUser.role === "ADMIN") {
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
          { message: "لا يمكن إلغاء الموافقة على المسؤول الوحيد في النظام" },
          { status: 400 }
        );
      }
    }

    // إلغاء الموافقة على المستخدم
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        approved: false,
        sessionVersion: { increment: 1 },
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
        "تم إلغاء الموافقة على المستخدم بنجاح وإبطال جلساته. سيتم تسجيل خروجه تلقائيًا خلال الدقيقة القادمة.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error revoking user approval:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء إلغاء الموافقة على المستخدم" },
      { status: 500 }
    );
  }
}
