import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // Check if user is approved
    if (!user.approved) {
      return NextResponse.json(
        {
          message:
            "لم تتم الموافقة على حسابك بعد. يرجى الانتظار حتى يوافق المسؤول على حسابك",
        },
        { status: 403 }
      );
    }

    // Generate JWT token - now async
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
      sessionVersion: user.sessionVersion || 1,
    });

    // Set the token cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
      },
      token,
    });

    // Set cookie with token - تصحيح طريقة تعيين الكوكيز
    response.cookies.set("auth-token", token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Return user info and token (excluding password)
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
