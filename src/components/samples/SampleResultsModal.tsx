"use client";

import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, FileText, Beaker, Upload, Check } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface SampleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: any;
  onSaveResults: () => void;
}

export default function SampleResultsModal({
  isOpen,
  onClose,
  sample,
  onSaveResults,
}: SampleResultsModalProps) {
  const { user, token } = useAuth();
  const [resultsText, setResultsText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update results text when sample changes
  useEffect(() => {
    if (sample?.results) {
      setResultsText(sample.results);
    } else {
      setResultsText("");
    }
  }, [sample]);

  const isLabTechnician =
    user?.role === "LAB_TECHNICIAN" || user?.role === "ADMIN";
  const canEditResults =
    isLabTechnician &&
    (sample?.testAssignment?.status === "SAMPLE_COLLECTED" ||
      sample?.testAssignment?.status === "PROCESSING");

  const handleSaveResults = async () => {
    if (!sample || !token) return;

    console.log("Sending results for sample:", sample);

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/samples/${sample.sampleCode}/results`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            results: resultsText,
          }),
        }
      );

      console.log("Response status:", response.status);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "حدث خطأ أثناء حفظ النتائج");
      }

      setSuccess(true);
      setTimeout(() => {
        onSaveResults();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Error saving results:", err);
      setError(err.message || "حدث خطأ أثناء حفظ النتائج");
    } finally {
      setIsLoading(false);
    }
  };

  if (!sample) return null;

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
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-gray-900 flex items-center"
                  >
                    <FileText className="ml-2 h-5 w-5 text-indigo-600" />
                    نتائج العينة {sample.sampleCode}
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
                  <div className="flex justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      الفحص:{" "}
                      <span className="font-medium text-gray-700">
                        {sample.testAssignment?.test?.name || "—"}
                      </span>
                    </span>
                    <span className="text-sm text-gray-500">
                      المريض:{" "}
                      <span className="font-medium text-gray-700">
                        {sample.testAssignment?.patient?.name || "—"}
                      </span>
                    </span>
                  </div>
                </div>

                {success ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
                    <Check className="ml-2 h-5 w-5" />
                    تم حفظ النتائج بنجاح
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                ) : null}

                <div className="mb-6">
                  <label
                    htmlFor="results"
                    className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
                  >
                    <Beaker className="ml-2 h-5 w-5 text-indigo-600" />
                    نتائج الفحص
                  </label>
                  <textarea
                    id="results"
                    className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-4 text-right"
                    rows={8}
                    placeholder={
                      canEditResults
                        ? "أدخل نتائج الفحص هنا..."
                        : "لا توجد نتائج متاحة بعد"
                    }
                    value={resultsText}
                    onChange={(e) => setResultsText(e.target.value)}
                    disabled={!canEditResults || isLoading}
                  />
                  {!canEditResults && !resultsText && (
                    <p className="mt-2 text-sm text-gray-500">
                      لم يتم إدخال نتائج لهذه العينة بعد.
                    </p>
                  )}
                  {!isLabTechnician && (
                    <p className="mt-2 text-sm text-gray-500">
                      فقط فنيو المختبر يمكنهم إدخال وتعديل النتائج.
                    </p>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    إغلاق
                  </button>

                  {canEditResults && (
                    <button
                      type="button"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                      onClick={handleSaveResults}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <LoadingSpinner className="ml-2 w-4 h-4" />
                      ) : (
                        <Upload className="ml-2 h-4 w-4" />
                      )}
                      حفظ النتائج
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
