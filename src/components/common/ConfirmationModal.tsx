"use client";

import React from "react";
import { Loader, AlertTriangle, Trash, Save, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmIcon?: React.ReactNode;
  isLoading?: boolean;
  type?: "delete" | "edit" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  infoContent?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  confirmIcon,
  isLoading = false,
  type = "info",
  onConfirm,
  onCancel,
  infoContent,
}) => {
  if (!isOpen) return null;

  // تحديد الألوان والأيقونات حسب نوع النافذة
  const getTypeStyles = () => {
    switch (type) {
      case "delete":
        return {
          icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
          iconBg: "bg-red-100",
          confirmBg: "bg-red-600 hover:bg-red-700",
          confirmText: confirmText || "تأكيد الحذف",
          confirmIcon: confirmIcon || <Trash className="h-4 w-4 ml-2" />,
        };
      case "edit":
        return {
          icon: <AlertTriangle className="h-8 w-8 text-yellow-600" />,
          iconBg: "bg-yellow-100",
          confirmBg: "bg-indigo-600 hover:bg-indigo-700",
          confirmText: confirmText || "حفظ التغييرات",
          confirmIcon: confirmIcon || <Save className="h-4 w-4 ml-2" />,
        };
      default:
        return {
          icon: <AlertTriangle className="h-8 w-8 text-blue-600" />,
          iconBg: "bg-blue-100",
          confirmBg: "bg-blue-600 hover:bg-blue-700",
          confirmText: confirmText || "تأكيد",
          confirmIcon: confirmIcon,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div className="modal-overlay">
      <div className="modal-content" dir="rtl" style={{ maxWidth: "500px" }}>
        <div className="px-6 pt-5 pb-4">
          <div className="flex flex-col items-center mb-5">
            <div className={`${typeStyles.iconBg} p-3 rounded-full mb-3`}>
              {typeStyles.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-center text-gray-600">{message}</p>

            {infoContent && (
              <div className="mt-4 w-full bg-gray-50 p-4 rounded-md text-sm">
                {infoContent}
              </div>
            )}

            {type === "delete" && (
              <p className="text-center text-red-600 text-sm mt-4">
                لا يمكن التراجع عن هذا الإجراء بعد التأكيد.
              </p>
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 ml-3"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-white ${typeStyles.confirmBg} rounded-lg flex items-center justify-center`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin ml-2" />
                جارِ المعالجة...
              </>
            ) : (
              <>
                {typeStyles.confirmIcon}
                {typeStyles.confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
