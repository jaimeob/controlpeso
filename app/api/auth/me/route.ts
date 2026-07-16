import { getSessionUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json({ user });
}
