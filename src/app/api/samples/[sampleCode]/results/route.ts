import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth/jwt";
import { RouteParams } from "@/types/route-handlers";

// POST /api/samples/[sampleCode]/results - تحديث نتائج العينة
export async function POST(
  request: NextRequest,
  { params }: RouteParams<{ sampleCode: string }>
) {
  try {
    // استخراج رمز العينة
    const sampleCode = params.sampleCode;
    console.log("Processing request for sample:", sampleCode);

    // التحقق من توكن المستخدم
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
      const decoded = await verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("توكن غير صالح");
      }
      userId = decoded.userId;
    } catch (err) {
      return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // التحقق من صلاحية المستخدم (يجب أن يكون فني مختبر أو مشرف)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== "LAB_TECHNICIAN" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "غير مصرح لك بإجراء هذه العملية" },
        { status: 403 }
      );
    }

    // Ensure we have the sampleCode
    if (!sampleCode) {
      return NextResponse.json({ error: "رمز العينة مطلوب" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { results } = body;

    if (!results) {
      return NextResponse.json(
        { error: "يجب توفير نتائج الفحص" },
        { status: 400 }
      );
    }

    console.log(`Searching for sample with code: ${sampleCode}`);

    // البحث عن العينة
    const sample = await prisma.sample.findFirst({
      where: { sampleCode },
      include: { testAssignment: true },
    });

    if (!sample) {
      console.log(`Sample not found: ${sampleCode}`);
      return NextResponse.json({ error: "العينة غير موجودة" }, { status: 404 });
    }

    console.log(`Found sample: ${sample.id}`);

    try {
      // تحديث نتائج العينة فقط
      const updatedSample = await prisma.sample.update({
        where: { id: sample.id },
        data: {
          results: results,
          // لا نستخدم resultEnteredById أو resultEnteredAt لأنها غير موجودة في النموذج
        },
      });

      // تغيير حالة تعيين الاختبار إلى "مكتمل"
      if (sample.testAssignment) {
        await prisma.testAssignment.update({
          where: { id: sample.testAssignmentId },
          data: { status: "COMPLETED" },
        });
      }

      console.log(`Successfully updated sample results for: ${sampleCode}`);
      return NextResponse.json(updatedSample);
    } catch (updateError: any) {
      console.error("Error during sample update:", updateError);
      return NextResponse.json(
        { error: "حدث خطأ أثناء تحديث نتائج العينة: " + updateError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating sample results:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "العينة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث نتائج العينة" },
      { status: 500 }
    );
  }
}
