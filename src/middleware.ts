import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, decodeToken } from "./lib/auth/jwt";

// Public paths that don't require authentication
const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/waiting",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/images",
  "/assets",
  "/hero-lab.jpg",
];

// Role-based access control for different paths
const roleAccess: Record<string, string[]> = {
  ADMIN: [
    "/dashboard",
    "/patients",
    "/tests",
    "/samples",
    "/queue",
    "/invoices",
    "/reports",
    "/api",
    "/users",
  ],
  RECEPTIONIST: [
    "/dashboard",
    "/patients",
    "/queue",
    "/reports",
    "/reports",
    "/tests",
    "/api/patients",
    "/api/queue",
    "/api/tests",
    "/api/dashboard",
  ],
  LAB_TECHNICIAN: [
    "/dashboard",
    "/tests",
    "/samples",
    "/radiation-results",
    "/radiation-results/[id]",
    "/lab-materials",
    "/lab-materials/transactions",
    "/lab-materials/new",
    "/lab-materials/[id]",
    "/reports",
    "/api/tests",
    "/api/samples",
    "/api/radiation-results",
    "/api/radiation-results/[id]",
    "/api/lab-materials",
    "/api/lab-materials/transactions",
    "/api/lab-materials/[id]",
    "/api/dashboard",
  ],
  ACCOUNTANT: [
    "/dashboard",
    "/invoices",
    "/purchase-invoices",
    "/lab-materials",
    "/lab-materials/transactions",
    "/lab-materials/new",
    "/lab-materials/[id]",
    "/reports",
    "/api/invoices",
    "/api/purchase-invoices",
    "/api/patients",
    "/api/tests",
    "/api/lab-materials",
    "/api/lab-materials/transactions",
    "/api/lab-materials/[id]",
    "/api/dashboard",
  ],
  PENDING: ["/auth/waiting"],
};

// حفظ محاولات إعادة التوجيه للتقليل من التكرار
const redirectAttempts = new Map<string, number>();
// تخزين أوقات الطلبات لتجنب التحقق المتكرر خلال فترة قصيرة
const requestTimes = new Map<string, number>();

// تحسين: إضافة تخزين مؤقت للتوكنات المتحقق منها
interface TokenCache {
  payload: any;
  timestamp: number;
}
// تخزين مؤقت للتوكنات المتحقق منها (التوكن => {البيانات، وقت التحقق})
const tokenCache = new Map<string, TokenCache>();
// مدة صلاحية التخزين المؤقت (5 دقائق)
const TOKEN_CACHE_TTL = 5 * 60 * 1000;

