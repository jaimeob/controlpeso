import { cookies } from "next/headers";

export type AppRole = "superadmin" | "admin" | "patient";
export type AppUser = { id: string; email: string; fullName: string; role: AppRole; roles: AppRole[] };

export function normalizeRoles(value: unknown, fallback: unknown = "patient"): AppRole[] {
  const candidates = Array.isArray(value) && value.length ? value : [fallback];
  const roles = candidates.filter((role): role is AppRole => role === "superadmin" || role === "admin" || role === "patient");
  return roles.length ? Array.from(new Set(roles)) : ["patient"];
}

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  return "patient";
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key && !url.includes("tu-proyecto") && !key.includes("pega_aqui") ? { url, key } : null;
}

export function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function getSessionUser(): Promise<AppUser | null> {
  const config = getSupabaseConfig();
  const accessToken = (await cookies()).get("proceso-access-token")?.value;
  if (!config || !accessToken) return null;

  const authResponse = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!authResponse.ok) return null;
  const authUser = await authResponse.json();
  let profileResponse = await fetch(`${config.url}/rest/v1/profiles?id=eq.${authUser.id}&select=id,email,full_name,role,roles`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  // Durante la migración aún puede no existir la columna roles. La sesión
  // continúa funcionando con el rol anterior hasta que se ejecute el SQL.
  if (!profileResponse.ok) profileResponse = await fetch(`${config.url}/rest/v1/profiles?id=eq.${authUser.id}&select=id,email,full_name,role`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  const profile = profileResponse.ok ? (await profileResponse.json())[0] : null;

  const roles = normalizeRoles(profile?.roles, profile?.role);
  return { id: authUser.id, email: authUser.email, fullName: profile?.full_name || authUser.user_metadata?.full_name || authUser.email, role: primaryRole(roles), roles };
}
