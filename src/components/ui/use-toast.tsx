"use client";

// Adapted from https://ui.shadcn.com/docs/components/toast
import React, { useState, createContext, useContext } from "react";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
  dismiss: (id?: string) => void;
  toasts: Array<ToastProps & { id: string }>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...props, id };
    setToasts((prev) => [...prev, newToast]);

    if (props.duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, props.duration || 5000);
    }
  };

  const dismiss = (id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    } else {
      setToasts([]);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      {/* تعطيل Toaster هنا لمنع التداخل مع مكون Toaster الرئيسي في layout.tsx */}
      {/* <Toaster /> */}
    </ToastContext.Provider>
  );
};

// مكون عرض الإشعارات
const Toaster = () => {
  const { toasts, dismiss } = useContext(ToastContext) || {
    toasts: [],
    dismiss: () => {},
  };

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-md shadow-md transition-all transform translate-x-0 
                     ${
                       toast.variant === "destructive"
                         ? "bg-red-600 text-white"
                         : toast.variant === "success"
                         ? "bg-green-600 text-white"
                         : "bg-white text-gray-800 border border-gray-200"
                     }`}
          role="alert"
        >
          {toast.title && <h4 className="font-bold">{toast.title}</h4>}
          {toast.description && <p>{toast.description}</p>}
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 text-sm"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// لا نستخدم هذه الدالة مباشرة من خارج المكونات
// export const toast = (props: ToastProps) => {
//   const { toast: toastFn } = useToast();
//   return toastFn(props);
// };
