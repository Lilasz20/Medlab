"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Users,
  TestTube,
  CreditCard,
  FileText,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

// مكون تأثير الكتابة المتحركة
const TypewriterEffect = ({ texts }: { texts: string[] }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[currentTextIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // إضافة حرف
          if (currentIndex < currentText.length) {
            setDisplayText(currentText.substring(0, currentIndex + 1));
            setCurrentIndex(currentIndex + 1);
          } else {
            // انتظار قبل البدء في الحذف
            setTimeout(() => {
              setIsDeleting(true);
            }, 1500);
          }
        } else {
          // حذف حرف
          if (currentIndex > 0) {
            setDisplayText(currentText.substring(0, currentIndex - 1));
            setCurrentIndex(currentIndex - 1);
          } else {
            // الانتقال إلى النص التالي
            setIsDeleting(false);
            setCurrentTextIndex((currentTextIndex + 1) % texts.length);
          }
        }
      },
      isDeleting ? 50 : 100
    ); // سرعة أعلى للحذف

    return () => clearTimeout(timeout);
  }, [currentIndex, currentTextIndex, isDeleting, texts]);

  return (
    <div className="min-h-[4rem] flex items-center">
      <span>{displayText}</span>
      <span className="animate-blink border-r-2 border-indigo-600 ml-1">
        &nbsp;
      </span>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // النصوص التي سيتم عرضها بالتناوب
  const typewriterTexts = [
    "المعمل الطبي - نظام إدارة المختبرات",
    "إدارة المرضى والفحوصات بكفاءة",
    "تتبع العينات والنتائج بدقة",
    "إنشاء التقارير والفواتير بسهولة",
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              <TypewriterEffect texts={typewriterTexts} />
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              حل شامل لإدارة عمليات مختبرك الطبي بكفاءة. قم بتنظيم إدارة المرضى
              ومعالجة الفحوصات وإنشاء التقارير في منصة متكاملة واحدة.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/auth/login"
                className="bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded-md"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-semibold leading-6 text-gray-900 flex items-center"
              >
                إنشاء حساب جديد <ArrowRight className="mr-1 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <img
                src="/images/hero-lab.jpg"
                alt="Medical Laboratory Dashboard"
                className="w-[48rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 bg-gray-50">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">
            حل متكامل
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            كل ما تحتاجه لإدارة مختبرك
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            تم تصميم نظامنا لتبسيط كل جانب من جوانب عمليات المختبر الطبي، من
            تسجيل المرضى إلى إنشاء التقارير.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <Users className="h-5 w-5 flex-none text-indigo-600" />
                إدارة المرضى
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  إدارة سجلات المرضى وتسجيلهم وتاريخهم بكفاءة. البحث واسترجاع
                  معلومات المرضى بسرعة.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <Beaker className="h-5 w-5 flex-none text-indigo-600" />
                كتالوج الفحوصات
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  الحفاظ على كتالوج شامل للفحوصات مع تسعير قابل للتخصيص وفئات
                  ومتطلبات العينات.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <TestTube className="h-5 w-5 flex-none text-indigo-600" />
                إدارة العينات
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  تتبع العينات من التجميع إلى المعالجة. إنشاء معرفات فريدة
                  للعينات وإدارة سير العمل بكفاءة.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <FileText className="h-5 w-5 flex-none text-indigo-600" />
                تقارير PDF
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  إنشاء تقارير PDF احترافية لنتائج الاختبارات ومعلومات المرضى
                  وتفاصيل العينات.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <CreditCard className="h-5 w-5 flex-none text-indigo-600" />
                الفواتير والمحاسبة
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  إنشاء وإدارة الفواتير وتتبع المدفوعات وإنشاء تقارير الفواتير
                  للمرضى.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <Users className="h-5 w-5 flex-none text-indigo-600" />
                الوصول المستند إلى الأدوار
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  التحكم الآمن في الوصول مع أذونات مستندة إلى الأدوار للمسؤولين
                  والموظفين والفنيين والمحاسبين.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <h2 className="text-2xl font-bold">المعمل الطبي</h2>
              <p className="mt-2 text-gray-400">نظام إدارة المختبرات الطبية</p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  الميزات
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      إدارة المرضى
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      كتالوج الفحوصات
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      التقارير
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  الموارد
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      التوثيق
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      الدعم
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      حول المعمل
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  الشروط القانونية
                </h3>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      سياسة الخصوصية
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-400 hover:text-white">
                      شروط الخدمة
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8">
            <p className="text-sm text-gray-400 text-center">
              © 2025 المعمل الطبي. جميع الحقوق محفوظة. تصميم وتطوير: ليلاس و
              راما
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
