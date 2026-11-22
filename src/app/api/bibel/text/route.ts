import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { bibleAvailable, textForRef, translations } from "@/lib/bible/db";
import { formatRef, parseRef } from "@/lib/bible/refs";

const MAX_VERSES_SPAN = 200; // keine ganzen Bücher in einen Block

/** Verstext einer Stelle, z. B. ?ref=Hebr 11,1-3&tr=luther1912 */
export async function GET(request: Request) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  if (!bibleAvailable()) return NextResponse.json({ error: "Bibeldaten fehlen" }, { status: 503 });
  const url = new URL(request.url);
  const ref = parseRef(url.searchParams.get("ref") ?? "");
  if (!ref) return NextResponse.json({ error: "Stelle nicht erkannt" }, { status: 400 });
  const tr = translations().find((t) => t.id === url.searchParams.get("tr")) ?? translations()[0];
  const chapters = Math.floor(ref.end / 1000) - Math.floor(ref.start / 1000);
  if (chapters > 2) {
    return NextResponse.json({ error: "Bereich zu groß – bitte höchstens drei Kapitel" }, { status: 400 });
  }
  const text = textForRef(tr.id, ref);
  if (!text) return NextResponse.json({ error: "Kein Text für diese Stelle" }, { status: 404 });
  if (text.length > MAX_VERSES_SPAN * 400) return NextResponse.json({ error: "Bereich zu groß" }, { status: 400 });
  return NextResponse.json({ label: formatRef(ref), text, translation: tr.name, translationId: tr.id });
}
