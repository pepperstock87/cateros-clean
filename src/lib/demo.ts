import { cookies } from "next/headers";

export const DEMO_COOKIE = "cateros-demo-session";

/** Server-side: check if current request is a demo session */
export async function isDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(DEMO_COOKIE);
}

/** Server-side: get demo session ID */
export async function getDemoSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_COOKIE)?.value ?? null;
}

/** Routes that demo users ARE allowed to POST to (e.g. auth) */
export const DEMO_ALLOWED_WRITE_PATHS = [
  "/api/demo/",
  "/api/auth/",
];

/** Check if a path is exempt from demo write-blocking */
export function isDemoWriteAllowed(pathname: string): boolean {
  return DEMO_ALLOWED_WRITE_PATHS.some(p => pathname.startsWith(p));
}
