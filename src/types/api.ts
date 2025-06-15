/**
 * أنواع مشتركة لمسارات Next.js App Router API
 */

// نوع السياق الذي يمكن أن يحتوي على معلمات وعد أو معلمات عادية
export type RouteContext<T> = {
  params: Promise<T> | T;
};

/**
 * دالة مساعدة لاستخراج معلمات المسار بأمان
 * تستخدم await إذا كانت المعلمات وعدًا
 */
export async function getRouteParams<T>(context: RouteContext<T>): Promise<T> {
  return await context.params;
}
