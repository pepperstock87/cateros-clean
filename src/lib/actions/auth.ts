"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  company_name: z.string().optional(),
  invite: z.string().optional(),
  redirectTo: z.string().optional(),
});

export type AuthState = { error?: string; success?: string };

export async function loginAction(formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  const redirectTo = formData.get("redirectTo") as string | null;
  if (redirectTo && redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }
  redirect("/dashboard");
}

export async function signupAction(formData: FormData): Promise<AuthState> {
  const isInvite = formData.get("invite") === "1";
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name") || undefined,
    invite: formData.get("invite") || undefined,
    redirectTo: formData.get("redirectTo") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // For non-invite signups, require company name
  if (!isInvite && !parsed.data.company_name?.trim()) {
    return { error: "Company name is required" };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackNext = parsed.data.redirectTo || "/dashboard";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, company_name: parsed.data.company_name || "" },
      emailRedirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent(callbackNext)}`,
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed." };

  // Profile is auto-created by the on_auth_user_created DB trigger.
  if (parsed.data.company_name) {
    await supabase.from("profiles").update({ company_name: parsed.data.company_name }).eq("id", data.user.id);
  }

  // Only create default organization for non-invite signups
  if (!isInvite) {
    const companyName = parsed.data.company_name || parsed.data.full_name || "My Organization";
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);

    const { data: org } = await supabase.from("organizations").insert({
      name: companyName,
      slug,
      organization_type: "caterer",
      primary_contact_email: parsed.data.email,
    }).select("id").single();

    if (org) {
      await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: data.user.id,
        role: "owner",
        status: "active",
      });
      await supabase.from("profiles")
        .update({ current_organization_id: org.id })
        .eq("id", data.user.id);
    }
  }

  // For invite signups, redirect to the join page to accept the invite
  const redirectTo = parsed.data.redirectTo;
  if (redirectTo && redirectTo.startsWith("/")) {
    // Check if email confirmation is required
    if (data.session) {
      // User is already confirmed (e.g., email confirmation disabled)
      redirect(redirectTo);
    }
    // Email confirmation required — redirect to check-email with the redirect preserved
    redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
