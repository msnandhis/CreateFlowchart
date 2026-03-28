import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const protectedPaths = ["/dashboard", "/editor/"];

// Routes only accessible when NOT authenticated
const authOnlyPaths = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path needs auth checking
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthOnly = authOnlyPaths.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthOnly) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  // Better Auth stores session in a cookie named "better-auth.session_token"
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const hasSession = !!sessionCookie?.value;

  // Protected route without session → redirect to login
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth page with active session → redirect to dashboard
  if (isAuthOnly && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/login",
    "/signup",
  ],
};
