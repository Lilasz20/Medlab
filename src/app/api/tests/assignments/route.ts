import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAndAuthorize } from "@/lib/auth/helpers";

// GET /api/tests/assignments - Get test assignments
export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة والصلاحيات
    const { payload, error } = await authenticateAndAuthorize(request, [
      "ADMIN",
      "LAB_TECHNICIAN",
      "RECEPTIONIST",
      "ACCOUNTANT",
    ]);

    if (error) {
      return error;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const withoutSamples = searchParams.get("withoutSamples") === "true";
    const notInvoiced = searchParams.get("notInvoiced") === "true";

    // Build filter criteria
    const where: any = {};
    if (patientId) {
      where.patientId = patientId;
    }
    if (status) {
      // التعامل مع قائمة الحالات المفصولة بفواصل
      const statusList = status.split(",");
      if (statusList.length > 0) {
        where.status = {
          in: statusList,
        };
      }
    }

    // Handle the withoutSamples filter
    if (withoutSamples) {
      where.samples = {
        none: {},
      };
    }

    // Handle notInvoiced filter
    if (notInvoiced) {
      where.invoiceItems = {
        none: {},
      };
    }

    // Fetch test assignments with related data
    const testAssignments = await prisma.testAssignment.findMany({
      where,
      include: {
        patient: true,
        test: true,
        samples: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(testAssignments);
  } catch (error) {
    console.error("Error fetching test assignments:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات تعيينات الفحوصات" },
      { status: 500 }
    );
  }
}
