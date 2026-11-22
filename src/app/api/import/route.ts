import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/api-auth";
import { createJob } from "@/lib/import";

const schema = z.object({ label: z.string().max(200), total: z.number().int().min(0).max(100_000) });

/** Neuen Import-Lauf anlegen. */
export async function POST(request: Request) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  return NextResponse.json({ id: createJob(parsed.data.label || "Import", parsed.data.total) });
}
