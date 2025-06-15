import { NextRequest } from "next/server";

// Define the correct type for Next.js 15 route handler context
export type RouteParams<
  T extends Record<string, string> = Record<string, string>
> = {
  params: T;
};

// Type for route handlers
export type RouteHandler<
  T = any,
  P extends Record<string, string> = Record<string, string>
> = (request: NextRequest, context: RouteParams<P>) => Promise<T>;
