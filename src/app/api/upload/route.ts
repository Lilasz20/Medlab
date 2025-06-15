import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { authenticateAndAuthorize, handleApiError } from "@/lib/auth/helpers";

// تحديد الدليل العام للتخزين
const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

// الحد الأقصى لحجم الملف بالبايت (10 ميجابايت)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// أنواع الصور المدعومة
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// التأكد من وجود مجلد التحميلات
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    // إنشاء المجلدات الفرعية
    await fs.mkdir(path.join(UPLOADS_DIR, "images"), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, "pdfs"), { recursive: true });

    // إنشاء ملف .gitkeep للتأكد من تضمين المجلدات في Git
    await fs.writeFile(path.join(UPLOADS_DIR, "images", ".gitkeep"), "");
    await fs.writeFile(path.join(UPLOADS_DIR, "pdfs", ".gitkeep"), "");

    console.log("Upload directories created successfully");
  } catch (error) {
    console.error("Error creating uploads directory:", error);
    throw error;
  }
}

// POST - رفع ملف (صورة أو PDF)
export async function POST(request: NextRequest) {
  try {
    console.log("File upload request received");

    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "LAB_TECHNICIAN",
      "RECEPTIONIST",
    ]);

    if (error) {
      console.log("Authentication error:", error);
      return error;
    }

    // الحصول على نوع الملف من الاستعلام
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get("type") || "image";
    console.log("File type:", fileType);

    // التحقق من أن طريقة الطلب تدعم FormData
    if (!request.body) {
      console.error("Request body is empty");
      return NextResponse.json(
        { error: "عذراً، لا يمكن معالجة طلب رفع الملف" },
        { status: 400 }
      );
    }

    // قراءة البيانات المرفقة
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("No file found in the request");
      return NextResponse.json(
        { error: "لم يتم العثور على ملف للرفع" },
        { status: 400 }
      );
    }

    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // التحقق من حجم الملف
    if (file.size > MAX_FILE_SIZE) {
      console.error("File size exceeds limit");
      return NextResponse.json(
        {
          error: `حجم الملف يتجاوز الحد المسموح (${
            MAX_FILE_SIZE / (1024 * 1024)
          } ميجابايت)`,
        },
        { status: 400 }
      );
    }

    // التحقق من نوع الملف
    if (fileType === "image" && !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      console.error("Invalid image type:", file.type);
      return NextResponse.json(
        {
          error:
            "نوع الصورة غير مدعوم. الأنواع المدعومة هي: JPEG, PNG, GIF, WebP, SVG",
        },
        { status: 400 }
      );
    }

    if (fileType === "pdf" && file.type !== "application/pdf") {
      console.error("Invalid PDF type:", file.type);
      return NextResponse.json(
        { error: "الملف المرفق ليس ملف PDF صالح" },
        { status: 400 }
      );
    }

    // التأكد من وجود مجلد التحميلات
    await ensureUploadsDir();

    // إنشاء اسم فريد للملف
    const fileExtension = path.extname(file.name);
    const safeFileName = file.name
      .replace(fileExtension, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${uuidv4()}_${safeFileName}${fileExtension}`;

    // تحديد مسار التخزين
    const uploadDir =
      fileType === "pdf"
        ? path.join(UPLOADS_DIR, "pdfs")
        : path.join(UPLOADS_DIR, "images");
    const filePath = path.join(uploadDir, fileName);

    console.log("File will be saved to:", filePath);

    // تحويل الملف إلى مصفوفة بايت
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // حفظ الملف
    await fs.writeFile(filePath, buffer);
    console.log("File saved successfully");

    // إرجاع مسار الملف
    const fileUrl = `/uploads/${
      fileType === "pdf" ? "pdfs" : "images"
    }/${fileName}`;

    return NextResponse.json({
      message: "تم رفع الملف بنجاح",
      url: fileUrl,
      fileName: fileName,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Error handling file upload:", error);
    return handleApiError(error, "رفع ملف");
  }
}
