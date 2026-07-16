import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("proceso-access-token");
  response.cookies.delete("proceso-refresh-token");
  return response;
}
