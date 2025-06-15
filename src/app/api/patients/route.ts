import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAndAuthorize, handleApiError } from "@/lib/auth/helpers";
import {
  extractPaginationParams,
  buildSearchQuery,
  createPaginationMeta,
  validateRequiredFields,
  sanitizeQueryParam,
} from "@/lib/api/helpers";

// GET - استرجاع قائمة المرضى
export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
      "LAB_TECHNICIAN",
      "ACCOUNTANT",
    ]);

    if (error) {
      return error;
    }

    // معالجة معلمات البحث والترتيب والصفحات
    const { searchParams } = new URL(request.url);
    const searchTerm = sanitizeQueryParam(searchParams.get("search"));
    const patientId = sanitizeQueryParam(searchParams.get("id"));
    const paginationOptions = extractPaginationParams(request);

    // بناء استعلام البحث
    let searchQuery: any = {};

    // إذا تم تحديد معرف مريض محدد
    if (patientId) {
      searchQuery = { id: patientId };
    }
    // وإلا إذا كان هناك مصطلح بحث
    else if (searchTerm) {
      searchQuery = buildSearchQuery(searchTerm, [
        "name",
        "fileNumber",
        "phone",
      ]);
    }

    // استرجاع المرضى مع العدد الإجماليch
    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where: searchQuery,
        orderBy: paginationOptions.orderBy,
        skip: paginationOptions.skip,
        take: paginationOptions.limit,
        select: {
          id: true,
          fileNumber: true,
          name: true,
          phone: true,
          address: true,
          dateOfBirth: true,
          gender: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          createdBy: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              testAssignments: true,
              invoices: true,
            },
          },
        },
      }),
      prisma.patient.count({ where: searchQuery }),
    ]);

    // إرجاع البيانات مع معلومات الصفحات
    return NextResponse.json({
      patients,
      meta: createPaginationMeta(totalCount, paginationOptions),
    });
  } catch (error) {
    return handleApiError(error, "استرجاع قائمة المرضى");
  }
}

// POST - إنشاء مريض جديد
export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // التأكد من payload غير null (تم التحقق سابقاً في authenticateAndAuthorize)
    if (!payload) {
      return NextResponse.json(
        { message: "حدث خطأ في التحقق من الهوية" },
        { status: 401 }
      );
    }

    // استخراج بيانات المريض من الطلب
    const data = await request.json();
    const { name, fileNumber, phone, gender, dateOfBirth, address } = data;

    // التحقق من البيانات المطلوبة
    const validation = validateRequiredFields(data, [
      "name",
      "fileNumber",
      "gender",
    ]);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: `الحقول التالية مطلوبة: ${validation.missingFields.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // التحقق من عدم تكرار رقم الملف
    const existingPatient = await prisma.patient.findUnique({
      where: { fileNumber },
    });

    if (existingPatient) {
      return NextResponse.json(
        { message: "رقم الملف مستخدم بالفعل. الرجاء استخدام رقم آخر" },
        { status: 409 }
      );
    }

    // إنشاء مريض جديد
    const newPatient = await prisma.patient.create({
      data: {
        name,
        fileNumber,
        phone: phone || null,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        createdById: payload.userId,
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "تم إضافة المريض بنجاح",
        patient: newPatient,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "إضافة مريض جديد");
  }
}
