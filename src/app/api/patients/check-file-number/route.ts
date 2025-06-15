import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAndAuthorize } from "@/lib/auth/helpers";

// GET - التحقق من وجود رقم ملف معين
export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "RECEPTIONIST",
    ]);

    if (error) {
      return error;
    }

    // استخراج رقم الملف من معلمات البحث
    const { searchParams } = new URL(request.url);
    const fileNumber = searchParams.get("fileNumber");

    if (!fileNumber) {
      return NextResponse.json({ message: "رقم الملف مطلوب" }, { status: 400 });
    }

    // البحث عن وجود رقم الملف في قاعدة البيانات
    const existingPatient = await prisma.patient.findUnique({
      where: { fileNumber },
      select: { id: true },
    });

    return NextResponse.json({
      exists: !!existingPatient,
      fileNumber,
      patientId: existingPatient?.id || null,
    });
  } catch (error) {
    console.error("Error checking file number:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء التحقق من رقم الملف" },
      { status: 500 }
    );
  }
}
