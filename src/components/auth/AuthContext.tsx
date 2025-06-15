"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { AuthContextType, LoginRequest, RegisterRequest, User } from "@/types";

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  token: undefined,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | undefined>(undefined);
  const router = useRouter();
  const [redirectedToLogin, setRedirectedToLogin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0);

  // تعريف مرحلة التركيب لتجنب مشاكل hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // تحسين عملية التحقق من الجلسة
  useEffect(() => {
    // نتجنب أي عمليات قبل التركيب
    if (!mounted) return;

    const checkUserSession = async () => {
      try {
        // إعادة تعيين العداد
        setSessionCheckAttempts((prev) => prev + 1);

        // دائمًا التحقق من localStorage أولاً - تحسين للحفاظ على الجلسة
        const savedToken = localStorage.getItem("auth-token");
        const savedUser = localStorage.getItem("user-data");
        const cookieToken = Cookies.get("auth-token");

        // استخدام أفضل مصدر متاح للتوكن
        const authToken = cookieToken || savedToken;

        // تسجيل أقل للمعلومات في وضع التطوير فقط
        if (process.env.NODE_ENV === "development") {
          console.log(
            "Auth check - Cookie token:",
            cookieToken ? "Found" : "Not found",
            "Local storage token:",
            savedToken ? "Found" : "Not found"
          );
        }

        // إذا لم يوجد توكن على الإطلاق
        if (!authToken) {
          if (process.env.NODE_ENV === "development") {
            console.log("No auth token found");
          }
          setUser(null);
          setToken(undefined);
          setIsLoading(false);
          return;
        }

        // إذا كان التوكن متوفر، نستخدمه دون إعادة تقديم (re-render) إلا عند الضرورة
        if (token !== authToken) {
          setToken(authToken);
        }

        // إذا كان لدينا بيانات مستخدم في localStorage، نستخدمها مؤقتًا
        if (savedUser && !user) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (process.env.NODE_ENV === "development") {
              console.log(
                "Temporarily using saved user data:",
                parsedUser.name
              );
            }
            setUser(parsedUser);
          } catch (e) {
            console.error("Failed to parse saved user data");
          }
        }

        // التأكد من وجود التوكن في الكوكيز بطريقة غير مؤثرة على الواجهة
        if (!cookieToken && savedToken) {
          if (process.env.NODE_ENV === "development") {
            console.log("Restoring token to cookie from localStorage");
          }
          Cookies.set("auth-token", savedToken, {
            expires: 7,
            path: "/",
            sameSite: "lax",
          });
        }

        // تجنب طلبات API المتكررة إذا أعيد تحميل الصفحة عدة مرات في فترة قصيرة
        const lastCheck = parseInt(
          localStorage.getItem("last-session-check") || "0"
        );
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheck;

        // زيادة المدة بين عمليات التحقق للحد من تأثيرها على الواجهة
        // إذا تم التحقق في آخر 20 ثوانٍ (بدلاً من 10) وكان لدينا بيانات مستخدم مخزنة، نستخدمها ونتجنب طلب API
        if (
          timeSinceLastCheck < 20000 &&
          savedUser &&
          sessionCheckAttempts > 1
        ) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "Using cached session data - last check was",
              Math.round(timeSinceLastCheck / 1000),
              "seconds ago"
            );
          }
          try {
            const parsedUser = JSON.parse(savedUser);
            // تجنب إعادة التقديم إذا كانت البيانات متطابقة
            if (JSON.stringify(parsedUser) !== JSON.stringify(user)) {
              setUser(parsedUser);
            }
            setIsLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing cached user data");
          }
        }

        // حفظ وقت آخر تحقق
        localStorage.setItem("last-session-check", now.toString());

        // التحقق من صلاحية الجلسة عبر API
        if (process.env.NODE_ENV === "development") {
          console.log(
            "Verifying session with API using token:",
            authToken.substring(0, 15) + "..."
          );
        }

        try {
          // استخدام AbortController لإلغاء الطلب إذا استغرق وقتًا طويلاً
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // مهلة 8 ثوانٍ

          const response = await fetch("/api/auth/me", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            cache: "no-store",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const userData = await response.json();
            if (process.env.NODE_ENV === "development") {
              console.log("Session verified successfully:", userData.name);
            }

            // تحديث بيانات المستخدم والتوكن فقط إذا كانت مختلفة عن الحالية
            if (JSON.stringify(userData) !== JSON.stringify(user)) {
              setUser(userData);
              localStorage.setItem("user-data", JSON.stringify(userData));
            }

            localStorage.setItem("auth-token", authToken);

            // تحديث التوكن في الكوكيز
            Cookies.set("auth-token", authToken, {
              expires: 7,
              path: "/",
              sameSite: "lax",
            });
          } else {
            console.warn("API session check failed, status:", response.status);
            // لا نقوم بإزالة الجلسة هنا - نعتمد على البيانات المخزنة محليًا

            // فقط إذا لم يكن لدينا بيانات مستخدم محلية أو فشلت محاولات متعددة
            if (!savedUser || sessionCheckAttempts > 3) {
              console.error("Session recovery failed after multiple attempts");
              // استخدام معرف ثابت لتجنب تكرار الرسائل
              toast.error(
                "انتهت صلاحية جلستك أو تم تغيير صلاحياتك. الرجاء تسجيل الدخول مرة أخرى.",
                { id: "session-invalid" }
              );
              handleInvalidSession();
            }
          }
        } catch (error) {
          // التعامل مع أخطاء مهلة الطلب بشكل أكثر سلاسة
          if (error instanceof DOMException && error.name === "AbortError") {
            console.warn("Session verification request timed out");
            // استمر باستخدام البيانات المحلية إذا كانت متوفرة
            if (savedUser) {
              return; // تخطي الخطأ واستمر
            }
          }

          console.error("Error checking session with API:", error);
          // في حالة خطأ شبكة، نستمر باستخدام البيانات المحلية إذا كانت متوفرة
          if (!savedUser && sessionCheckAttempts > 2) {
            handleInvalidSession();
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // دالة لمعالجة الجلسة غير الصالحة - تستخدم فقط بعد عدة محاولات فاشلة
    const handleInvalidSession = () => {
      console.log("Handling invalid session");
      // استخدام دالة logout لإخراج المستخدم بدلاً من تكرار نفس المنطق
      logout(true, "انتهت صلاحية جلستك. الرجاء تسجيل الدخول مرة أخرى.");
    };

    checkUserSession();
  }, [mounted]); // نزيل router.pathname لأنه غير موجود في Next.js 13+

  // Login handler - تحسين بإضافة حفظ بيانات في localStorage
  const login = async (data: LoginRequest) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل تسجيل الدخول");
      }

      const { user, token } = await response.json();

      // حفظ التوكن وبيانات المستخدم
      Cookies.set("auth-token", token, {
        expires: 7,
        path: "/",
        sameSite: "lax",
      });

      // تخزين احتياطي في localStorage
      localStorage.setItem("user-data", JSON.stringify(user));
      localStorage.setItem("auth-token", token);
      localStorage.setItem("last-session-check", Date.now().toString());

      setUser(user);
      setToken(token);
      // إعادة تعيين حالة إعادة التوجيه
      setRedirectedToLogin(false);
      // إعادة تعيين عداد محاولات التحقق
      setSessionCheckAttempts(0);

      toast.success("تم تسجيل الدخول بنجاح", { id: "login-success" });

      // Get the redirect path
      const redirectPath = getRoleBasedPath(user.role);
      console.log("Redirecting to:", redirectPath, "for role:", user.role);

      // إعطاء وقت كافي للتحديث
      setTimeout(() => {
        router.push(redirectPath);
      }, 300);
    } catch (error: any) {
      toast.error(error.message || "فشل تسجيل الدخول", { id: "login-error" });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async (data: RegisterRequest) => {
    setIsLoading(true);

    try {
      console.log("Registering user with data:", data);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Registration API error:", errorData);
        throw new Error(errorData.message || "فشل إنشاء الحساب");
      }

      const responseData = await response.json();
      console.log("Registration successful:", responseData);

      // لا نحفظ التوكن أو بيانات المستخدم بعد التسجيل
      // بدلاً من ذلك سيقوم المستخدم بتسجيل الدخول

      // نقوم بإزالة التوكن وبيانات المستخدم إذا كانت موجودة
      Cookies.remove("auth-token");
      localStorage.removeItem("user-data");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("last-session-check");

      setUser(null);
      setToken(undefined);

      // إذا كان المستخدم هو المسؤول الأول، نقوم بتسجيل الدخول تلقائيًا
      if (responseData.user.approved && responseData.user.role === "ADMIN") {
        // حفظ التوكن وبيانات المستخدم
        Cookies.set("auth-token", responseData.token, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });

        // تخزين احتياطي في localStorage
        localStorage.setItem("user-data", JSON.stringify(responseData.user));
        localStorage.setItem("auth-token", responseData.token);
        localStorage.setItem("last-session-check", Date.now().toString());

        setUser(responseData.user);
        setToken(responseData.token);

        toast.success("تم إنشاء حساب المسؤول الأول بنجاح", {
          id: "admin-register-success",
        });

        // توجيه المستخدم إلى لوحة التحكم
        setTimeout(() => {
          router.push("/dashboard");
        }, 300);
      } else {
        toast.success(
          responseData.message ||
            "تم إنشاء الحساب بنجاح! الرجاء انتظار موافقة المسؤول",
          { id: "register-success" }
        );

        // توجيه المستخدم إلى صفحة تسجيل الدخول مع إضافة معلمة registered=true
        setTimeout(() => {
          router.push("/auth/login?registered=true");
        }, 300);
      }
    } catch (error: any) {
      toast.error(error.message || "فشل إنشاء الحساب", {
        id: "register-error",
      });
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler - تحسين لحذف كل البيانات
  const logout = (forceReload = false, message = "تم تسجيل الخروج بنجاح") => {
    // تجنب إعادة تحميل الصفحة بشكل كامل ما لم يكن ضروريًا
    // حذف الكوكيز بهدوء
    Cookies.remove("auth-token", { path: "/" });

    // حذف بيانات التخزين المحلي بهدوء
    const clearLocalData = () => {
      localStorage.removeItem("user-data");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("last-session-check");
    };

    // إعادة تعيين حالة المستخدم بطريقة لا تسبب ارتعاشًا
    setToken(undefined);
    setSessionCheckAttempts(0);

    // تحسين سرعة الاستجابة للمستخدم
    if (message) {
      toast.success(message, { id: "logout-success" });
    }

    // تأخير قصير قبل تسجيل الخروج للسماح بإنهاء العمليات الأخرى
    setTimeout(() => {
      // إعادة تعيين حالة المستخدم بعد الرسالة
      setUser(null);
      clearLocalData();

      // إعادة توجيه المستخدم
      if (forceReload) {
        // إعادة تحميل كاملة في حالات الخطأ الشديدة أو تغيير الدور
        window.location.href = "/";
      } else {
        // انتقال سلس باستخدام router
        router.push("/");
      }
    }, 100);
  };

  // Helper function to determine redirect path based on role
  const getRoleBasedPath = (role: string): string => {
    // توجيه جميع المستخدمين إلى لوحة التحكم بغض النظر عن دورهم
    return "/dashboard";
  };

  // إضافة آلية التحقق الدوري من صلاحية الجلسة
  useEffect(() => {
    if (!mounted || !user || !token) return;

    // إنشاء متغير لمعرفة ما إذا كانت الصفحة نشطة حالياً
    let isPageActive = true;

    // التحقق من الجلسة كل 30 ثانية (زيادة من 15 ثانية لتقليل الطلبات)
    const sessionCheckInterval = setInterval(async () => {
      try {
        // عدم طباعة رسائل تصحيح إلا إذا كنا في وضع التطوير
        if (process.env.NODE_ENV === "development") {
          console.log("Running background session check...");
        }

        // إجراء التحقق بطريقة هادئة (بدون إظهار مؤشرات تحميل أو تغييرات في الواجهة)
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          console.log("Session validation failed during background check");

          // لا نظهر رسالة إلا عند الضرورة
          if (isPageActive) {
            toast.error(
              "انتهت صلاحية جلستك. سيتم تسجيل خروجك الآن.",
              { id: "session-expired" } // استخدام معرف ثابت لتجنب تكرار الرسائل
            );
          }

          // تأخير تسجيل الخروج قليلاً لتجنب الشعور بالارتعاش
          setTimeout(() => {
            if (isPageActive) {
              logout(true, "انتهت صلاحية جلستك. سيتم تسجيل خروجك الآن.");
            }
          }, 500);

          return;
        }

        // تحديث بيانات المستخدم بهدوء - بدون تأثير على واجهة المستخدم
        const userData = await response.json();

        // فحص ما إذا كان هناك تغيير في الدور أو الصلاحيات
        if (userData.role !== user.role) {
          console.log("User role changed from", user.role, "to", userData.role);

          if (isPageActive) {
            toast.error(
              "تم تغيير صلاحياتك من قبل المسؤول. سيتم تسجيل خروجك الآن.",
              { id: "role-changed" } // استخدام معرف ثابت لتجنب تكرار الرسائل
            );
          }

          // تأخير تسجيل الخروج قليلاً
          setTimeout(() => {
            if (isPageActive) {
              logout(
                true,
                "تم تغيير صلاحياتك من قبل المسؤول. سيتم تسجيل خروجك الآن."
              );
            }
          }, 500);

          return;
        }

        // تحديث بيانات المستخدم فقط إذا كان هناك تغيير فعلي (تجنباً للتحديثات غير الضرورية)
        if (JSON.stringify(userData) !== JSON.stringify(user)) {
          // تحديث بيانات المستخدم بهدوء
          setUser((prev) => {
            // إذا كانت البيانات الجديدة مختلفة عن السابقة، قم بالتحديث
            if (JSON.stringify(prev) !== JSON.stringify(userData)) {
              localStorage.setItem("user-data", JSON.stringify(userData));
              return userData;
            }
            return prev; // لا تغيير إذا كانت البيانات متطابقة
          });
        }
      } catch (error) {
        // فقط سجل الخطأ ولا تؤثر على واجهة المستخدم
        console.error("Error during background session check:", error);
      }
    }, 30000);

    // إضافة مستمعي أحداث للتعرف على نشاط الصفحة
    const handleVisibilityChange = () => {
      isPageActive = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // التنظيف عند إزالة المكون
    return () => {
      clearInterval(sessionCheckInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isPageActive = false;
    };
  }, [mounted, user, token, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
