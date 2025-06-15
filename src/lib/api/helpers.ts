import { NextRequest } from "next/server";

/**
 * واجهة لخيارات الترتيب والصفحات
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  orderBy: any;
}

/**
 * واجهة لبيانات التعريف للصفحات
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * استخراج معلمات الصفحات والترتيب من طلب HTTP
 */
export function extractPaginationParams(
  request: NextRequest,
  defaultLimit: number = 50,
  defaultOrderField: string = "createdAt",
  defaultOrderDirection: "asc" | "desc" = "desc"
): PaginationOptions {
  const { searchParams } = new URL(request.url);

  // معلمات الصفحات
  const limit = parseInt(searchParams.get("limit") || String(defaultLimit));
  const page = parseInt(searchParams.get("page") || "1");
  const skip = (page - 1) * limit;

  // معلمات الترتيب
  const orderField = searchParams.get("orderBy") || defaultOrderField;
  const orderDirection = (searchParams.get("orderDirection") ||
    defaultOrderDirection) as "asc" | "desc";

  // بناء كائن الترتيب
  const orderBy = { [orderField]: orderDirection };

  return {
    page,
    limit,
    skip,
    orderBy,
  };
}

/**
 * إنشاء معلومات الصفحات للرد
 */
export function createPaginationMeta(
  totalCount: number,
  options: PaginationOptions
): PaginationMeta {
  return {
    total: totalCount,
    page: options.page,
    limit: options.limit,
    pages: Math.ceil(totalCount / options.limit),
  };
}

/**
 * بناء استعلام بحث لـ Prisma
 */
export function buildSearchQuery(
  searchTerm: string | null,
  fieldsToSearch: string[]
): any {
  if (!searchTerm || !fieldsToSearch.length) {
    return {};
  }

  return {
    OR: fieldsToSearch.map((field) => ({
      [field]: { contains: searchTerm },
    })),
  };
}

/**
 * تنظيف وتحويل بيانات الاستعلام
 */
export function sanitizeQueryParam(
  param: string | null,
  defaultValue: string = ""
): string {
  return param ? param.trim() : defaultValue;
}

/**
 * التحقق من البيانات المطلوبة
 */
export function validateRequiredFields(
  data: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter((field) => !data[field]);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
