"use client";

import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DeleteSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  sampleCode: string;
}

export default function DeleteSampleModal({
  isOpen,
  onClose,
  onDelete,
  sampleCode,
}: DeleteSampleModalProps) {
  const { token } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/samples/${sampleCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "حدث خطأ أثناء حذف العينة");
      }

      onDelete();
      onClose();
    } catch (err: any) {
      console.error("Error deleting sample:", err);
      setError(err.message || "حدث خطأ أثناء حذف العينة");
    } finally {
      setIsDeleting(false);
    }
  };

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-right align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="flex items-center text-lg font-medium text-gray-900 mb-4"
                >
                  <AlertTriangle className="ml-2 h-6 w-6 text-red-500" />
                  تأكيد حذف العينة
                </Dialog.Title>

                <div className="mt-2 mb-6">
                  <p className="text-sm text-gray-700">
                    هل أنت متأكد من رغبتك في حذف العينة{" "}
                    <span className="font-semibold">{sampleCode}</span>؟
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    لا يمكن التراجع عن هذا الإجراء.
                  </p>

                  {error && (
                    <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && <LoadingSpinner className="w-4 h-4 ml-2" />}
                    حذف العينة
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
