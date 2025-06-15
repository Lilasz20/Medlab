import React, { useState } from "react";
import { Download, Printer, X, Maximize2, Minimize2 } from "lucide-react";

interface ReportViewerProps {
  reportUrl: string;
  title: string;
  onClose: () => void;
}

export default function ReportViewer({
  reportUrl,
  title,
  onClose,
}: ReportViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleDownload = () => {
    window.open(reportUrl, "_blank");
  };

  const handlePrint = () => {
    // في التطبيق الفعلي، سنستخدم مكتبة طباعة أو نفتح مربع حوار الطباعة
    window.print();
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${
        isFullScreen ? "" : "md:p-10"
      }`}
      dir="rtl"
    >
      <div
        className={`bg-white rounded-lg shadow-xl flex flex-col w-full ${
          isFullScreen ? "h-full" : "max-w-5xl max-h-[90vh]"
        }`}
      >
        {/* رأس المشاهد */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="تنزيل"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="طباعة"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={toggleFullScreen}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title={isFullScreen ? "تصغير" : "تكبير"}
            >
              {isFullScreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* محتوى التقرير */}
        <div className="flex-1 overflow-auto p-4">
          {/* في التطبيق الفعلي، سيتم استخدام مكتبة لعرض ملفات PDF */}
          {/* لأغراض المحاكاة، نستخدم iframe */}
          <div className="bg-gray-100 rounded-lg p-4 h-full flex items-center justify-center">
            {reportUrl ? (
              <iframe
                src={reportUrl}
                className="w-full h-full border-0"
                title={title}
              />
            ) : (
              <div className="text-center p-10">
                <p className="text-gray-500">
                  لا يمكن عرض التقرير. قد يكون الملف غير متوفر.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  يرجى تنزيل التقرير لعرضه.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
