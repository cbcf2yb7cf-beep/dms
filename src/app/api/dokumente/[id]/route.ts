import { NextResponse } from "next/server";
import { z } from "zod";
import { DOC_STATUS, DOC_TYPES } from "@/db/schema";
import { apiUser } from "@/lib/api-auth";
import { isDoc } from "@/lib/content";
import { saveAndReport } from "@/lib/documents";

const MAX_BYTES = 5 * 1024 * 1024;
const short = (max: number) => z.string().max(max);

const bodySchema = z.object({
  baseUpdatedAt: z.number().int().nonnegative(),
  manualVersion: z.boolean().optional(),
  input: z.object({
    title: short(300),
    content: z.unknown().refine(isDoc, "Ungültiger Inhalt"),
    type: z.enum(DOC_TYPES),
    status: z.enum(DOC_STATUS),
    heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    occasion: short(200),
    place: short(200),
    series: short(200),
    mainRef: short(300),
    summary: short(4000),
    favorite: z.boolean(),
    topics: z.array(short(80)).max(50),
    tags: z.array(short(80)).max(50),
  }),
});

/** Speichern aus dem Editor (auch per keepalive beim Schließen des Tabs). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Dokument ist zu groß" }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });

  const { id } = await params;
  const { input, baseUpdatedAt, manualVersion } = parsed.data;
  const result = saveAndReport(id, { ...input, content: input.content as never }, baseUpdatedAt, { manualVersion });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.reason === "conflict" ? 409 : 404 });
  }
  return NextResponse.json(result);
}
