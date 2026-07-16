"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

type Food = {
  id: string;
  name: string;
  calories: number;
  portion: string;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  createdAt: string;
  source?: string;
};

const initialFoods: Food[] = [
  { id: "demo-1", name: "Avena con frutos rojos", calories: 320, portion: "1 bowl", quantity: 1, unit: "pieza", protein: 12, carbs: 48, fat: 9, createdAt: new Date().toISOString(), source: "IA" },
  { id: "demo-2", name: "Pechuga de pollo a la plancha", calories: 280, portion: "150 g", quantity: 150, unit: "gramos", protein: 42, carbs: 0, fat: 12, createdAt: new Date().toISOString(), source: "IA" },
  { id: "demo-3", name: "Huevo cocido", calories: 78, portion: "1 pieza", quantity: 1, unit: "pieza", protein: 6, carbs: 0.6, fat: 5, createdAt: new Date().toISOString(), source: "IA" },
];

function Icon({ name }: { name: "search" | "home" | "history" | "settings" | "plus" | "sparkle" | "trash" | "fire" | "target" | "clock" | "check" }) {
  const paths = {
    search: "M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z",
    home: "M3 10.5L12 3l9 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19.5v-9zM9 21v-6h6v6",
    history: "M3 12a9 9 0 109-9 9.4 9.4 0 00-6.2 2.4L3 8.2M3 3v5.2h5.2M12 7v5l3 2",
    settings: "M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM19.4 15a1.7 1.7 0 01.3 1.9l-.1.2-1.7 1.7-.2.1a1.7 1.7 0 01-1.9-.3l-1-1a7.7 7.7 0 01-1.5.6v1.4a1.7 1.7 0 01-1.7 1.7H9.2a1.7 1.7 0 01-1.7-1.7v-1.4a7.7 7.7 0 01-1.5-.6l-1 1a1.7 1.7 0 01-1.9.3l-.2-.1-1.7-1.7-.1-.2A1.7 1.7 0 011.4 15l1-1a7.7 7.7 0 01-.6-1.5H.4A1.7 1.7 0 01-1.3 10.8V8.4A1.7 1.7 0 01.4 6.7h1.4a7.7 7.7 0 01.6-1.5l-1-1A1.7 1.7 0 011.1 2.3l.1-.2L2.9.4l.2-.1A1.7 1.7 0 015 .6l1 1a7.7 7.7 0 011.5-.6V-.4A1.7 1.7 0 019.2-2.1h2.4a1.7 1.7 0 011.7 1.7V1a7.7 7.7 0 011.5.6l1-1a1.7 1.7 0 011.9-.3l.2.1 1.7 1.7.1.2a1.7 1.7 0 01-.3 1.9l-1 1a7.7 7.7 0 01.6 1.5h1.4a1.7 1.7 0 011.7 1.7v2.4a1.7 1.7 0 01-1.7 1.7h-1.4a7.7 7.7 0 01-.6 1.5l1 1z",
    plus: "M12 5v14M5 12h14", sparkle: "M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3zM19 17v4M17 19h4", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3", fire: "M12.2 22c4.3 0 7.3-2.8 7.3-7.1 0-3.2-1.8-5.8-4.6-8.9.1 2.7-1.2 4.1-2.3 4.8.3-4.2-1.8-7.1-5-8.8.4 4.5-3.2 6.7-3.2 11.4C4.4 18.8 7.7 22 12.2 22z", target: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8M16 12a4 4 0 11-8 0 4 4 0 018 0z", clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z", check: "M5 12l4 4L19 6",
  };
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

export default function Home() {
  const router = useRouter();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<{ fullName: string; role: string; roles: string[] } | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [foods, setFoods] = useState<Food[]>(() => {
    if (typeof window === "undefined") return initialFoods;
    const saved = localStorage.getItem("proceso-foods");
    return saved ? JSON.parse(saved) : initialFoods;
  });
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pieza");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", quantity: 1, unit: "pieza", calories: "", protein: "", carbs: "", fat: "" });
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingFood, setSavingFood] = useState(false);
  const [notice, setNotice] = useState("");
  const [goal, setGoal] = useState(2000);
  const [weeklyGoal, setWeeklyGoal] = useState(14000);

  useEffect(() => localStorage.setItem("proceso-foods", JSON.stringify(foods)), [foods]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      controller.abort();
      setSessionError("La sesión tardó demasiado en responder. Inicia sesión de nuevo.");
      setSessionLoading(false);
    }, 8000);

    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.user) setSession(result.user);
        else router.replace("/login");
      })
      .catch(() => {
        if (!controller.signal.aborted) router.replace("/login");
      })
      .finally(() => {
        window.clearTimeout(timer);
        setSessionLoading(false);
      });

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [router]);

  useEffect(() => {
    fetch("/api/process", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result) => {
      if (result?.connected) {
        setFoods(result.data);
        setGoal(Number(result.goals?.daily) || 2000);
        setWeeklyGoal(Number(result.goals?.weekly) || (Number(result.goals?.daily) || 2000) * 7);
      }
    }).catch(() => undefined);
  }, []);

  const todayFoods = useMemo(() => foods.filter(isToday), [foods]);
  const total = useMemo(() => todayFoods.reduce((sum, food) => sum + food.calories, 0), [todayFoods]);
  const weeklyTotal = useMemo(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);
    return foods.reduce((sum, food) => new Date(food.createdAt) >= since ? sum + food.calories : sum, 0);
  }, [foods]);
  const remaining = Math.max(goal - total, 0);
  const progress = Math.min((total / goal) * 100, 100);
  const weeklyProgress = Math.min((weeklyTotal / weeklyGoal) * 100, 100);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setNotice("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, quantity, unit }) });
      if (!response.ok) throw new Error("No se pudo analizar");
      const result = await response.json();
      const food: Food = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const saveResponse = await fetch("/api/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(food) });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || "No se pudo guardar el alimento.");
      setFoods((current) => [food, ...current]);
      setQuery(""); setQuantity(1); setUnit("pieza"); setNotice("Guardado en tu proceso de hoy");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No pudimos analizarlo. Intenta de nuevo."); }
    finally { setLoading(false); }
  }

  async function remove() {
    if (!foodToDelete) return;
    const response = await fetch(`/api/process?id=${foodToDelete.id}`, { method: "DELETE" });
    if (response.ok) { setFoods((current) => current.filter((food) => food.id !== foodToDelete.id)); setNotice("Alimento eliminado"); }
    else setNotice((await response.json()).error || "No se pudo eliminar el alimento");
    setFoodToDelete(null);
  }

  async function addManually(event: FormEvent) {
    event.preventDefault();
    if (!manual.name.trim() || !manual.calories) return;
    const food: Food = { id: editingFood?.id || crypto.randomUUID(), name: manual.name.trim(), portion: `${manual.quantity} ${manual.unit}`, quantity: Number(manual.quantity) || 1, unit: manual.unit, calories: Number(manual.calories), protein: Number(manual.protein) || 0, carbs: Number(manual.carbs) || 0, fat: Number(manual.fat) || 0, createdAt: editingFood?.createdAt || new Date().toISOString(), source: editingFood?.source || "Manual" };
    setSavingFood(true); setNotice("");
    try {
      const response = await fetch("/api/process", { method: editingFood ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(food) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "No se pudo guardar el alimento.");
      setFoods((current) => editingFood ? current.map((item) => item.id === food.id ? food : item) : [food, ...current]);
      setManualOpen(false); setEditingFood(null); setManual({ name: "", quantity: 1, unit: "pieza", calories: "", protein: "", carbs: "", fat: "" }); setNotice(editingFood ? "Alimento actualizado y guardado." : "Alimento manual guardado en tu proceso.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el alimento.");
    } finally {
      setSavingFood(false);
    }
  }

  function openManual(food?: Food) {
    setEditingFood(food || null);
    setManual(food ? { name: food.name, quantity: food.quantity || 1, unit: food.unit || "pieza", calories: String(food.calories), protein: String(food.protein), carbs: String(food.carbs), fat: String(food.fat) } : { name: "", quantity: 1, unit: "pieza", calories: "", protein: "", carbs: "", fat: "" });
    setManualOpen(true);
  }

  function isToday(food: Food) { return new Date(food.createdAt).toDateString() === new Date().toDateString(); }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }

  if (sessionLoading) return <main className="loading-page">Cargando tu proceso...</main>;
  if (!session) return <main className="loading-page"><div><p>{sessionError || "Redirigiendo al inicio de sesión..."}</p><Link href="/login">Ir a iniciar sesión</Link></div></main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="fire" /></span><span>proceso</span></div>
        <nav><button className="nav-item active"><Icon name="home" /> Inicio</button><Link className="nav-item" href="/reports"><Icon name="history" /> Reportes</Link><Link className="nav-item" href="/profile"><Icon name="settings" /> Mi ficha</Link></nav>
        <div className="sidebar-bottom"><div className="avatar">{session.fullName.slice(0, 2).toUpperCase()}</div><div><strong>{session.fullName}</strong><small>{session.roles.includes("superadmin") ? "Superadmin" : [session.roles.includes("admin") && "Nutriólogo", session.roles.includes("patient") && "Paciente"].filter(Boolean).join(" y ")}</small></div><button onClick={logout} className="logout">Salir</button></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">MIÉRCOLES, 16 JULIO 2026</p><h1>Tu día, en equilibrio.</h1></div><div className="header-actions">{(session.role === "admin" || session.role === "superadmin") && <Link className="admin-link" href="/admin/users">{session.role === "superadmin" ? "Equipo" : "Pacientes"}</Link>}<span className="streak"><Icon name="fire" /> 4 días</span><button className="mini-avatar">{session.fullName.slice(0, 2).toUpperCase()}</button></div></header>

        <div className="dashboard-grid">
          <section className="hero-card"><div className="hero-copy"><div className="ai-label"><Icon name="sparkle" /> ASISTENTE IA</div><h2>¿Qué comiste hoy?</h2><p>Indica el alimento, la cantidad y su unidad.</p><form onSubmit={analyze} className="food-form"><div className="search-box"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. huevo cocido o pechuga" aria-label="Alimento" /><button type="submit" disabled={loading}>{loading ? "Analizando..." : "Analizar"}</button></div><div className="quantity-row"><label>Cantidad<input type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label>Unidad<select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="pieza">Piezas</option><option value="gramos">Gramos</option><option value="mililitros">Mililitros</option></select></label></div></form>{notice && <div className="notice"><Icon name="check" /> {notice}</div>}</div><div className="hero-orb"><span>✦</span><i>✦</i></div></section>

          <section className="summary-card"><div className="card-heading"><span>RESUMEN DE HOY</span><button aria-label="Más opciones">•••</button></div><div className="calorie-row"><div><strong>{total.toLocaleString("es-MX")}</strong><span> kcal consumidas</span></div><div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}><b>{Math.round(progress)}%</b></div></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="goal-row"><span>Meta diaria</span><strong>{goal.toLocaleString("es-MX")} kcal <Icon name="target" /></strong></div><div className="remaining"><span>Te quedan</span><strong>{remaining.toLocaleString("es-MX")} kcal</strong></div><div className="weekly-summary"><div><span>Meta semanal</span><strong>{weeklyTotal.toLocaleString("es-MX")} / {weeklyGoal.toLocaleString("es-MX")} kcal</strong></div><div className="weekly-track"><span style={{ width: `${weeklyProgress}%` }} /></div></div></section>
        </div>

        <section className="process-section"><div className="section-title"><div><h2>Tu proceso</h2><p>Todo lo que has registrado hoy</p></div><button className="add-button" onClick={() => openManual()}><Icon name="plus" /> Agregar alimento</button></div><div className="food-list">{foods.length ? foods.map((food) => <article className="food-item" key={food.id}><div className="food-icon">{food.name.toLowerCase().includes("huevo") ? "🥚" : food.name.toLowerCase().includes("pollo") ? "🍗" : food.name.toLowerCase().includes("avena") ? "🥣" : "🍽️"}</div><div className="food-info"><h3>{food.name}</h3><p>{food.quantity ?? 1} {food.unit ?? "pieza"} <span>·</span> <em><Icon name="sparkle" /> {food.source || "IA"}</em></p></div><div className="macros"><span><b>{food.protein}g</b> proteína</span><span><b>{food.carbs}g</b> carbos</span><span><b>{food.fat}g</b> grasa</span></div><div className="food-calories"><strong>{food.calories}</strong><small>kcal</small></div>{isToday(food) ? <><button className="edit-food" onClick={() => openManual(food)} aria-label={`Editar ${food.name}`}>Editar</button><button className="delete-button" onClick={() => setFoodToDelete(food)} aria-label={`Eliminar ${food.name}`}><Icon name="trash" /></button></> : <span className="closed-food">Cerrado</span>}</article>) : <div className="empty-state">Aún no tienes alimentos registrados. Busca el primero arriba.</div>}</div></section>
        <footer><span>● Base de datos <b>proceso</b></span><span><Icon name="clock" /> Última sincronización: ahora</span></footer>
        {manualOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => { if (!savingFood) { setManualOpen(false); setEditingFood(null); } }}><form className="manual-modal" onSubmit={addManually} onMouseDown={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">{editingFood ? "CORREGIR REGISTRO" : "REGISTRO MANUAL"}</p><h2>{editingFood ? "Editar alimento" : "Agregar alimento"}</h2></div><button type="button" aria-label="Cerrar" disabled={savingFood} onClick={() => { setManualOpen(false); setEditingFood(null); }}>×</button></div><label>Alimento<input autoFocus value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} placeholder="Ej. carne asada" required /></label><div className="manual-grid"><label>Cantidad<input type="number" min="0.1" step="0.1" value={manual.quantity} onChange={(event) => setManual({ ...manual, quantity: Number(event.target.value) })} required /></label><label>Unidad<select value={manual.unit} onChange={(event) => setManual({ ...manual, unit: event.target.value })}><option value="pieza">Piezas</option><option value="gramos">Gramos</option><option value="mililitros">Mililitros</option></select></label><label>Calorías (kcal)<input type="number" min="0" value={manual.calories} onChange={(event) => setManual({ ...manual, calories: event.target.value })} required /></label></div><p className="manual-help">Macronutrientes opcionales</p><div className="manual-grid three"><label>Proteína (g)<input type="number" min="0" step="0.1" value={manual.protein} onChange={(event) => setManual({ ...manual, protein: event.target.value })} /></label><label>Carbos (g)<input type="number" min="0" step="0.1" value={manual.carbs} onChange={(event) => setManual({ ...manual, carbs: event.target.value })} /></label><label>Grasa (g)<input type="number" min="0" step="0.1" value={manual.fat} onChange={(event) => setManual({ ...manual, fat: event.target.value })} /></label></div><button className="save-manual" type="submit" disabled={savingFood}>{savingFood ? "Guardando..." : editingFood ? "Guardar corrección" : "Guardar alimento"}</button></form></div>}
        {foodToDelete && <div className="modal-backdrop" role="presentation" onMouseDown={() => setFoodToDelete(null)}><section className="confirm-modal" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">CONFIRMAR ELIMINACIÓN</p><h2>¿Eliminar “{foodToDelete.name}”?</h2><p>Este alimento dejará de contar en tus calorías y reportes de hoy.</p><div><button className="cancel-delete" onClick={() => setFoodToDelete(null)}>Cancelar</button><button className="confirm-delete" onClick={remove}>Sí, eliminar</button></div></section></div>}
      </section>
    </main>
  );
}
