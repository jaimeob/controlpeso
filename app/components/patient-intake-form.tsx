"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Intake = Record<string, string | number | null | undefined>;
type Summary = { startWeight: number | null; currentWeight: number | null; changeKg: number | null; registeredDays: number; averageCalories: number | null; weeklyCalories: number; monthlyCalories: number; dailyGoal: number; calorieDifference: number | null };

const initial: Intake = { medical_history: "", chronic_conditions: "", family_history: "", allergies: "", medications: "", dietary_habits: "", meal_schedule: "", food_preferences: "", food_dislikes: "", water_intake: "", cravings: "", activity_level: "", sleep_hours: "", stress_level: "", occupation: "", lab_studies: "", weight_kg: "", height_cm: "", waist_cm: "", hip_cm: "", arm_cm: "", daily_calorie_goal: 2000, weekly_calorie_goal: 14000, monthly_calorie_goal: 60000, goal_weight_kg: "", goal_description: "", target_date: "" };
const sections = [
  ["Historial de salud", [["Historial clínico y médico", "medical_history", "Padecimientos, cirugías o antecedentes relevantes"], ["Enfermedades crónicas", "chronic_conditions", "Diabetes, hipertensión, tiroides, etc."], ["Antecedentes familiares", "family_history", "Padecimientos relevantes en tu familia"], ["Alergias e intolerancias", "allergies", "Alimentos o sustancias que debes evitar"], ["Medicamentos y suplementos", "medications", "Indica dosis si la conoces"]]],
  ["Alimentación", [["Hábitos de alimentación", "dietary_habits", "Describe cómo comes en un día habitual"], ["Horarios de comida", "meal_schedule", "Ej. desayuno 8:00, comida 14:00"], ["Alimentos que disfrutas", "food_preferences", "Preferencias y comidas frecuentes"], ["Alimentos que no consumes", "food_dislikes", "Rechazos, restricciones o alimentos que evitas"], ["Agua y antojos", "water_intake", "Vasos de agua al día y antojos frecuentes"]]],
  ["Estilo de vida", [["Actividad física", "activity_level", "Tipo, frecuencia y duración"], ["Sueño", "sleep_hours", "Horas y calidad de sueño"], ["Estrés y ocupación", "stress_level", "Nivel de estrés y trabajo/actividad diaria"], ["Estudios de laboratorio", "lab_studies", "Glucosa, lípidos, química sanguínea u otros resultados recientes"]]],
] as const;

