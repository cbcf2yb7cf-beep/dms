"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { undoJob } from "@/lib/import";

export async function undoImport(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Ungültiger Import");
  undoJob(id);
  revalidatePath("/", "layout");
}
