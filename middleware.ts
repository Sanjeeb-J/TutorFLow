import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes that require authentication
  const isProtectedRoute = pathname.startsWith("/tutor") || pathname.startsWith("/student");
  const isLoginRoute = pathname === "/login";

  // Unauthenticated user trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user on login page — redirect to their dashboard
  if (user && isLoginRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const url = request.nextUrl.clone();
      url.pathname = `/${profile.role}`;
      return NextResponse.redirect(url);
    }
  }

  // Authenticated user on wrong role route — redirect to correct dashboard
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const isTutorRoute = pathname.startsWith("/tutor");
      const isStudentRoute = pathname.startsWith("/student");

      if (profile.role === "tutor" && isStudentRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/tutor";
        return NextResponse.redirect(url);
      }

      if (profile.role === "student" && isTutorRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
