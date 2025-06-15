import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "./jwt";
import { prisma } from "@/lib/prisma";

// استخدام verifyToken البسيط في middleware أو verifyTokenWithSessionCheck في API endpoints
// يتم تحديد ذلك تلقائيًا استنادًا إلى بيئة التشغيل
const isEdgeRuntime =
  typeof process.env.NEXT_RUNTIME === "string" &&
  process.env.NEXT_RUNTIME === "edge";

/**
 * استخراج وتحقق من توكن المصادقة من طلب Next.js
 * يبحث في cookies و authorization header
 */
export async function extractAndVerifyToken(
  request: NextRequest
): Promise<{ payload: TokenPayload | null; error: NextResponse | null }> {
  // التحقق من المصادقة من cookies
  const token = request.cookies.get("auth-token")?.value;

  // فحص Authorization header إذا لم يكن هناك cookie
  const authHeader = !token ? request.headers.get("authorization") : null;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const finalToken = token || tokenFromHeader;

  if (!finalToken) {
    return {
      payload: null,
      error: NextResponse.json(
        { message: "الرجاء تسجيل الدخول أولاً" },
        { status: 401 }
      ),
    };
  }

  // التحقق من صلاحية التوكن - نستخدم التحقق البسيط في Edge Runtime
  try {
    // في Edge Runtime (middleware) لا نقوم بفحص نسخة الجلسة
    let payload = await verifyToken(finalToken);

    if (!payload) {
      return {
        payload: null,
        error: NextResponse.json(
          { message: "جلسة غير صالحة، الرجاء تسجيل الدخول مرة أخرى" },
          { status: 401 }
        ),
      };
    }

    return { payload, error: null };
  } catch (error) {
    console.error("Token verification error:", error);
    return {
      payload: null,
      error: NextResponse.json(
        { message: "حدث خطأ أثناء التحقق من المصادقة" },
        { status: 500 }
      ),
    };
  }
}

/**
 * التحقق من صلاحيات المستخدم
 */
export function checkRolePermission(
  payload: TokenPayload,
  allowedRoles: string[]
): NextResponse | null {
  if (!allowedRoles.includes(payload.role)) {
    return NextResponse.json(
      { message: "ليس لديك صلاحية للوصول إلى هذا المورد" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * معالجة الأخطاء في API بشكل متسق
 */
export function handleApiError(error: any, context: string): NextResponse {
  console.error(`Error in ${context}:`, error);

  // معالجة أخطاء Prisma المعروفة
  if (error.code === "P2002") {
    return NextResponse.json(
      { message: "هناك تكرار في البيانات المدخلة" },
      { status: 409 }
    );
  }

  if (error.code === "P2025") {
    return NextResponse.json(
      { message: "البيانات المطلوبة غير موجودة" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: `حدث خطأ أثناء ${context}`,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    },
    { status: 500 }
  );
}

/**
 * دالة مساعدة للتحقق من المصادقة والصلاحيات معاً
 */
export async function authenticateAndAuthorize(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ payload: TokenPayload | null; error: NextResponse | null }> {
  const { payload, error } = await extractAndVerifyToken(request);

  if (error) {
    return { payload: null, error };
  }

  if (!payload) {
    return {
      payload: null,
      error: NextResponse.json({ message: "جلسة غير صالحة" }, { status: 401 }),
    };
  }

  const permissionError = checkRolePermission(payload, allowedRoles);
  if (permissionError) {
    return { payload: null, error: permissionError };
  }

  return { payload, error: null };
}

export function handleAuthError(error: unknown): {
  message: string;
  statusCode: number;
} {
  console.error("Auth error:", error);

  // التحقق من نوع الخطأ وإرجاع رسالة مناسبة
  if (error instanceof Error) {
    if (error.message.includes("timeout")) {
      return {
        message:
          "فشل التحقق من الجلسة بسبب انتهاء المهلة، يرجى المحاولة مرة أخرى",
        statusCode: 401,
      };
    } else if (error.message.includes("invalid token")) {
      return {
        message: "توكن المصادقة غير صالح أو منتهي الصلاحية",
        statusCode: 401,
      };
    } else if (
      error.message.includes("not found") ||
      error.message.includes("no user")
    ) {
      return {
        message: "المستخدم غير موجود",
        statusCode: 404,
      };
    }
  }

  // رسالة خطأ افتراضية
  return {
    message: "حدث خطأ أثناء المصادقة",
    statusCode: 500,
  };
}
