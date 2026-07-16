import { getSessionUser, getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

function dateBounds(range: string, rawDate?: string) {
  const selected = rawDate ? new Date(`${rawDate}T12:00:00`) : new Date();
  if (Number.isNaN(selected.valueOf())) throw new Error("Fecha inválida");
  const start = new Date(selected); start.setHours(0, 0, 0, 0);
  if (range === "month") start.setDate(1);
  if (range === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); }
  const end = new Date(start);
  if (range === "day") end.setDate(end.getDate() + 1);
  if (range === "week") end.setDate(end.getDate() + 7);
  if (range === "month") end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export async function GET(request: Request) {
  const user = await getSessionUser(); const config = getSupabaseConfig();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!config) return Response.json({ error: "Supabase no configurado" }, { status: 503 });
  const { searchParams } = new URL(request.url); const range = searchParams.get("range") || "week";
  const requestedUserId = searchParams.get("patientId");
  // Un superadmin puede auditar los reportes de cualquier paciente. Los demás
  // continúan viendo únicamente su propio historial.
  const userId = user.role === "superadmin" && requestedUserId ? requestedUserId : user.id;
  const { start, end } = dateBounds(range, searchParams.get("date") || undefined);
  const query = new URLSearchParams({ select: "name,calories,protein,carbs,fat,created_at", user_id: `eq.${userId}`, created_at: `gte.${start.toISOString()}`, order: "created_at.asc" });
  query.append("created_at", `lt.${end.toISOString()}`);
  const response = await fetch(`${config.url}/rest/v1/proceso?${query}`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "No se pudo crear el reporte" }, { status: 502 });
  const rows = await response.json();
  const totals = rows.reduce((acc: { calories: number; protein: number; carbs: number; fat: number }, row: Record<string, string>) => ({ calories: acc.calories + Number(row.calories), protein: acc.protein + Number(row.protein), carbs: acc.carbs + Number(row.carbs), fat: acc.fat + Number(row.fat) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const daily = new Map<string, number>();
  for (const row of rows) { const key = new Date(row.created_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }); daily.set(key, (daily.get(key) || 0) + Number(row.calories)); }
  const roundedTotals = { calories: Math.round(totals.calories * 10) / 10, protein: Math.round(totals.protein * 10) / 10, carbs: Math.round(totals.carbs * 10) / 10, fat: Math.round(totals.fat * 10) / 10 };
  return Response.json({ range, userId, start: start.toISOString(), end: end.toISOString(), totalFoods: rows.length, totals: roundedTotals, daily: Array.from(daily, ([label, calories]) => ({ label, calories: Math.round(calories) })) });
}
