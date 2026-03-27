import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "cateros-demo-session";

/** Routes demo users can POST to */
const DEMO_WRITE_ALLOW = ["/api/demo/", "/api/auth/"];

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return NextResponse.next({ request });
  }

  // --- Demo write-blocking (before Supabase session refresh) ---
  const isDemoUser = request.cookies.has(DEMO_COOKIE);
  if (isDemoUser) {
    const method = request.method;
    const path = request.nextUrl.pathname;

    if (method !== "GET" && method !== "HEAD") {
      const isAllowed = DEMO_WRITE_ALLOW.some(p => path.startsWith(p));
      if (!isAllowed) {
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { error: "This is a demo environment. Sign up for full access." },
            { status: 403 }
          );
        }
        // For form/server-action POSTs, redirect back
        const referer = request.headers.get("referer") || "/dashboard";
        const url = new URL(referer, request.url);
        url.searchParams.set("demo_blocked", "1");
        return NextResponse.redirect(url);
      }
    }
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

  await supabase.auth.getUser();

  // Pass demo flag to downstream via header
  if (isDemoUser) {
    supabaseResponse.headers.set("x-demo-session", "1");
  }

  return supabaseResponse;
}
