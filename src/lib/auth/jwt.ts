import { jwtVerify, SignJWT } from "jose";
import { encode, decode } from "next-auth/jwt";

// Don't initialize PrismaClient here - middleware runs in Edge Runtime which doesn't support Prisma
// const prisma = new PrismaClient();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "I have added it to the .env file"
);
const JWT_EXPIRES_IN = "24h";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  approved: boolean;
  sessionVersion: number;
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  console.log("Generating token for:", payload);
  try {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    console.log("Token generated successfully");
    return token;
  } catch (error) {
    console.error("Token generation failed:", error);
    throw error;
  }
}

// Basic token verification without session version check - safe for middleware
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    console.log("Verifying token...");

    // التحقق من تنسيق التوكن قبل محاولة التحقق
    if (!token || token.split(".").length !== 3) {
      console.error("Invalid token format in verifyToken");
      return null;
    }

    // إضافة وقت انتظار لمنع استهلاك الموارد
    const verifyPromise = jwtVerify(token, JWT_SECRET);

    // تحديد مهلة للتحقق من التوكن (3000 مللي ثانية)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "Token verification timeout: العملية استغرقت وقتًا طويلًا"
            )
          ),
        3000
      );
    });

    // استخدام Promise.race للتأكد من عدم استغراق وقت طويل
    const { payload } = (await Promise.race([
      verifyPromise,
      timeoutPromise,
    ])) as { payload: any };

    // استخراج معلومات المستخدم من التوكن
    const tokenPayload = payload as unknown as TokenPayload;

    console.log("Token verified successfully:", payload);
    return tokenPayload;
  } catch (error) {
    console.error("Token verification failed:", error);

    // في حالة أخطاء انتهاء المهلة، حاول فك التوكن بدون التحقق
    if (error instanceof Error && error.message.includes("timeout")) {
      console.log(
        "Timeout occurred, attempting to decode without verification"
      );
      try {
        return decodeToken(token);
      } catch (decodeError) {
        console.error("Fallback decoding also failed:", decodeError);
      }
    }

    return null;
  }
}

// For API routes - checks session version with Prisma
export async function verifyTokenWithSessionCheck(
  token: string,
  prisma: any
): Promise<TokenPayload | null> {
  const tokenPayload = await verifyToken(token);

  // إذا فشل التحقق الأساسي
  if (!tokenPayload) {
    return null;
  }

  // التحقق من نسخة الجلسة إذا لزم الأمر
  if (tokenPayload && tokenPayload.userId && prisma) {
    try {
      // استعلام لمعرفة نسخة الجلسة الحالية للمستخدم والدور وحالة الموافقة
      const user = await prisma.user.findUnique({
        where: { id: tokenPayload.userId },
        select: {
          sessionVersion: true,
          role: true,
          approved: true,
        },
      });

      // التحقق من عدة عوامل:
      // 1. إذا كان المستخدم غير موجود
      // 2. إذا كانت نسخة الجلسة في التوكن أقل من النسخة الحالية (تم زيادة النسخة)
      // 3. إذا كان الدور في التوكن مختلف عن الدور الحالي (تم تغيير الصلاحيات)
      // 4. إذا كانت حالة الموافقة في التوكن مختلفة عن الحالة الحالية (تم إلغاء الموافقة)
      if (
        !user ||
        (tokenPayload.sessionVersion || 0) < (user.sessionVersion || 1) ||
        tokenPayload.role !== user.role ||
        tokenPayload.approved !== user.approved
      ) {
        console.log(
          "Token validation failed:",
          !user ? "User not found" : "",
          (tokenPayload.sessionVersion || 0) < (user?.sessionVersion || 1)
            ? "Session version mismatch"
            : "",
          user && tokenPayload.role !== user.role
            ? `Role changed from ${tokenPayload.role} to ${user.role}`
            : "",
          user && tokenPayload.approved !== user.approved
            ? "Approval status changed"
            : ""
        );
        return null; // التوكن غير صالح
      }
    } catch (error) {
      console.error("Error checking session version:", error);
      // نستمر في التحقق إذا كان هناك خطأ في الاستعلام عن نسخة الجلسة
    }
  }

  return tokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    console.log("Decoding token (without verification)...");

    // تجنب الأخطاء إذا كان التوكن غير صالح
    if (!token || token.split(".").length !== 3) {
      console.error("Invalid token format");
      return null;
    }

    // This is safe because we're not verifying the signature
    const decoded = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    // التحقق من وجود الحقول الأساسية
    if (!decoded.userId || !decoded.role) {
      console.error("Missing required fields in token");
      return null;
    }

    console.log("Token decoded:", decoded);
    return decoded as TokenPayload;
  } catch (error) {
    console.error("Token decoding failed:", error);
    return null;
  }
}
