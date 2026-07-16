"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  roles: string[];
  created_at: string;
  created_by?: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [managerRole, setManagerRole] = useState("admin");
  const roleLabel = (roles: string[]) => roles.includes("superadmin") ? "Superadmin" : [roles.includes("admin") && "Nutriólogo", roles.includes("patient") && "Paciente"].filter(Boolean).join(" y ") || "Usuario";
  const load = useCallback(async () => {
    const response = await fetch("/api/users");
    if (response.ok) { const data = await response.json(); setUsers(data.users); setManagerRole(data.managerRole); }
    else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "No fue posible cargar los usuarios.");
      if (response.status === 401 || response.status === 403) router.replace(response.status === 401 ? "/login" : "/");
    }
  }, [router]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    const form = new FormData(formElement);
    const response = await fetch("/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        email: form.get("email"),
        password: form.get("password"),
        fullName: form.get("fullName"),
        roles: form.getAll("roles"),
      }),
    });
    if (response.ok) {
      formElement.reset();
      setEditing(null);
      await load();
    } else
      setError(
        (await response.json()).error || "No fue posible crear el usuario.",
      );
    setSaving(false);
  }
  return (
    <main className="admin-page">
      <header>
        <Link href="/">← Volver al panel</Link>
        <span>ADMINISTRACIÓN</span>
      </header>
      <section className="admin-grid">
        <div>
          <p className="eyebrow">{managerRole === "superadmin" ? "EQUIPO" : "MIS PACIENTES"}</p>
          <h1>{managerRole === "superadmin" ? "Equipo de proceso" : "Pacientes a tu cargo"}</h1>
          <p className="auth-copy">
            Crea cuentas para que cada persona registre sus propios alimentos.
          </p>
          <div className="user-table">
            {users.map((user) => (
              <article key={user.id}>
                <div className="user-avatar">
                  {user.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{user.full_name}</strong>
                  <small>{user.email}</small>
                </div>
                <em className={user.role}>{roleLabel(user.roles || [user.role])}</em>
                <button className="edit-user" onClick={() => setEditing(user)}>Editar</button>
                {user.roles?.includes("patient") && <Link className="patient-file" href={`/patients/${user.id}`}>Ficha</Link>}
                {managerRole === "superadmin" && user.roles?.includes("patient") && <Link className="patient-file" href={`/reports?patientId=${user.id}`}>Reportes</Link>}
              </article>
            ))}
            {!users.length && !error && (
              <p className="empty-state">Cargando usuarios...</p>
            )}
          </div>
        </div>
        <form key={editing?.id || "new"} className="create-user-form" onSubmit={saveUser}>
          <div className="form-heading"><h2>{editing ? "Editar usuario" : "Crear usuario"}</h2>{editing && <button type="button" className="cancel-edit" onClick={() => setEditing(null)}>Cancelar</button>}</div>
          <label>
            Nombre
            <input name="fullName" placeholder="Nombre completo" defaultValue={editing?.full_name || ""} required />
          </label>
          <label>
            Correo
            <input
              type="email"
              name="email"
              placeholder="persona@correo.com"
              defaultValue={editing?.email || ""}
              readOnly={Boolean(editing)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              minLength={editing ? undefined : 8}
              placeholder={editing ? "Déjala vacía para conservarla" : "Mínimo 8 caracteres"}
              required={!editing}
            />
          </label>
          <fieldset className="role-options">
            <legend>Roles</legend>
            {editing?.roles?.includes("superadmin") && <><input type="hidden" name="roles" value="superadmin" /><p>Superadmin (protegido)</p></>}
            {managerRole === "superadmin" && <label><input type="checkbox" name="roles" value="admin" defaultChecked={editing?.roles?.includes("admin")} /> Nutriólogo</label>}
            <label><input type="checkbox" name="roles" value="patient" defaultChecked={editing ? editing.roles?.includes("patient") : true} /> Paciente</label>
            <small>Una cuenta puede tener ambos roles.</small>
          </fieldset>
          {error && <p className="auth-error">{error}</p>}
          <button disabled={saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}
          </button>
        </form>
      </section>
    </main>
  );
}
