import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/api-auth";
import { jobExists, recordSkip } from "@/lib/import";

const schema = z.object({ path: z.string().min(1).max(1000), status: z.enum(["uebersprungen", "fehler"]), message: z.string().max(1000) });

/** Im Browser übersprungene oder nicht lesbare Dateien protokollieren. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  if (!jobExists(id)) return NextResponse.json({ error: "Import nicht gefunden" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  return NextResponse.json(recordSkip(id, parsed.data.path, parsed.data.status, parsed.data.message));
}
