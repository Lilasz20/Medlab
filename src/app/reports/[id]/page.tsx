import React from "react";
import ReportClientContent from "./ReportClientContent";

// مكون الخادم (Server Component)
export default function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // استخدام React.use() لفك الوعد لـ params
  const resolvedParams = React.use(Promise.resolve(params));
  const reportId = resolvedParams.id;

  return <ReportClientContent reportId={reportId} />;
}
