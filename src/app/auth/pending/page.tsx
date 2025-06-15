"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function PendingApprovalPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // إذا لم يكن المستخدم مسجل دخول، توجيهه إلى صفحة تسجيل الدخول
    if (!isLoading && !user) {
      router.push("/auth/login");
      return;
    }

    // إذا كان المستخدم معتمد بالفعل، توجيهه إلى لوحة التحكم
    if (!isLoading && user && user.approved) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم، نعرض رسالة فارغة (سيتم التوجيه في useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 p-3 rounded-full">
            <Clock className="h-12 w-12 text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">حسابك قيد المراجعة</h1>

        <div className="mb-6 text-gray-600">
          <p className="mb-2">
            شكراً لتسجيلك في نظام المختبر الطبي. حسابك حالياً قيد المراجعة من
            قبل المسؤول.
          </p>
          <p className="mb-2">
            سيتم إعلامك عندما تتم الموافقة على حسابك وستتمكن من الوصول إلى
            النظام.
          </p>
          <p>إذا كانت لديك أي استفسارات، يرجى التواصل مع مسؤول النظام.</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-amber-700 text-sm text-right">
            <p>معلومات الحساب:</p>
            <p>الاسم: {user.name}</p>
            <p>البريد الإلكتروني: {user.email}</p>
            <p>الحالة: في انتظار الموافقة</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => logout()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
          >
            تسجيل الخروج
          </button>

          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