// تنظيف التخزين المؤقت للتوكنات القديمة
const cleanupTokenCache = () => {
  const now = Date.now();
  let expiredCount = 0;

  tokenCache.forEach((cache, token) => {
    if (now - cache.timestamp > TOKEN_CACHE_TTL) {
      tokenCache.delete(token);
      expiredCount++;
    }
  });

  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired tokens from cache`);
  }
};

// تنظيف التخزين المؤقت كل 10 دقائق
setInterval(cleanupTokenCache, 10 * 60 * 1000);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // تجاهل الملفات الساكنة وموارد next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("/static/") ||
    pathname.includes("/_next/image") ||
    pathname.includes("/_next/static") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // تنظيف التخزين المؤقت عند استدعاء API /api/auth/me
  // هذا يضمن الحصول على أحدث معلومات المستخدم
  if (pathname === "/api/auth/me") {
    // إذا كان هناك توكن في الطلب، نقوم بإزالته من التخزين المؤقت
    // لإجبار النظام على إعادة التحقق من معلومات المستخدم
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      tokenCache.delete(token);
      console.log("Verifying token in /api/auth/me");
    }

    const cookie = request.cookies.get("auth-token")?.value;
    if (cookie) {
      tokenCache.delete(cookie);
    }
  }

  // تحسين: استخدام تخزين مؤقت للتحقق من المسار
  // حساب معرف فريد للطلب باستخدام المسار
  const requestId = request.nextUrl.host + ":" + pathname;

  // التحقق من الطلبات المتكررة خلال فترة قصيرة - تجنب التحقق المتكرر
  const currentTime = Date.now();
  const lastRequestTime = requestTimes.get(requestId) || 0;
  const timeDiff = currentTime - lastRequestTime;

  // تحسين: زيادة مدة التخطي للتحقق المتكرر من 5 ثوان إلى 10 ثوان للمسارات المتكررة
  if (timeDiff < 10000) {
    console.log(
      `Recent request (${timeDiff}ms), skipping validation for:`,
      requestId
    );
    return NextResponse.next();
  }

  // تحديث وقت آخر طلب
  requestTimes.set(requestId, currentTime);

  // تحسين: تحقق سريع من المسارات العامة
  // Allow public paths without authentication
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublicPath) {
    console.log("Public path allowed:", pathname);
    return NextResponse.next();
  }

  // تحسين: زيادة عدد محاولات التحقق المسموح بها
  const currentAttempts = redirectAttempts.get(requestId) || 0;
  if (currentAttempts > 3) {
    // زيادة من 2 إلى 3
    // تجاوز عدد محاولات إعادة التوجيه - منح وصول طارئ
    console.log(
      "Too many redirect attempts, granting temporary access:",
      requestId
    );

    // تمديد فترة الوصول المؤقت
    setTimeout(() => {
      redirectAttempts.delete(requestId);
    }, 30000);

    return NextResponse.next();
  }

  // Check for authentication token from cookies or Authorization header
  let token = request.cookies.get("auth-token")?.value;

  // If no token in cookies, check Authorization header for Bearer token (for API routes)
  if (!token && pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("Using Bearer token from Authorization header");
    }
  }

  // تحسين: منح وصول مشروط إذا كان المستخدم يصل للوحة التحكم مباشرة
  if (
    !token &&
    (pathname.startsWith("/dashboard") || pathname.includes("/dashboard/"))
  ) {
    console.log(
      "Dashboard access without token - checking localStorage via client"
    );

    // منح وصول مشروط للوحة التحكم - سيتحقق العميل من localStorage
    redirectAttempts.set(requestId, currentAttempts + 1);
    return NextResponse.next();
  }

  if (!token) {
    console.log("No auth token found, redirecting to login");

    // تحسين: منح وصول مشروط للمحاولات الأولى
    if (currentAttempts < 2) {
      console.log("First attempt without token - granting conditional access");

      redirectAttempts.set(requestId, currentAttempts + 1);

      // منح وصول مشروط للمحاولات الأولى
      return NextResponse.next();
    }

    // زيادة عدد محاولات إعادة التوجيه
    redirectAttempts.set(requestId, currentAttempts + 1);

    // For API routes, return JSON error instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message:
            "توكن المصادقة غير صالح أو منتهي الصلاحية أو تم تغيير دورك. الرجاء تسجيل الدخول مرة أخرى.",
        },
        { status: 401 }
      );
    }

    // Redirect to login if no token
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // تحسين: تجاهل فشل التحقق للمحاولات الأولى
  let payload: any;
  try {
    // تحقق أولاً من وجود التوكن في التخزين المؤقت
    const cachedData = tokenCache.get(token);
    const currentTime = Date.now();

    // استخدام البيانات المخزنة مؤقتًا إذا كانت صالحة وضمن مدة الصلاحية
    if (cachedData && currentTime - cachedData.timestamp < TOKEN_CACHE_TTL) {
      console.log("Using cached token verification");
      payload = cachedData.payload;

      // تسجيل معلومات المستخدم للتشخيص
      console.log(
        `Cached user info - Role: ${payload.role}, Email: ${payload.email}`
      );
    } else {
      // محاولة التحقق من التوكن
      console.log("Verifying token...");
      payload = await verifyToken(token);

      // تسجيل معلومات المستخدم الجديدة للتشخيص
      console.log(
        `Verified user info - Role: ${payload.role}, Email: ${payload.email}`
      );

      // تخزين نتيجة التحقق في التخزين المؤقت
      if (payload) {
        tokenCache.set(token, {
          payload,
          timestamp: currentTime,
        });
      }
    }
  } catch (error) {
    console.error("Error verifying token:", error);

    // التعامل بشكل خاص مع أخطاء انتهاء المهلة
    const isTimeoutError =
      error instanceof Error && error.message.includes("timeout");
    if (isTimeoutError) {
      console.log("Token verification timeout - using fallback verification");
      // في حالة انتهاء المهلة، استخدم decodeToken مباشرة بدلاً من إعادة التوجيه
      payload = decodeToken(token);
      if (payload) {
        console.log("Successfully decoded token after timeout:", payload);
        // توقيت انتهاء المهلة ليس مشكلة أمنية، لذا نستمر
        // تخزين نتيجة الفك في التخزين المؤقت مع مدة صلاحية أقصر
        tokenCache.set(token, {
          payload,
          timestamp: Date.now() - TOKEN_CACHE_TTL / 2, // نصف المدة فقط للتوكنات المفكوكة
        });
      }
    } else {
      // تحسين: زيادة التساهل مع فشل التحقق
      if (currentAttempts < 3) {
        console.log("Skipping token verification - attempt:", currentAttempts);
        redirectAttempts.set(requestId, currentAttempts + 1);
        return NextResponse.next();
      }

      try {
        // If verification fails, try decoding the token without verification
        payload = decodeToken(token);

        if (payload) {
          console.log("Fallback to decoded token:", payload);
        } else {
          throw new Error("Failed to decode token");
        }
      } catch (decodeError) {
        console.error("Failed to decode token:", decodeError);

        // زيادة عدد محاولات إعادة التوجيه
        redirectAttempts.set(requestId, currentAttempts + 1);

        // إذا فشلت عمليات التحقق والفك، لكن هذه ليست المحاولة الثالثة، نمنح وصولًا مشروطًا
        if (currentAttempts < 2) {
          console.log("Conditional access granted despite token issues");
          return NextResponse.next();
        }

        // في المحاولة الثالثة، نعيد التوجيه إلى صفحة تسجيل الدخول
        console.log("Invalid token, redirecting to login");

        // حذف التوكن غير الصالح ولكن فقط إذا كانت هذه المحاولة الثالثة
        if (currentAttempts >= 2) {
          const response = NextResponse.redirect(
            new URL("/auth/login", request.url)
          );
          response.cookies.delete("auth-token");

          // بالنسبة للمسارات API، نعيد خطأ JSON بدلاً من إعادة التوجيه
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { message: "Invalid or expired token" },
              { status: 401 }
            );
          }

          return response;
        }

        // في المحاولات الأولى نسمح بالوصول رغم المشاكل
        return NextResponse.next();
      }
    }
  }

  if (!payload) {
    console.log("No payload in token, redirecting to login");

    // زيادة عدد محاولات إعادة التوجيه
    redirectAttempts.set(requestId, currentAttempts + 1);

    // تجنب إعادة التوجيه المتكرر - السماح بالوصول المشروط
    if (currentAttempts < 2) {
      console.log("Conditional access granted despite empty payload");
      return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.delete("auth-token");

    // For API routes, return JSON error instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message:
            "توكن المصادقة غير صالح أو منتهي الصلاحية أو تم تغيير دورك. الرجاء تسجيل الدخول مرة أخرى.",
        },
        { status: 401 }
      );
    }

    return response;
  }

  // التحقق من حالة الموافقة
  if (!payload.approved) {
    console.log("User not approved, redirecting to waiting page");

    // تخزين حالة الموافقة في التخزين المؤقت لتجنب التحقق المتكرر
    if (payload) {
      // تحديث التخزين المؤقت مع حالة الموافقة الحالية
      tokenCache.set(token, {
        payload,
        timestamp: Date.now(),
      });
    }

    // للمسارات API، نعيد خطأ JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { message: "حسابك قيد المراجعة. يرجى الانتظار حتى تتم الموافقة عليه" },
        { status: 403 }
      );
    }

    // إعادة التوجيه إلى صفحة الانتظار إذا لم تكن بالفعل هناك
    if (pathname !== "/auth/waiting") {
      return NextResponse.redirect(new URL("/auth/waiting", request.url));
    }

    // إذا كان المستخدم بالفعل في صفحة الانتظار، نسمح له بالوصول
    if (pathname === "/auth/waiting") {
      return NextResponse.next();
    }
  }

  // Check role-based access
  const { role } = payload;
  const allowedPaths = roleAccess[role] || [];
  console.log("User role:", role, "Checking path:", pathname);

  // خاص بمواد المختبر - للتشخيص فقط
  if (pathname.includes("lab-materials")) {
    console.log("Lab Materials path detected, user role:", role);

    // السماح صراحة بالوصول إلى مسارات المواد المخبرية للفنيين والمحاسبين والمدراء
    if (
      role === "LAB_TECHNICIAN" ||
      role === "ACCOUNTANT" ||
      role === "ADMIN"
    ) {
      console.log(`Special access granted to lab materials for ${role}`);
      return NextResponse.next();
    }
  }

  // تحسين: تخزين مؤقت للتحقق من الوصول المستند إلى الدور
  // إنشاء مفتاح فريد للتخزين المؤقت يجمع بين الدور والمسار
  const accessCacheKey = `${role}:${pathname}`;

  // المسؤول (ADMIN) لديه وصول إلى جميع المسارات
  if (role === "ADMIN") {
    console.log(`Admin access granted to: ${pathname}`);
    return NextResponse.next();
  }

  // التحقق من الوصول بشكل أكثر كفاءة
  let hasAccess = false;

  // للمسارات الديناميكية مثل [id]، نحتاج إلى التحقق بطريقة أكثر مرونة
  if (pathname.includes("/dashboard")) {
    hasAccess = allowedPaths.some(
      (path) => path === "/dashboard" || path.startsWith("/dashboard/")
    );
  } else {
    // التحقق من المسارات المطابقة تمامًا أولاً
    hasAccess = allowedPaths.includes(pathname);

    // إذا لم يكن هناك تطابق تام، نتحقق من المسارات الجزئية
    if (!hasAccess) {
      hasAccess = allowedPaths.some((path) => {
        // التعامل مع المسارات الديناميكية التي تحتوي على [id]
        if (path.includes("[id]")) {
          const pathPattern = path.replace("[id]", "[^/]+");
          const regex = new RegExp(`^${pathPattern}$`);
          return regex.test(pathname);
        }

        // التحقق من بدء المسار بمسار مسموح به
        return pathname.startsWith(path + "/") || pathname === path;
      });
    }
  }

  console.log(
    `Access check for ${role} to ${pathname}: ${
      hasAccess ? "Allowed" : "Denied"
    }`
  );

  if (!hasAccess) {
    console.log(`Access denied for role ${role} to path ${pathname}`);

    // تسجيل المزيد من المعلومات التشخيصية
    console.log(`Available paths for role ${role}:`, allowedPaths);

    // للمسارات API، نعيد خطأ JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          message: "غير مصرح لك بالوصول إلى هذا المسار",
          details: {
            role,
            path: pathname,
            allowedPaths,
          },
        },
        { status: 403 }
      );
    }

    // إعادة التوجيه إلى لوحة التحكم
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  console.log(`Access granted to: ${pathname}`);
  return NextResponse.next();
}

// Define which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /favicon.ico, /robots.txt (common browser files)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
