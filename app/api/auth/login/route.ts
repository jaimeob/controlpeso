import { NextResponse } from "next/server";
import { getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Falta configurar la conexión con Supabase." }, { status: 503 });
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json" }), body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error_description || "Correo o contraseña incorrectos." }, { status: 401 });

  const result = NextResponse.json({ ok: true });
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: data.expires_in || 3600 };
  result.cookies.set("proceso-access-token", data.access_token, cookieOptions);
  result.cookies.set("proceso-refresh-token", data.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  return result;
}
