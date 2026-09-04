import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // NOTE: /festival/checkout and /colorfun/checkout are intentionally NOT blocked or
  // intercepted at the server/middleware level to avoid redirect loops.
  // Their auth guard is handled completely client-side in their respective page components.
  if (
    pathname === "/festival/checkout" ||
    pathname === "/colorfun/checkout" ||
    pathname === "/cfr/checkout"
  ) {
    return supabaseResponse;
  }

  // Refresh session - important for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If there is no session and user tries to access protected routes, redirect to /login
  if (!session) {
    if (
      pathname.startsWith("/admin") ||
      pathname === "/security" ||
      pathname.startsWith("/security/") ||
      pathname.startsWith("/dashboard")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
