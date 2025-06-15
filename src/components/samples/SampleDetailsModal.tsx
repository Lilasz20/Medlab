"use client";

import React from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X,
  Beaker,
  User,
  FileText,
  Calendar,
  ClipboardList,
  FileBarChart,
} from "lucide-react";

interface SampleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: any;
}

export default function SampleDetailsModal({
  isOpen,
  onClose,
  sample,
}: SampleDetailsModalProps) {
  if (!sample) return null;

  // تنسيق التاريخ بطريقة بسيطة (إذا وجد)
  let formattedDate = "—";
  if (sample.createdAt) {
    try {
      formattedDate = new Date(sample.createdAt).toISOString().split("T")[0];
    } catch (e) {
      console.error("Error with date:", e);
    }
  }

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} dir="rtl">
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-right align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-gray-900"
                  >
                    تفاصيل العينة
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="text-md font-medium mb-3 text-indigo-700 flex items-center">
                    <Beaker className="ml-2 h-5 w-5" /> معلومات العينة
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">رمز العينة</p>
                      <p className="font-medium">{sample.sampleCode || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">تاريخ الجمع</p>
                      <p className="font-medium">{formattedDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">حالة العينة</p>
                      <p className="font-medium">
                        {sample.testAssignment?.status === "SAMPLE_COLLECTED" &&
                          "تم جمع العينة"}
                        {sample.testAssignment?.status === "PROCESSING" &&
                          "قيد المعالجة"}
                        {sample.testAssignment?.status === "COMPLETED" &&
                          "مكتمل"}
                        {sample.testAssignment?.status === "CANCELLED" &&
                          "ملغي"}
                        {!sample.testAssignment?.status && "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الفني المسؤول</p>
                      <p className="font-medium">
                        {sample.collectedBy?.name || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="text-md font-medium mb-3 text-indigo-700 flex items-center">
                    <ClipboardList className="ml-2 h-5 w-5" /> معلومات الفحص
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">اسم الفحص</p>
                      <p className="font-medium">
                        {sample.testAssignment?.test?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">فئة الفحص</p>
                      <p className="font-medium">
                        {sample.testAssignment?.test?.category || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="text-md font-medium mb-3 text-indigo-700 flex items-center">
                    <User className="ml-2 h-5 w-5" /> معلومات المريض
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">اسم المريض</p>
                      <p className="font-medium">
                        {sample.testAssignment?.patient?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">رقم الملف</p>
                      <p className="font-medium">
                        {sample.testAssignment?.patient?.fileNumber || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* قسم نتائج الفحص */}
                {sample.results && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="text-md font-medium mb-3 text-indigo-700 flex items-center">
                      <FileBarChart className="ml-2 h-5 w-5" /> نتائج الفحص
                    </h4>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-sm whitespace-pre-wrap">
                        {sample.results}
                      </p>
                    </div>
                  </div>
                )}

                {sample.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="text-md font-medium mb-3 text-indigo-700 flex items-center">
                      <FileText className="ml-2 h-5 w-5" /> ملاحظات
                    </h4>
                    <p className="text-sm">{sample.notes}</p>
                  </div>
                )}

                <div className="text-left mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    إغلاق
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
