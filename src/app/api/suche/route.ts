import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { quickSearch } from "@/lib/documents";
import { formatRef, parseRef } from "@/lib/bible/refs";

/** Schnellsuche für ⌘K: Dokumente nach Titel/Reihe/Haupttext und erkannte Bibelstelle. */
export async function GET(request: Request) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;

  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ docs: [], stelle: null });
  const ref = parseRef(q);
  return NextResponse.json({ docs: quickSearch(q), stelle: ref ? formatRef(ref) : null });
}
