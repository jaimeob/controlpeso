"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (response.ok) router.replace("/"); else setError((await response.json()).error || "No fue posible iniciar sesión.");
    setLoading(false);
  }
  return <main className="auth-page"><section className="auth-card"><div className="auth-logo">✦</div><p className="eyebrow">BIENVENIDO DE NUEVO</p><h1>Tu proceso empieza aquí.</h1><p className="auth-copy">Inicia sesión para registrar tus comidas y seguir tu progreso.</p><form onSubmit={login} className="login-form"><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" required /></label><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required /></label>{error && <p className="auth-error">{error}</p>}<button disabled={loading}>{loading ? "Entrando..." : "Iniciar sesión"}</button></form><small>proceso · Control de calorías con IA</small></section></main>;
}
