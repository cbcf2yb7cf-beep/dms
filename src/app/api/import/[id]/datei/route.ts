import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { importOne, jobExists } from "@/lib/import";

const MAX_BYTES = 100 * 1024 * 1024;

/** Eine Datei importieren. Inhalt = Dateibytes, Pfad im Header (URL-codiert). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  if (!jobExists(id)) return NextResponse.json({ error: "Import nicht gefunden" }, { status: 404 });

  let path: string;
  try {
    path = decodeURIComponent(request.headers.get("x-dms-pfad") ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  } catch {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }
  if (!path || path.includes("..")) return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return NextResponse.json({ status: "fehler", message: "Datei ist größer als 100 MB" });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ status: "fehler", message: "Datei ist größer als 100 MB" });
  const result = await importOne(id, path, bytes, { topicsFromFolders: request.headers.get("x-dms-themen") !== "0" });
  return NextResponse.json(result);
}
