import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function isPublicPath(pathname: string): boolean {
  return (
    /^\/(en|es)?\/?$/.test(pathname) ||
    /^\/(en|es)?\/login/.test(pathname) ||
    pathname.startsWith("/auth/") ||
    /^\/(en|es)?\/auth\//.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, Next.js internals, and static public files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/logo")
  ) {
    return NextResponse.next();
  }

  // Run next-intl middleware first (locale detection + redirect)
  const intlResponse = intlMiddleware(request);

  // Let locale redirects pass through, but reconstruct the URL using
  // forwarded headers so the Location doesn't contain the internal port (3000).
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    const location = intlResponse.headers.get('location');
    if (location) {
      const locUrl = new URL(location);
      const proto = request.headers.get('x-forwarded-proto') ?? locUrl.protocol.replace(':', '');
      const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? locUrl.hostname;
      const fixedUrl = `${proto}://${host}${locUrl.pathname}${locUrl.search}${locUrl.hash}`;
      return NextResponse.redirect(fixedUrl, { status: intlResponse.status });
    }
    return intlResponse;
  }

  // Public paths pass through after locale is resolved
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // Supabase auth check for protected routes
  let response = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          // Re-apply intl headers to preserve locale cookie
          intlResponse.headers.forEach((value, key) => {
            response.headers.set(key, value);
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const localeMatch = pathname.match(/^\/(en|es)\//);
    const locale = localeMatch ? localeMatch[1] : "en";
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
