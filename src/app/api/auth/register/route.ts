import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          message: "جميع الحقول مطلوبة: الاسم، البريد الإلكتروني، كلمة المرور",
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "البريد الإلكتروني مسجل بالفعل" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    try {
      // Check if this is the first admin user
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;

      console.log("Creating user with settings:", {
        name,
        email,
        role: isFirstUser ? "ADMIN" : "PENDING",
        approved: isFirstUser,
      });

      // Create user with simplified data structure
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: isFirstUser ? "ADMIN" : "PENDING",
          approved: isFirstUser,
        },
      });

      console.log("User created successfully:", user.id);

      // Generate JWT token - now async
      const token = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        approved: user.approved,
        sessionVersion: 1,
      });

      // Return user info and token without setting cookie
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          approved: user.approved,
        },
        token,
        message: isFirstUser
          ? "تم إنشاء حساب المسؤول الأول بنجاح"
          : "تم إنشاء الحساب بنجاح. يرجى انتظار موافقة المسؤول",
      });
    } catch (dbError: any) {
      console.error("خطأ في قاعدة البيانات أثناء التسجيل:", dbError);
      console.error("تفاصيل الخطأ:", dbError.message);

      if (dbError.meta) {
        console.error("معلومات إضافية:", dbError.meta);
      }

      return NextResponse.json(
        {
          message: "حدث خطأ في قاعدة البيانات أثناء التسجيل",
          details: dbError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("خطأ في التسجيل:", error);
    // More detailed error message
    return NextResponse.json(
      {
        message: "حدث خطأ أثناء التسجيل",
        details: error.message || "خطأ غير معروف",
      },
      { status: 500 }
    );
  }
}
