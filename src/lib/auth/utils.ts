import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

/**
 * التحقق من مصادقة المستخدم باستخدام توكن
 * يستخدم في واجهات API لضمان مصادقة المستخدم
 */
export async function verifyAuth(request: NextRequest) {
  try {
    // Check for authentication token from cookies or Authorization header
    let token = request.cookies.get("auth-token")?.value;

    // If no token in cookies, check Authorization header for Bearer token
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return { userId: null, role: null };
    }

    // Verify the token
    const payload = await verifyToken(token);

    if (!payload) {
      return { userId: null, role: null };
    }

    // Return user ID and role from payload
    return {
      userId: payload.userId,
      role: payload.role,
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { userId: null, role: null };
  }
}
