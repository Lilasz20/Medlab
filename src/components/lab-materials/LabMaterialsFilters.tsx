import React from "react";
import { Check, X, SortAsc, SortDesc } from "lucide-react";

// أنواع تصنيفات المواد المخبرية
const CATEGORY_OPTIONS = [
  { value: "", label: "جميع التصنيفات" },
  { value: "REAGENT", label: "كاشف" },
  { value: "CONSUMABLE", label: "مستهلكات" },
  { value: "EQUIPMENT", label: "معدات/أدوات" },
  { value: "GLASSWARE", label: "زجاجيات" },
  { value: "CHEMICAL", label: "مواد كيميائية" },
  { value: "OTHER", label: "أخرى" },
];

// أنواع الترتيب المتاحة
const SORT_OPTIONS = [
  { value: "name:asc", label: "الاسم (أ-ي)", icon: SortAsc },
  { value: "name:desc", label: "الاسم (ي-أ)", icon: SortDesc },
  {
    value: "currentQuantity:asc",
    label: "الكمية (الأقل أولاً)",
    icon: SortAsc,
  },
  {
    value: "currentQuantity:desc",
    label: "الكمية (الأكثر أولاً)",
    icon: SortDesc,
  },
  {
    value: "expiryDate:asc",
    label: "تاريخ الانتهاء (الأقرب أولاً)",
    icon: SortAsc,
  },
  { value: "category:asc", label: "التصنيف (أ-ي)", icon: SortAsc },
];

interface LabMaterialsFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  setCategory: (category: string) => void;
  lowStock: boolean;
  setLowStock: (lowStock: boolean) => void;
  sort: string;
  setSort: (sort: string) => void;
  order: string;
  setOrder: (order: string) => void;
  clearFilters: () => void;
}

export default function LabMaterialsFilters({
  isOpen,
  onClose,
  category,
  setCategory,
  lowStock,
  setLowStock,
  sort,
  setSort,
  order,
  setOrder,
  clearFilters,
}: LabMaterialsFiltersProps) {
  if (!isOpen) return null;

  // تحديد الترتيب النشط
  const getActiveSortOption = () => {
    const sortKey = `${sort}:${order}`;
    return (
      SORT_OPTIONS.find((option) => option.value === sortKey) || SORT_OPTIONS[0]
    );
  };

  // معالجة تغيير خيارات الترتيب
  const handleSortChange = (sortOption: string) => {
    const [newSort, newOrder] = sortOption.split(":");
    setSort(newSort);
    setOrder(newOrder);
  };

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

      <div className="space-y-5">
        {/* فلتر التصنيف */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            فلترة حسب التصنيف
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value)}
                className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                  category === option.value
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                    : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                {category === option.value && (
                  <Check size={14} className="ml-1" />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* فلتر المخزون المنخفض */}
        <div>
          <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => setLowStock(e.target.checked)}
              className="form-checkbox text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-sm font-medium text-gray-700">
              عرض المواد منخفضة المخزون فقط
            </span>
          </label>
        </div>

        {/* خيارات الترتيب */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ترتيب المواد المخبرية
          </label>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = getActiveSortOption().value === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full flex items-center ${
                    isActive
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
