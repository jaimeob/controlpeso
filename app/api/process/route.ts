import { getSessionUser, getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!config) return Response.json({ connected: false, data: [] });
  const requestedUserId = new URL(request.url).searchParams.get("patientId");
  // Solo el superadmin puede consultar el registro de alimentos de otra persona.
  const userId = user.role === "superadmin" && requestedUserId ? requestedUserId : user.id;
  const [response, intakeResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/proceso?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/patient_intakes?user_id=eq.${encodeURIComponent(userId)}&select=daily_calorie_goal,weekly_calorie_goal`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
  ]);
  if (!response.ok) return Response.json({ error: "No se pudo leer la tabla proceso" }, { status: 502 });
  const rows = await response.json();
  const intake = intakeResponse.ok ? (await intakeResponse.json())[0] : null;
  const dailyGoal = Number(intake?.daily_calorie_goal) || 2000;
  const weeklyGoal = Number(intake?.weekly_calorie_goal) || dailyGoal * 7;
  return Response.json({ connected: true, userId, goals: { daily: dailyGoal, weekly: weeklyGoal }, data: rows.map((row: Record<string, unknown>) => ({ ...row, createdAt: row.created_at })) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (config && id && !id.startsWith("demo-")) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const response = await fetch(`${config.url}/rest/v1/proceso?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(today.toISOString())}`, { method: "DELETE", headers: { ...supabaseHeaders(config.key), Prefer: "return=representation" } });
    if (!response.ok) return Response.json({ error: "No se pudo eliminar el alimento" }, { status: 502 });
    if (!(await response.json()).length) return Response.json({ error: "Los registros de días anteriores están cerrados." }, { status: 409 });
  }
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const food = await request.json();
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (config) {
    const row = { id: food.id, user_id: user.id, name: food.name, calories: food.calories, portion: food.portion, quantity: food.quantity || 1, unit: food.unit || "pieza", protein: food.protein, carbs: food.carbs, fat: food.fat, source: food.source || "IA", created_at: food.createdAt || new Date().toISOString() };
    const response = await fetch(`${config.url}/rest/v1/proceso`, { method: "POST", headers: { ...supabaseHeaders(config.key), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row) });
    if (!response.ok) return Response.json({ error: "No se pudo guardar en Supabase" }, { status: 502 });
    return Response.json((await response.json())[0]);
  }
  return Response.json(food);
}

export async function PATCH(request: Request) {
  const food = await request.json();
  const user = await getSessionUser();
  const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!config) return Response.json({ error: "Supabase no configurado" }, { status: 503 });
  const row = { name: food.name, calories: food.calories, portion: food.portion, quantity: food.quantity || 1, unit: food.unit || "pieza", protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0, source: food.source || "Manual" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const response = await fetch(`${config.url}/rest/v1/proceso?id=eq.${encodeURIComponent(food.id)}&user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(today.toISOString())}`, { method: "PATCH", headers: { ...supabaseHeaders(config.key), "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row) });
  if (!response.ok) return Response.json({ error: "No se pudo actualizar el alimento" }, { status: 502 });
  const rows = await response.json();
  if (!rows.length) return Response.json({ error: "Los registros de días anteriores están cerrados." }, { status: 409 });
  return Response.json(rows[0]);
}
