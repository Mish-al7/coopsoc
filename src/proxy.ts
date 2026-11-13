import { NextResponse, type NextRequest } from "next/server";

// Quick redirect to /login when there is no session cookie at all.
// Real checks (valid session, admin role, ownership) happen in each page/action.
export function proxy(req: NextRequest) {
  if (req.cookies.has("session")) return NextResponse.next();
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/apply/:path*", "/admin/:path*", "/application/:path*"],
};
