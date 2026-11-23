import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api-auth";
import { getPresentation, mediaDir } from "@/lib/presentations";
import { buildPptx } from "@/lib/slides/pptx";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const p = getPresentation((await params).id);
  if (!p) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const buffer = await buildPptx(p, mediaDir());
  const name = `${(p.title || "Präsentation").replace(/[\\/:*?"<>|]/g, "_")}.pptx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
