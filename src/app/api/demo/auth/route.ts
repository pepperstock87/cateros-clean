import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

const DEMO_COOKIE = "cateros-demo-session";

export async function POST(request: Request) {
  try {
    const { token, viewer_name, viewer_email, viewer_company } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!serviceUrl || !serviceKey || !anonKey) {
      console.error("[Demo Auth] Missing environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Use service role for DB queries only (token validation, session logging)
    const admin = createClient(serviceUrl, serviceKey);

    // 1. Validate token and look up sandbox
    const { data: accessToken, error: tokenErr } = await admin
      .from("demo_access_tokens")
      .select("*, sandbox:demo_sandboxes(*)")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (tokenErr || !accessToken) {
      console.error("[Demo Auth] Token lookup failed:", tokenErr?.message);
      return NextResponse.json({ error: "Invalid or expired access link" }, { status: 404 });
    }

    if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "This access link has expired" }, { status: 410 });
    }

    if (accessToken.max_uses && accessToken.use_count >= accessToken.max_uses) {
      return NextResponse.json({ error: "This access link has reached its limit" }, { status: 410 });
    }

    const sandbox = accessToken.sandbox;
    if (!sandbox || sandbox.status !== "active") {
      return NextResponse.json({ error: "This demo environment is no longer available" }, { status: 404 });
    }

    // 2. Get demo user email
    const { data: demoProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", sandbox.demo_user_id)
      .single();

    if (!demoProfile?.email) {
      console.error("[Demo Auth] No profile found for demo_user_id:", sandbox.demo_user_id);
      return NextResponse.json({ error: "Demo environment misconfigured" }, { status: 500 });
    }

    // 3. Sign in as demo user with a cryptographically derived password
    //    Password is deterministic per sandbox but not guessable without the secret key
    const hmac = crypto.createHmac("sha256", serviceKey);
    hmac.update(`demo-password:${sandbox.id}`);
    const demoPassword = `cd-${hmac.digest("hex").slice(0, 32)}`;
    const response = NextResponse.json({ success: true, redirect: "/dashboard" });

    const supabase = createServerClient(serviceUrl, anonKey, {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ?.split("; ")
            .map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            }) ?? [];
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: demoProfile.email,
      password: demoPassword,
    });

    if (signInErr) {
      console.error("[Demo Auth] signInWithPassword error:", signInErr.message);
      return NextResponse.json({ error: "Failed to create demo session" }, { status: 500 });
    }

    // 4. Increment use count
    await admin
      .from("demo_access_tokens")
      .update({ use_count: (accessToken.use_count || 0) + 1 })
      .eq("id", accessToken.id);

    // 5. Record session (best-effort)
    admin.from("demo_sessions").insert({
      sandbox_id: sandbox.id,
      access_token_id: accessToken.id,
      viewer_name: viewer_name || null,
      viewer_email: viewer_email || null,
      viewer_company: viewer_company || null,
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      user_agent: request.headers.get("user-agent") || null,
    }).then(({ error }) => {
      if (error) console.error("[Demo Auth] Session record insert failed:", error.message);
    });

    // 6. Set demo session cookie (2 hour TTL)
    response.cookies.set(DEMO_COOKIE, sandbox.id, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
    });

    return response;
  } catch (err) {
    console.error("[Demo Auth] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
