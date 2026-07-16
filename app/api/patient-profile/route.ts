import { AppUser, getSessionUser, getSupabaseConfig, supabaseHeaders } from "@/lib/supabase-server";

async function canViewPatient(viewer: AppUser, patientId: string) {
  if (viewer.id === patientId || viewer.roles.includes("superadmin")) return true;
  if (!viewer.roles.includes("admin")) return false;
  const config = getSupabaseConfig();
  if (!config) return false;
  const response = await fetch(`${config.url}/rest/v1/profiles?id=eq.${patientId}&created_by=eq.${viewer.id}&select=id`, { headers: supabaseHeaders(config.key), cache: "no-store" });
  return response.ok && (await response.json()).length > 0;
}

function summaryFrom(measurements: Record<string, unknown>[], foods: Record<string, unknown>[], dailyGoal: number) {
  const ordered = [...measurements].sort((a, b) => String(a.measured_at).localeCompare(String(b.measured_at)));
  const startWeight = Number(ordered[0]?.weight_kg || 0) || null;
  const currentWeight = Number(ordered.at(-1)?.weight_kg || 0) || null;
  const changeKg = startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;
  const today = new Date(); const since = new Date(today); since.setDate(today.getDate() - 6); const monthSince = new Date(today); monthSince.setDate(today.getDate() - 29);
  const caloriesByDay = new Map<string, number>();
  let weeklyCalories = 0; let monthlyCalories = 0;
  for (const food of foods) {
    const created = new Date(String(food.created_at));
    const calories = Number(food.calories || 0);
    if (created >= monthSince) monthlyCalories += calories;
    if (created >= since) { weeklyCalories += calories; const key = created.toISOString().slice(0, 10); caloriesByDay.set(key, (caloriesByDay.get(key) || 0) + calories); }
  }
  const registeredDays = caloriesByDay.size;
  const averageCalories = registeredDays ? Math.round(Array.from(caloriesByDay.values()).reduce((sum, value) => sum + value, 0) / registeredDays) : null;
  return { startWeight, currentWeight, changeKg, registeredDays, averageCalories, weeklyCalories: Math.round(weeklyCalories), monthlyCalories: Math.round(monthlyCalories), dailyGoal, calorieDifference: averageCalories === null ? null : Math.round(averageCalories - dailyGoal) };
}

export async function GET(request: Request) {
  const viewer = await getSessionUser(); const config = getSupabaseConfig();
  if (!viewer) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!config) return Response.json({ error: "Supabase no configurado" }, { status: 503 });
  const patientId = new URL(request.url).searchParams.get("patientId") || viewer.id;
  if (!await canViewPatient(viewer, patientId)) return Response.json({ error: "No tienes acceso a esta ficha." }, { status: 403 });
  const [intakeResponse, profileResponse, measurementsResponse, foodsResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/patient_intakes?user_id=eq.${patientId}&select=*`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/profiles?id=eq.${patientId}&select=full_name,email`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/patient_measurements?user_id=eq.${patientId}&select=measured_at,weight_kg,waist_cm,hip_cm,arm_cm&order=measured_at.asc`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
    fetch(`${config.url}/rest/v1/proceso?user_id=eq.${patientId}&select=calories,created_at&order=created_at.desc`, { headers: supabaseHeaders(config.key), cache: "no-store" }),
  ]);
  if (!profileResponse.ok) return Response.json({ error: "No se pudo cargar el perfil del paciente." }, { status: 502 });
  const intake = intakeResponse.ok ? (await intakeResponse.json())[0] || {} : {};
  const measurements = measurementsResponse.ok ? await measurementsResponse.json() : [];
  const foods = foodsResponse.ok ? await foodsResponse.json() : [];
  const currentWeight = Number(intake.weight_kg || 0);
  if (!measurements.length && currentWeight > 0) measurements.push({ measured_at: new Date().toISOString().slice(0, 10), weight_kg: currentWeight });
  const dailyGoal = Number(intake.daily_calorie_goal || 2000);
  const profile = (await profileResponse.json())[0];
  const canManage = viewer.roles.includes("superadmin") || (viewer.roles.includes("admin") && await canViewPatient(viewer, patientId));
  const canEdit = viewer.id === patientId && (
    viewer.roles.includes("patient") || viewer.roles.includes("superadmin")
  );
  return Response.json({ data: intake, patient: profile, measurements, summary: summaryFrom(measurements, foods, dailyGoal), canEdit, canManage });
}

export async function PUT(request: Request) {
  const viewer = await getSessionUser(); const config = getSupabaseConfig();
  if (!viewer || !config) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json(); const patientId = body.patientId || viewer.id;
  const isOwnPatientProfile = viewer.id === patientId && viewer.roles.includes("patient");
  const canManage = viewer.roles.includes("superadmin") || (viewer.roles.includes("admin") && await canViewPatient(viewer, patientId));
  if (!isOwnPatientProfile && !canManage) return Response.json({ error: "No tienes permiso para actualizar esta ficha." }, { status: 403 });
  const clinicalFields = ["medical_history", "chronic_conditions", "family_history", "allergies", "medications", "dietary_habits", "meal_schedule", "food_preferences", "food_dislikes", "water_intake", "cravings", "activity_level", "sleep_hours", "stress_level", "occupation", "lab_studies", "weight_kg", "height_cm", "waist_cm", "hip_cm", "arm_cm"];
  const goalFields = ["daily_calorie_goal", "weekly_calorie_goal", "monthly_calorie_goal", "goal_weight_kg", "goal_description", "target_date"];
  const fields = canManage ? [...clinicalFields, ...goalFields] : clinicalFields;
  const numericFields = new Set(["weight_kg", "height_cm", "waist_cm", "hip_cm", "arm_cm", "daily_calorie_goal", "weekly_calorie_goal", "monthly_calorie_goal", "goal_weight_kg"]);
  const data = Object.fromEntries(fields.map((field) => {
    const value = body[field];
    // Los inputs vacíos llegan como "" desde el navegador; Postgres no puede
    // convertir esa cadena a numeric o date, así que se guarda como null.
    if ((numericFields.has(field) || field === "target_date") && (value === "" || value === undefined || value === null)) return [field, null];
    return [field, value];
  }));
  const response = await fetch(`${config.url}/rest/v1/patient_intakes`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify({ user_id: patientId, ...data, updated_at: new Date().toISOString() }) });
  if (!response.ok) { const details = await response.json().catch(() => ({})); return Response.json({ error: details.message || "No se pudo guardar la ficha clínica." }, { status: 502 }); }
  if (isOwnPatientProfile && Number(body.weight_kg) > 0) {
    await fetch(`${config.url}/rest/v1/patient_measurements`, { method: "POST", headers: supabaseHeaders(config.key, { "Content-Type": "application/json" }), body: JSON.stringify({ user_id: patientId, weight_kg: Number(body.weight_kg), waist_cm: body.waist_cm || null, hip_cm: body.hip_cm || null, arm_cm: body.arm_cm || null }) });
  }
  return Response.json((await response.json())[0]);
}
