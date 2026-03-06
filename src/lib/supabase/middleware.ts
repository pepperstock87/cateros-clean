import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Subscription paywall: redirect authenticated users without active subscription to /pricing
  const allowedPaths = ["/pricing", "/billing", "/check-email", "/login", "/signup", "/api/", "/auth/", "/settings"];
  const pathname = request.nextUrl.pathname;
  const isAllowedPath = pathname === "/" || allowedPaths.some((path) => pathname.startsWith(path));

  if (user && !isAllowedPath) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      // If the query fails, let the user through rather than blocking them
      if (!error && profile) {
        const status = profile.subscription_status;
        if (status !== "active" && status !== "trialing") {
          const url = request.nextUrl.clone();
          url.pathname = "/pricing";
          // Copy cookies to the redirect response so auth session is preserved
          const redirectResponse = NextResponse.redirect(url);
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value);
          });
          return redirectResponse;
        }
      }
    } catch {
      // On any error, let the user through
    }
  }

  return supabaseResponse;
}
