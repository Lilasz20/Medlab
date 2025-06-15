"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { AlertCircle, CheckCircle } from "lucide-react";

// مكون منفصل للتعامل مع query parameters
function SearchParamsHandler({
  setSuccessMessage,
}: {
  setSuccessMessage: (message: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const registered = searchParams.get("registered");
    if (registered === "true") {
      setSuccessMessage("تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول للمتابعة.");
    }
  }, [searchParams, setSuccessMessage]);

  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  // يستخدم لمعالجة مشكلة hydration - التأكد من أننا في CSR فقط
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!mounted) return;

    if (user) {
      // توجيه جميع المستخدمين إلى لوحة التحكم بغض النظر عن دورهم
      router.push("/dashboard");
    }
  }, [user, router, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("البريد الإلكتروني وكلمة المرور مطلوبان");
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });
      // Redirect happens in AuthContext
    } catch (error: any) {
      setError(error.message || "فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  // إظهار محتوى فارغ أو أساسي للـ SSR
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      {/* استخدام Suspense لتغليف مكون SearchParamsHandler */}
      <Suspense fallback={null}>
        <SearchParamsHandler setSuccessMessage={setSuccessMessage} />
      </Suspense>

      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            المعمل الطبي
          </h1>
          <p className="text-gray-600">تسجيل الدخول إلى حسابك</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center">
            <AlertCircle size={18} className="ml-2" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg flex items-center">
            <CheckCircle size={18} className="ml-2" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
              placeholder="أدخل بريدك الإلكتروني"
              dir="rtl"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                كلمة المرور
              </label>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
              placeholder="أدخل كلمة المرور"
              dir="rtl"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200 flex justify-center items-center"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="w-4 h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{" "}
            <Link
              href="/auth/register"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
