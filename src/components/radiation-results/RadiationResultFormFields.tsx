"use client";

import React, { useRef } from "react";
import {
  Loader,
  X,
  Search,
  Check,
  ChevronDown,
  Upload,
  File,
  Image,
} from "lucide-react";
import { Patient, TestAssignmentWithRelations } from "@/types";
import { getTestName, mapStatusToArabic } from "./RadiationResultFormHooks";

// مكون اختيار المريض
interface PatientSelectorProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  patients: Patient[];
  isLoading: boolean;
  isSearching: boolean;
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onClearPatient: () => void;
  disabled?: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  searchTerm,
  onSearchChange,
  onFocus,
  showDropdown,
  setShowDropdown,
  patients,
  isLoading,
  isSearching,
  selectedPatient,
  onSelectPatient,
  onClearPatient,
  disabled = false,
  dropdownRef,
}) => {
  return (
    <div>
      <label
        htmlFor="patientId"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        اختيار المريض <span className="text-red-500">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>

          <input
            type="text"
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 p-2.5 text-right"
            placeholder={
              selectedPatient
                ? `${selectedPatient.name} (${selectedPatient.fileNumber})`
                : "البحث عن مريض..."
            }
            value={searchTerm}
            onChange={onSearchChange}
            onFocus={onFocus}
            disabled={disabled}
          />

          <div
            className="absolute inset-y-0 left-0 flex items-center pl-2 cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <ChevronDown size={16} className="text-gray-500" />
          </div>
        </div>

        {/* قائمة منسدلة للمرضى */}
        {showDropdown && (
          <div className="absolute z-10 mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto w-full border border-gray-300">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader size={20} className="animate-spin" />
                <span className="text-sm text-gray-500 mr-2">
                  جاري البحث...
                </span>
              </div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                  onClick={() => onSelectPatient(patient)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-sm text-gray-500">
                      رقم الملف: {patient.fileNumber}
                    </span>
                  </div>
                  {selectedPatient && selectedPatient.id === patient.id && (
                    <Check size={16} className="text-green-500" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-gray-500 text-center">
                {searchTerm.length > 0
                  ? isSearching
                    ? "جاري البحث..."
                    : "لا توجد نتائج مطابقة"
                  : "اكتب اسم المريض أو رقم الملف للبحث (حرفين على الأقل)"}
              </div>
            )}
          </div>
        )}

        {/* عرض المريض المحدد */}
        {selectedPatient && !showDropdown && (
          <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={onClearPatient}
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-end">
              <span className="font-medium">{selectedPatient.name}</span>
              <span className="text-sm text-gray-500">
                رقم الملف: {selectedPatient.fileNumber}
              </span>
            </div>
          </div>
        )}

        {/* رسالة إذا لم يتم تحديد مريض */}
        {!selectedPatient && !searchTerm && !isLoading && (
          <p className="text-sm text-gray-500 mt-1 text-right">
            يرجى البحث عن المريض واختياره
          </p>
        )}
      </div>
    </div>
  );
};

// مكون اختيار الفحص
interface TestSelectorProps {
  testAssignments: TestAssignmentWithRelations[];
  selectedTestId: string;
  onSelectTest: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isLoading: boolean;
  patientId: string;
  disabled?: boolean;
}

export const TestSelector: React.FC<TestSelectorProps> = ({
  testAssignments,
  selectedTestId,
  onSelectTest,
  isLoading,
  patientId,
  disabled = false,
}) => {
  // التحقق من وجود فحوصات صالحة
  const hasValidAssignments =
    Array.isArray(testAssignments) && testAssignments.length > 0;

  // طباعة معلومات تشخيصية
  console.log("TestSelector - testAssignments:", testAssignments);
  console.log("TestSelector - hasValidAssignments:", hasValidAssignments);
  console.log("TestSelector - selectedTestId:", selectedTestId);
  console.log("TestSelector - patientId:", patientId);

  return (
    <div>
      <label
        htmlFor="testAssignmentId"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        اختيار الفحص <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <select
          id="testAssignmentId"
          name="testAssignmentId"
          value={selectedTestId}
          onChange={onSelectTest}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10 text-right appearance-none bg-white"
          required
          disabled={disabled || isLoading || !patientId || !hasValidAssignments}
        >
          <option value="">
            {!hasValidAssignments && patientId && !isLoading
              ? "-- لا توجد فحوصات متاحة --"
              : "-- اختر الفحص --"}
          </option>
          {hasValidAssignments &&
            testAssignments.map((assignment) => {
              // طباعة معلومات كل فحص للتشخيص
              console.log(`Assignment option: ${assignment.id}`, assignment);

              if (
                assignment &&
                typeof assignment === "object" &&
                assignment.id
              ) {
                const testName = getTestName(assignment);
                const status = mapStatusToArabic(assignment.status || "");
                // إضافة مؤشر إذا كان الفحص يحتوي بالفعل على نتيجة أشعة
                const hasResult = (assignment as any).hasRadiationResult;
                const optionText = `${testName} - ${status}${
                  hasResult ? " ⚠️ (تم إضافة نتيجة سابقاً)" : ""
                }`;

                return (
                  <option
                    key={assignment.id}
                    value={assignment.id}
                    className={hasResult ? "text-orange-500 font-medium" : ""}
                    disabled={hasResult} // تعطيل الخيار إذا كان لديه نتيجة بالفعل
                  >
                    {optionText}
                  </option>
                );
              }
              return null;
            })}
        </select>
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <ChevronDown size={16} className="text-gray-500" />
        </div>
      </div>

      {hasValidAssignments && (
        <div className="mt-2 flex items-center justify-end">
          <p className="text-sm text-gray-600">
            {`تم العثور على ${testAssignments.length} فحص متاح`}
          </p>
        </div>
      )}

      {!hasValidAssignments && !isLoading && patientId && (
        <div className="mt-2">
          <p className="text-sm text-orange-500">
            لا توجد فحوصات متاحة لإضافة نتائج أشعة. قد تكون كل الفحوصات مكتملة
            بالفعل.
          </p>
        </div>
      )}
    </div>
  );
};

// مكون حقول النموذج الأساسية
interface FormFieldsProps {
  title: string;
  description: string | undefined;
  resultDetails: string;
  reportText: string | undefined;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  disabled?: boolean;
}

export const FormFields: React.FC<FormFieldsProps> = ({
  title,
  description = "",
  resultDetails,
  reportText = "",
  onChange,
  disabled = false,
}) => {
  return (
    <>
      {/* عنوان نتيجة الأشعة */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          عنوان النتيجة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={onChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
          disabled={disabled}
        />
      </div>

      {/* وصف النتيجة */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          وصف النتيجة
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={onChange}
          rows={2}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={disabled}
        />
      </div>

      {/* تفاصيل النتيجة */}
      <div>
        <label
          htmlFor="resultDetails"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          تفاصيل النتيجة <span className="text-red-500">*</span>
        </label>
        <textarea
          id="resultDetails"
          name="resultDetails"
          value={resultDetails}
          onChange={onChange}
          rows={4}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
          disabled={disabled}
        />
      </div>

      {/* نص التقرير */}
      <div>
        <label
          htmlFor="reportText"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          نص التقرير المفصل
        </label>
        <textarea
          id="reportText"
          name="reportText"
          value={reportText}
          onChange={onChange}
          rows={6}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={disabled}
        />
      </div>
    </>
  );
};

// مكون رفع الملفات
interface FileUploaderProps {
  type: "image" | "pdf";
  fileUrl: string | undefined;
  isUploading: boolean;
  file: File | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  type,
  fileUrl = "",
  isUploading,
  file,
  onUpload,
  onClear,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label
        htmlFor={`${type}Upload`}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {type === "image" ? "صورة الأشعة" : "ملف PDF للتقرير"}
      </label>
      <div className="mt-1 flex items-center">
        <input
          type="file"
          id={`${type}Upload`}
          ref={fileInputRef}
          onChange={onUpload}
          accept={type === "image" ? "image/*" : "application/pdf"}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
          disabled={disabled || isUploading}
        >
          <Upload size={16} className="ml-2" />
          <span>
            {isUploading
              ? "جاري الرفع..."
              : type === "image"
              ? "اختر صورة"
              : "اختر ملف PDF"}
          </span>
        </button>
        {isUploading && <Loader size={16} className="animate-spin mr-2" />}
        {fileUrl && !isUploading && (
          <div className="mr-2 flex items-center">
            <span className="text-sm text-green-600 flex items-center">
              <Check size={16} className="ml-1" />{" "}
              {type === "image" ? "تم رفع الصورة" : "تم رفع الملف"}
            </span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700 mr-2 flex items-center"
            >
              {type === "image" ? (
                <Image size={16} className="ml-1" />
              ) : (
                <File size={16} className="ml-1" />
              )}
              عرض
            </a>
            <button
              type="button"
              onClick={onClear}
              className="text-red-500 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {file && (
        <p className="mt-1 text-sm text-gray-500">
          اسم الملف: {file.name} ({Math.round(file.size / 1024)} كيلوبايت)
        </p>
      )}
    </div>
  );
};

// مكون نافذة التأكيد
interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: (e: React.FormEvent) => void;
  onCancel: () => void;
  title: string;
  resultDetails: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  resultDetails,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              تأكيد التعديل
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="text-sm text-gray-700">
            <p className="mb-3">
              هل أنت متأكد من رغبتك في تعديل نتيجة الأشعة التالية؟
            </p>

            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <p className="font-semibold mb-1">عنوان النتيجة:</p>
              <p className="text-gray-800 mb-2">{title}</p>

              <p className="font-semibold mb-1">تفاصيل النتيجة:</p>
              <p className="text-gray-800 mb-2 text-sm">
                {resultDetails.length > 100
                  ? `${resultDetails.substring(0, 100)}...`
                  : resultDetails}
              </p>
            </div>

            <p className="text-yellow-600 font-medium">
              التعديل سيقوم بتحديث بيانات نتيجة الأشعة في النظام. هل تريد
              المتابعة؟
            </p>
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-reverse space-x-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
          >
            نعم، تأكيد التعديل
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
