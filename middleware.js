import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl;
  // Cache agressivo para imagens otimizadas pelo Next.js
  if (url.pathname.startsWith("/_next/image")) {
    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
    return response;
  }
  return NextResponse.next();
}
