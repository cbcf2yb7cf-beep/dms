import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { apiUser } from "@/lib/api-auth";
import { getFile, storedPath } from "@/lib/import";

const TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  docm: "application/vnd.ms-word.document.macroEnabled.12",
  doc: "application/msword",
  rtf: "application/rtf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};

/** Originaldatei herunterladen (unverändert, mit ursprünglichem Namen). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const file = getFile((await params).id);
  if (!file) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const path = storedPath(file);
  if (!existsSync(/* turbopackIgnore: true */ path)) return NextResponse.json({ error: "Originaldatei fehlt auf der Festplatte" }, { status: 404 });
  const ascii = file.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new NextResponse(Readable.toWeb(createReadStream(/* turbopackIgnore: true */ path)) as ReadableStream, {
    headers: {
      "Content-Type": TYPES[file.ext] ?? "application/octet-stream",
      "Content-Length": String(statSync(/* turbopackIgnore: true */ path).size),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
