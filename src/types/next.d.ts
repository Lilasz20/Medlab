// Declaration file for Next.js types
declare module "next/server" {
  export interface NextRequest extends Request {
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string, options?: any): void;
      delete(name: string): void;
    };
    nextUrl: URL;
    headers: Headers;
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(
      destination: string | URL,
      init?: ResponseInit
    ): NextResponse;
    static next(init?: ResponseInit): NextResponse;

    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string, options?: any): void;
      delete(name: string): void;
    };
  }
}
