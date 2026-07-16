const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, INITIAL_ADMIN_EMAIL: email, INITIAL_ADMIN_PASSWORD: password } = process.env;

if (!url || !key || !email || !password || url.includes("tu-proyecto") || key.includes("pega_aqui")) throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD en .env.local.");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const authResponse = await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Administrador" } }) });
const authUser = await authResponse.json();
if (!authResponse.ok) throw new Error(authUser.message || "No se pudo crear el administrador.");
const profileResponse = await fetch(`${url}/rest/v1/profiles`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ id: authUser.id, email, full_name: "Superadministrador", role: "superadmin", roles: ["superadmin"] }) });
if (!profileResponse.ok) throw new Error("El usuario fue creado pero no se pudo crear su perfil. Ejecuta primero supabase/schema.sql.");
console.log(`Administrador creado: ${email}`);
