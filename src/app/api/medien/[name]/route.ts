import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { apiUser } from "@/lib/api-auth";
import { isMediaName, mediaDir } from "@/lib/presentations";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const { name } = await params;
  if (!isMediaName(name)) return NextResponse.json({ error: "Ungültig" }, { status: 400 });
  const path = join(/* turbopackIgnore: true */ mediaDir(), name);
  if (!existsSync(/* turbopackIgnore: true */ path)) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return new NextResponse(readFileSync(/* turbopackIgnore: true */ path), {
    headers: { "Content-Type": TYPES[name.split(".")[1]], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
