import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiUser } from "@/lib/api-auth";
import { finishJob, jobExists } from "@/lib/import";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await apiUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  if (!jobExists(id)) return NextResponse.json({ error: "Import nicht gefunden" }, { status: 404 });
  finishJob(id);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
