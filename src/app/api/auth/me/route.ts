import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { verifyTokenWithSessionCheck } from "@/lib/auth/jwt";
import { handleAuthError } from "@/lib/auth/helpers";
import { prisma } from "@/lib/prisma";

// استعلام لبيانات المستخدم باستثناء البيانات الحساسة
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approved: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(request: NextRequest) {
  try {
    // الحصول على توكن المصادقة من هيدر Authorization (Bearer token)
    let token = request.headers.get("authorization")?.replace("Bearer ", "");

    // إذا لم يوجد توكن في الهيدر، نحاول الحصول عليه من الكوكيز
    if (!token) {
      token = request.cookies.get("auth-token")?.value;
    }

    if (!token) {
      return NextResponse.json(
        { message: "لم يتم توفير توكن المصادقة" },
        { status: 401 }
      );
    }

    console.log("Verifying token in /api/auth/me");
    const payload = await verifyTokenWithSessionCheck(token, prisma);

    if (!payload) {
      return NextResponse.json(
        {
          message:
            "توكن المصادقة غير صالح أو تم تغيير صلاحياتك. الرجاء تسجيل الدخول مرة أخرى.",
          errorType: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    // استعلام لبيانات المستخدم من قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "المستخدم غير موجود",
          errorType: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // التحقق من حالة الموافقة
    if (!user.approved) {
      return NextResponse.json(
        {
          message:
            "لم تتم الموافقة على حسابك بعد. يرجى الانتظار حتى يوافق المسؤول على حسابك",
          errorType: "USER_NOT_APPROVED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    // استخدام دالة handleAuthError للتعامل مع الأخطاء بشكل أفضل
    const { message, statusCode } = handleAuthError(error);
    return NextResponse.json(
      { message, errorType: "AUTH_ERROR" },
      { status: statusCode }
    );
  }
}
