import { getSessionUser, getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

export async function GET() {
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!config) return Response.json({ connected: false, data: [] });
  const response = await fetch(`${config.url}/rest/v1/proceso?user_id=eq.${user.id}&select=*&order=created_at.desc`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "No se pudo leer la tabla proceso" }, { status: 502 });
  const rows = await response.json();
  return Response.json({ connected: true, data: rows.map((row: Record<string, unknown>) => ({ ...row, createdAt: row.created_at })) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (config && id && !id.startsWith("demo-")) {
    await fetch(`${config.url}/rest/v1/proceso?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.id}`, { method: "DELETE", headers: supabaseHeaders(config.key) });
  }
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const food = await request.json();
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (config) {
    const row = { id: food.id, user_id: user.id, name: food.name, calories: food.calories, portion: food.portion, protein: food.protein, carbs: food.carbs, fat: food.fat, source: food.source || "IA", created_at: food.createdAt || new Date().toISOString() };
    const response = await fetch(`${config.url}/rest/v1/proceso`, { method: "POST", headers: { ...supabaseHeaders(config.key), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row) });
    if (!response.ok) return Response.json({ error: "No se pudo guardar en Supabase" }, { status: 502 });
    return Response.json((await response.json())[0]);
  }
  return Response.json(food);
}
