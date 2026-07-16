import { AppRole, getSessionUser, getSupabaseConfig, normalizeRoles, primaryRole, supabaseHeaders } from "@/lib/supabase-server";

function allowedRoles(role: AppRole) {
  return role === "superadmin" ? ["admin", "patient"] : role === "admin" ? ["patient"] : [];
}

async function requireManager() {
  const user = await getSessionUser();
  return user && (user.roles.includes("superadmin") || user.roles.includes("admin")) ? user : null;
}

async function getTarget(config: NonNullable<ReturnType<typeof getSupabaseConfig>>, id: string) {
  let response = await fetch(`${config.url}/rest/v1/profiles?id=eq.${id}&select=id,email,full_name,role,roles,created_by`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) response = await fetch(`${config.url}/rest/v1/profiles?id=eq.${id}&select=id,email,full_name,role,created_by`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  return response.ok ? (await response.json())[0] : null;
}

function requestedRoles(value: unknown, fallback?: unknown) {
  return normalizeRoles(value, fallback);
}

export async function GET() {
  const manager = await requireManager();
  if (!manager) return Response.json({ error: "No autorizado" }, { status: 403 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
  const filter = manager.roles.includes("superadmin") ? "" : `&created_by=eq.${manager.id}`;
  // Algunas instalaciones iniciales no tenían la columna created_at. No la
  // necesitamos para mostrar usuarios, así que evitamos bloquear la pantalla.
  let response = await fetch(`${config.url}/rest/v1/profiles?select=id,email,full_name,role,roles,created_by&order=full_name.asc${filter}`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) response = await fetch(`${config.url}/rest/v1/profiles?select=id,email,full_name,role,created_by&order=full_name.asc${filter}`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return Response.json({ error: details.message || "No se pudieron cargar los usuarios" }, { status: 502 });
  }
  const users = await response.json();
  return Response.json({ users: users.map((entry: Record<string, unknown>) => ({ ...entry, roles: requestedRoles(entry.roles, entry.role) })), managerRole: manager.role });
}

export async function POST(request: Request) {
  const manager = await requireManager();
  if (!manager) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { email, password, fullName, roles: rawRoles, role = "patient" } = await request.json();
  const roles = requestedRoles(rawRoles, role);
  if (!email || !password || password.length < 8) return Response.json({ error: "Indica correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
  if (roles.some((item) => !allowedRoles(manager.role).includes(item))) return Response.json({ error: "No tienes permiso para crear ese tipo de cuenta." }, { status: 403 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json" }), body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }) });
  const authData = await authResponse.json();
  if (!authResponse.ok) return Response.json({ error: authData.msg || authData.message || "No se pudo crear el usuario." }, { status: 400 });
  const profileResponse = await fetch(`${config.url}/rest/v1/profiles`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify({ id: authData.id, email, full_name: fullName || email, role: primaryRole(roles), roles, created_by: manager.id }) });
  if (!profileResponse.ok) return Response.json({ error: "Se creó la cuenta, pero falló el perfil. Ejecuta primero el SQL de Supabase." }, { status: 502 });
  return Response.json((await profileResponse.json())[0], { status: 201 });
}

export async function PATCH(request: Request) {
  const manager = await requireManager();
  if (!manager) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { id, fullName, roles: rawRoles, role, password } = await request.json();
  const roles = requestedRoles(rawRoles, role);
  if (!id || !fullName) return Response.json({ error: "Indica el nombre del usuario." }, { status: 400 });
  if (password && password.length < 8) return Response.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  const config = getSupabaseConfig();
  if (!config) return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
  const target = await getTarget(config, id);
  if (!target) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
  const targetRoles = requestedRoles(target.roles, target.role);
  if (manager.role === "admin" && (target.created_by !== manager.id || roles.some((item) => item !== "patient"))) return Response.json({ error: "Solo puedes modificar a tus propios pacientes." }, { status: 403 });
  if (manager.role === "superadmin" && targetRoles.includes("superadmin") && !roles.includes("superadmin")) return Response.json({ error: "No puedes quitar el rol de superadmin." }, { status: 403 });
  if (manager.role === "superadmin" && !targetRoles.includes("superadmin") && roles.some((item) => !allowedRoles(manager.role).includes(item))) return Response.json({ error: "Rol no válido." }, { status: 400 });
  const authPayload: Record<string, unknown> = { user_metadata: { full_name: fullName } };
  if (password) authPayload.password = password;
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users/${id}`, { method: "PUT", headers: supabaseHeaders(config.key, { "Content-Type": "application/json" }), body: JSON.stringify(authPayload) });
  if (!authResponse.ok) return Response.json({ error: "No se pudo actualizar la cuenta." }, { status: 502 });
  const profileResponse = await fetch(`${config.url}/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify({ full_name: fullName, role: primaryRole(roles), roles }) });
  if (!profileResponse.ok) { const details = await profileResponse.json(); return Response.json({ error: details.message || "No se pudo actualizar el perfil." }, { status: 502 }); }
  return Response.json((await profileResponse.json())[0]);
}
