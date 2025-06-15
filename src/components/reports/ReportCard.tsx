import React from "react";
import { FileText, Download, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// تعريف أنواع التقرير
export type ReportType =
  | "PATIENT"
  | "TEST"
  | "FINANCIAL"
  | "SAMPLE"
  | "SUMMARY";

// واجهة خصائص التقرير
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  description: string;
  createdAt: string;
  pdfUrl?: string;
  icon?: React.ReactNode;
}

// خصائص مكون بطاقة التقرير
interface ReportCardProps {
  report: Report;
  onDownload: (report: Report) => void;
}

// دالة مساعدة لتنسيق التاريخ بالعربية
const formatArabicDate = (date: string | Date) => {
  return format(new Date(date), "dd MMMM yyyy", { locale: ar });
};

// دالة مساعدة لتنسيق الوقت بالعربية
const formatArabicTime = (date: string | Date) => {
  return format(new Date(date), "hh:mm a", { locale: ar });
};

// إختيار أيقونة مناسبة لنوع التقرير
const getReportIcon = (type: ReportType) => {
  switch (type) {
    case "PATIENT":
      return <FileText className="h-8 w-8 text-blue-500" />;
    case "TEST":
      return <FileText className="h-8 w-8 text-red-500" />;
    case "FINANCIAL":
      return <FileText className="h-8 w-8 text-green-500" />;
    case "SAMPLE":
      return <FileText className="h-8 w-8 text-purple-500" />;
    case "SUMMARY":
      return <FileText className="h-8 w-8 text-indigo-500" />;
    default:
      return <FileText className="h-8 w-8 text-gray-500" />;
  }
};

// مكون بطاقة التقرير
export default function ReportCard({ report, onDownload }: ReportCardProps) {
  // استخدام أيقونة التقرير المقدمة أو اختيار واحدة بناءً على النوع
  const reportIcon = report.icon || getReportIcon(report.type);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{reportIcon}</div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900">
            {report.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{report.description}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
            <div className="flex items-center">
              <Calendar className="ml-1 h-3 w-3" />
              {formatArabicDate(report.createdAt)}
            </div>
            <div className="flex items-center">
              <Clock className="ml-1 h-3 w-3" />
              {formatArabicTime(report.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onDownload(report)}
          className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          <Download size={16} className="ml-1" />
          تنزيل التقرير
        </button>
      </div>
    </div>
  );
}