export default function PatientIntakeForm({ patientId }: { patientId?: string }) {
  const router = useRouter();
  const [data, setData] = useState<Intake>(initial); const [patient, setPatient] = useState<{ full_name: string; email: string } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null); const [canEdit, setCanEdit] = useState(false); const [canManage, setCanManage] = useState(false); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true);
  const url = patientId ? `/api/patient-profile?patientId=${patientId}` : "/api/patient-profile";
  async function load() {
    const response = await fetch(url, { cache: "no-store" }); if (response.status === 401) { router.replace("/login"); return; }
    const result = await response.json(); if (!response.ok) { setMessage(result.error || "No se pudo cargar la ficha."); return; }
    setData({ ...initial, ...result.data }); setPatient(result.patient); setSummary(result.summary); setCanEdit(result.canEdit); setCanManage(result.canManage);
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load().finally(() => setLoading(false)); }, 0); return () => window.clearTimeout(timer); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/patient-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, patientId }) });
    const result = await response.json(); setMessage(response.ok ? "Perfil del paciente guardado." : result.error || "No se pudo guardar la ficha."); if (response.ok) await load();
  }
  const value = (key: string) => String(data[key] ?? "");
  const editable = canEdit || canManage;
  const weightText = summary?.changeKg == null ? "Sin historial aún" : summary.changeKg < 0 ? `${Math.abs(summary.changeKg)} kg menos` : summary.changeKg === 0 ? "Sin cambio" : `${summary.changeKg} kg más`;
  const weeklyGoal = Number(data.weekly_calorie_goal || Number(data.daily_calorie_goal || 2000) * 7);
  const monthlyGoal = Number(data.monthly_calorie_goal || Number(data.daily_calorie_goal || 2000) * 30);
  const weeklyDifference = summary ? weeklyGoal - summary.weeklyCalories : null;
  const pendingWeight = summary?.currentWeight && Number(data.goal_weight_kg) ? Math.round((summary.currentWeight - Number(data.goal_weight_kg)) * 10) / 10 : null;
  const energyEquivalent = weeklyDifference === null ? null : Math.round((weeklyDifference / 7700) * 100) / 100;
  if (loading) return <main className="profile-page"><p>Cargando perfil del paciente...</p></main>;
  return <main className="profile-page"><header className="profile-header patient-header"><Link href="/">← Volver al dashboard</Link><div className="patient-identity"><div className="patient-avatar">{(patient?.full_name || "P").slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">PERFIL DEL PACIENTE</p><h1>{patient?.full_name || "Paciente"}</h1><p>{patient?.email} · Historial y seguimiento nutricional</p></div></div></header>
    <section className="patient-summary">
      <article><span>Meta diaria</span><strong>{Number(data.daily_calorie_goal || 2000).toLocaleString("es-MX")} kcal</strong><small>{data.goal_description || "Pendiente de definir por nutriólogo"}</small></article>
      <article><span>Semana</span><strong>{summary ? `${summary.weeklyCalories.toLocaleString("es-MX")} kcal` : "Sin registro"}</strong><small>Meta: {Number(data.weekly_calorie_goal || Number(data.daily_calorie_goal || 2000) * 7).toLocaleString("es-MX")} kcal</small></article>
      <article><span>Mes</span><strong>{summary ? `${summary.monthlyCalories.toLocaleString("es-MX")} kcal` : "Sin registro"}</strong><small>Meta: {monthlyGoal.toLocaleString("es-MX")} kcal</small></article>
      <article><span>Peso actual</span><strong>{summary?.currentWeight ? `${summary.currentWeight} kg` : "Sin registro"}</strong><small>Meta: {data.goal_weight_kg ? `${data.goal_weight_kg} kg` : "Sin definir"}</small></article>
      <article><span>Cambio corporal</span><strong>{weightText}</strong><small>Con base en mediciones registradas</small></article>
      <article><span>Promedio diario</span><strong>{summary?.averageCalories ? `${summary.averageCalories} kcal` : "Sin registros"}</strong><small>{summary?.registeredDays || 0} días registrados en la última semana</small></article>
    </section>
    <section className="patient-history"><div><p className="eyebrow">SEGUIMIENTO</p><h2>Historia y progreso</h2></div><p>{summary?.calorieDifference == null ? "Registra alimentos para calcular el promedio diario." : summary.calorieDifference <= 0 ? `Promedio ${Math.abs(summary.calorieDifference)} kcal por debajo de la meta diaria.` : `Promedio ${summary.calorieDifference} kcal por encima de la meta diaria.`}</p></section>
    <form className="intake-form" onSubmit={save}>
      <section className="intake-section goal-section"><h2>Objetivo del tratamiento</h2><p className="goal-heading">Metas de consumo</p><div className="goal-grid"><label>Meta diaria (kcal)<input disabled={!canManage} type="number" min="0" value={value("daily_calorie_goal")} onChange={(event) => setData({ ...data, daily_calorie_goal: event.target.value })} /></label><label>Meta semanal (kcal)<input disabled={!canManage} type="number" min="0" value={value("weekly_calorie_goal")} onChange={(event) => setData({ ...data, weekly_calorie_goal: event.target.value })} /></label><label>Meta mensual (kcal)<input disabled={!canManage} type="number" min="0" value={value("monthly_calorie_goal")} onChange={(event) => setData({ ...data, monthly_calorie_goal: event.target.value })} /></label></div><p className="goal-heading">Metas y avance de peso</p><div className="weight-goals"><article><span>Peso inicial</span><strong>{summary?.startWeight ? `${summary.startWeight} kg` : "Sin registro"}</strong></article><article><span>Peso actual</span><strong>{summary?.currentWeight ? `${summary.currentWeight} kg` : "Sin registro"}</strong></article><label>Peso meta (kg)<input disabled={!canManage} type="number" min="0" step="0.1" value={value("goal_weight_kg")} onChange={(event) => setData({ ...data, goal_weight_kg: event.target.value })} /></label><article><span>Distancia a la meta</span><strong>{pendingWeight === null ? "Sin definir" : pendingWeight > 0 ? `${pendingWeight} kg por bajar` : pendingWeight < 0 ? `${Math.abs(pendingWeight)} kg por subir` : "Meta alcanzada"}</strong></article></div><div className="energy-note">Semana: {summary ? `${summary.weeklyCalories.toLocaleString("es-MX")} de ${weeklyGoal.toLocaleString("es-MX")} kcal` : "sin registros"}. {energyEquivalent === null ? "" : `${energyEquivalent >= 0 ? `Déficit equivalente estimado: ${energyEquivalent} kg.` : `Exceso energético equivalente estimado: ${Math.abs(energyEquivalent)} kg.`}`} Esta equivalencia no reemplaza el peso medido.</div><div className="goal-grid"><label>Fecha objetivo<input disabled={!canManage} type="date" value={value("target_date")} onChange={(event) => setData({ ...data, target_date: event.target.value })} /></label><label className="goal-description">Indicaciones del nutriólogo<textarea disabled={!canManage} value={value("goal_description")} onChange={(event) => setData({ ...data, goal_description: event.target.value })} placeholder="Ej. mejorar hábitos, reducir peso o aumentar masa muscular" /></label></div></section>
      {sections.map(([title, fields]) => <section key={title} className="intake-section"><h2>{title}</h2><div className="intake-fields">{fields.map(([label, key, placeholder]) => <label key={key}>{label}<textarea disabled={!editable} value={value(key)} placeholder={placeholder} onChange={(event) => setData({ ...data, [key]: event.target.value })} /></label>)}</div></section>)}
      <section className="intake-section"><h2>Medidas corporales</h2><p className="measure-help">Al guardar tu propio perfil, el peso se añade al historial de seguimiento.</p><div className="measure-grid">{[["Peso (kg)", "weight_kg"], ["Estatura (cm)", "height_cm"], ["Cintura (cm)", "waist_cm"], ["Cadera (cm)", "hip_cm"], ["Brazo (cm)", "arm_cm"]].map(([label, key]) => <label key={key}>{label}<input disabled={!editable} type="number" min="0" step="0.1" value={value(key)} onChange={(event) => setData({ ...data, [key]: event.target.value })} /></label>)}</div></section>
      {message && <p className={message.includes("guardado") ? "profile-success" : "auth-error"}>{message}</p>}{editable && <button className="save-intake">Guardar perfil</button>}
    </form></main>;
}
