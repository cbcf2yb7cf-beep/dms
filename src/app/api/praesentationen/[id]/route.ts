import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { savePresentation, saveSchema } from "@/lib/presentations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const raw = await request.text();
  if (raw.length > 3_000_000) return NextResponse.json({ error: "Zu groß" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Daten" }, { status: 400 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = savePresentation((await params).id, parsed.data, force);
  if (!result.ok) return NextResponse.json(result, { status: result.reason === "conflict" ? 409 : 404 });
  return NextResponse.json(result);
}
