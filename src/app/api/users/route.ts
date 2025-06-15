import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

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
        { message: "غير مصرح لك بالوصول إلى هذه البيانات" },
        { status: 403 }
      );
    }

    // جلب قائمة المستخدمين
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: [
        { approved: "asc" }, // غير المعتمدين أولاً
        { createdAt: "desc" }, // ثم الأحدث
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء جلب بيانات المستخدمين" },
      { status: 500 }
    );
  }
}
