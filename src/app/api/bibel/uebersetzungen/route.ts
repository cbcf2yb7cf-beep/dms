import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { bibleAvailable, translations } from "@/lib/bible/db";

export async function GET() {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  if (!bibleAvailable()) return NextResponse.json({ translations: [] });
  return NextResponse.json({ translations: translations().map(({ id, name, short, lang }) => ({ id, name, short, lang })) });
}
