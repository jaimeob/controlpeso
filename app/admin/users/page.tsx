"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; email: string; full_name: string; role: string; created_at: string };

export default function UsersPage() {
  const router = useRouter(); const [users, setUsers] = useState<User[]>([]); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const load = async () => { const response = await fetch("/api/users"); if (response.ok) setUsers(await response.json()); else { setError("Solo un administrador puede ver esta página."); if (response.status === 401) router.replace("/login"); } };
  useEffect(() => { load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), fullName: form.get("fullName"), role: form.get("role") }) }); if (response.ok) { event.currentTarget.reset(); await load(); } else setError((await response.json()).error || "No fue posible crear el usuario."); setSaving(false); }
  return <main className="admin-page"><header><Link href="/">← Volver al panel</Link><span>ADMINISTRACIÓN</span></header><section className="admin-grid"><div><p className="eyebrow">USUARIOS</p><h1>Equipo de proceso</h1><p className="auth-copy">Crea cuentas para que cada persona registre sus propios alimentos.</p><div className="user-table">{users.map((user) => <article key={user.id}><div className="user-avatar">{user.full_name?.slice(0, 2).toUpperCase()}</div><div><strong>{user.full_name}</strong><small>{user.email}</small></div><em className={user.role}>{user.role === "admin" ? "Administrador" : "Usuario"}</em></article>)}{!users.length && !error && <p className="empty-state">Cargando usuarios...</p>}</div></div><form className="create-user-form" onSubmit={create}><h2>Crear usuario</h2><label>Nombre<input name="fullName" placeholder="Nombre completo" required /></label><label>Correo<input type="email" name="email" placeholder="persona@correo.com" required /></label><label>Contraseña<input type="password" name="password" minLength={8} placeholder="Mínimo 8 caracteres" required /></label><label>Rol<select name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>{error && <p className="auth-error">{error}</p>}<button disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</button></form></section></main>;
}
