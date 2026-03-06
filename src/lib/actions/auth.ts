"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  company_name: z.string().min(2, "Company name required"),
});

export type AuthState = { error?: string; success?: string };

export async function loginAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signupAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"), password: formData.get("password"),
    full_name: formData.get("full_name"), company_name: formData.get("company_name"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name, company_name: parsed.data.company_name } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed." };
  await supabase.from("profiles").insert({ id: data.user.id, email: parsed.data.email, full_name: parsed.data.full_name, company_name: parsed.data.company_name });
  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
