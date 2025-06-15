"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function WaitingApprovalPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // إذا كان المستخدم غير مسجل دخول، توجيهه إلى صفحة تسجيل الدخول
    if (!isLoading && !user) {
      router.push("/auth/login");
      return;
    }

    // إذا كان المستخدم مسجل دخول وتمت الموافقة عليه، توجيهه إلى لوحة التحكم
    if (!isLoading && user && user.approved) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // عرض صفحة الانتظار فقط إذا كان المستخدم مسجل دخول ولم تتم الموافقة عليه
  if (user && !user.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            في انتظار الموافقة
          </h1>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 text-right">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 ml-2" />
              <p className="font-semibold text-amber-800">ملاحظة هامة</p>
            </div>
            <p className="text-amber-700">
              لم تتم الموافقة على حسابك بعد. يرجى الانتظار حتى يقوم المسؤول
              بمراجعة طلبك والموافقة عليه.
            </p>
          </div>

          <p className="text-gray-600 mb-8">
            سيتمكن المسؤول من الوصول إلى نظام المختبر بمجرد الموافقة على حسابك.
            يمكنك تسجيل الخروج والعودة لاحقًا للتحقق من حالة حسابك.
          </p>

          <div className="flex flex-col space-y-3">
            <button
              onClick={logout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              تسجيل الخروج
            </button>
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // حالة احتياطية (لن يتم الوصول إليها عادة بسبب إعادة التوجيه في useEffect)
  return null;
}
