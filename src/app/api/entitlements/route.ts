import { NextResponse } from "next/server";
import { getUserEntitlements } from "@/lib/entitlements";

export async function GET() {
  const entitlements = await getUserEntitlements();
  return NextResponse.json(entitlements);
}
