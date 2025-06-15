import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";

// GET - الحصول على تفاصيل مادة مخبرية محددة
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // التعامل مع params الذي قد يكون Promise
    const id = params instanceof Promise ? (await params).id : params.id;

    // التحقق من المصادقة
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
        { status: 401 }
      );
    }

    // التحقق من الصلاحيات (المدير وفني المختبر والمحاسب)
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "LAB_TECHNICIAN" &&
      payload.role !== "ACCOUNTANT"
    ) {
      console.log(
        "Access denied to material details API - User role:",
        payload.role
      );
      return NextResponse.json(
        { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
        { status: 403 }
      );
    } else {
      console.log(
        "Access granted to material details API - User role:",
        payload.role
      );
    }

    // التحقق من وجود معرف المادة
    if (!id) {
      return NextResponse.json(
        { message: "يجب توفير معرف المادة المخبرية" },
        { status: 400 }
      );
    }

    // الحصول على المادة المخبرية
    const material = await prisma.labMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      return NextResponse.json(
        { message: "لم يتم العثور على المادة المخبرية" },
        { status: 404 }
      );
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error("Error fetching lab material:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء استرجاع بيانات المادة المخبرية" },
      { status: 500 }
    );
  }
}
