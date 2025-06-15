import React from "react";
import { Check, X, SortAsc, SortDesc } from "lucide-react";

// أنواع حالات الفحص/العينة المتاحة - تم تعديلها للإبقاء فقط على الحالات المستخدمة
const SAMPLE_STATUSES = [
  { value: "ALL", label: "جميع الحالات" },
  { value: "SAMPLE_COLLECTED", label: "تم جمع العينة" },
  { value: "COMPLETED", label: "مكتمل" },
];

// أنواع الترتيب المتاحة
const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث أولاً", icon: SortDesc },
  { value: "oldest", label: "الأقدم أولاً", icon: SortAsc },
];

interface SamplesFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
  clearFilters: () => void;
}

export default function SamplesFilters({
  isOpen,
  onClose,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  clearFilters,
}: SamplesFiltersProps) {
  if (!isOpen) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">خيارات الفلترة والترتيب</h3>
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="text-gray-600 text-sm hover:text-indigo-600 flex items-center"
          >
            <X size={14} className="ml-1" />
            مسح الفلاتر
          </button>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* فلتر الحالة */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            فلترة حسب الحالة
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                  statusFilter === status.value
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                    : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                {statusFilter === status.value && (
                  <Check size={14} className="ml-1" />
                )}
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* خيارات الترتيب */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ترتيب العينات
          </label>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSortOrder(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                    sortOrder === option.value
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                      : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  <Icon size={14} className="ml-1" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
