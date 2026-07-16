import { getSessionUser, getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "No autorizado" }, { status: 403 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
  const response = await fetch(`${config.url}/rest/v1/profiles?select=id,email,full_name,role,created_at&order=created_at.desc`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "No se pudieron cargar los usuarios" }, { status: 502 });
  return Response.json(await response.json());
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { email, password, fullName, role = "user" } = await request.json();
  if (!email || !password || password.length < 8) return Response.json({ error: "Indica correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json" }), body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }) });
  const authData = await authResponse.json();
  if (!authResponse.ok) return Response.json({ error: authData.msg || authData.message || "No se pudo crear el usuario." }, { status: 400 });
  const profileResponse = await fetch(`${config.url}/rest/v1/profiles`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify({ id: authData.id, email, full_name: fullName || email, role: role === "admin" ? "admin" : "user" }) });
  if (!profileResponse.ok) return Response.json({ error: "Se creó la cuenta, pero falló el perfil. Ejecuta primero el SQL de Supabase." }, { status: 502 });
  return Response.json((await profileResponse.json())[0], { status: 201 });
}
