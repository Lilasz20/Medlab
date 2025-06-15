import React, { useState, useEffect } from "react";
import { Check, X, SortAsc, SortDesc } from "lucide-react";

// أنواع الفحوصات المتاحة (سيتم تحميلها ديناميكياً)
interface CategoryOption {
  value: string;
  label: string;
}

// أنواع الترتيب المتاحة
const SORT_OPTIONS = [
  { value: "name_asc", label: "اسم الفحص (أ-ي)", icon: SortAsc },
  { value: "name_desc", label: "اسم الفحص (ي-أ)", icon: SortDesc },
  { value: "price_asc", label: "السعر (الأقل أولاً)", icon: SortAsc },
  { value: "price_desc", label: "السعر (الأعلى أولاً)", icon: SortDesc },
];

interface TestsFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
  clearFilters: () => void;
  categories: CategoryOption[];
}

export default function TestsFilters({
  isOpen,
  onClose,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  clearFilters,
  categories,
}: TestsFiltersProps) {
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
        {/* فلتر نوع التحليل */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            فلترة حسب نوع التحليل
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              key="ALL"
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                categoryFilter === "ALL"
                  ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                  : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              {categoryFilter === "ALL" && <Check size={14} className="ml-1" />}
              جميع الأنواع
            </button>
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setCategoryFilter(category.value)}
                className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                  categoryFilter === category.value
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                    : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                {categoryFilter === category.value && (
                  <Check size={14} className="ml-1" />
                )}
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* خيارات الترتيب */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ترتيب الفحوصات
          </label>
          <div className="flex flex-wrap gap-2">
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
