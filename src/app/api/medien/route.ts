import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { storeImage } from "@/lib/presentations";

const MAX = 20 * 1024 * 1024;

/** Bild für eine Folie hochladen (Inhalt = Bildbytes). */
export async function POST(request: Request) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > MAX) return NextResponse.json({ error: "Bild fehlt oder ist größer als 20 MB" }, { status: 400 });
  try {
    return NextResponse.json({ name: storeImage(bytes) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ungültiges Bild" }, { status: 400 });
  }
}
