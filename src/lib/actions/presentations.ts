"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createFromDocument, createPresentation, deletePresentation, duplicatePresentation } from "@/lib/presentations";

const uuid = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  if (!/^[0-9a-f-]{36}$/.test(s)) throw new Error("Ungültige ID");
  return s;
};

export async function newPresentation() {
  await requireUser();
  const id = createPresentation({ title: "" });
  redirect(`/praesentationen/${id}`);
}

export async function presentationFromDocument(formData: FormData) {
  await requireUser();
  const id = createFromDocument(uuid(formData.get("id")));
  revalidatePath("/praesentationen");
  redirect(`/praesentationen/${id}`);
}

export async function duplicatePresentationAction(formData: FormData) {
  await requireUser();
  const id = duplicatePresentation(uuid(formData.get("id")));
  revalidatePath("/praesentationen");
  redirect(`/praesentationen/${id}`);
}

export async function deletePresentationAction(formData: FormData) {
  await requireUser();
  deletePresentation(uuid(formData.get("id")));
  revalidatePath("/praesentationen");
  redirect("/praesentationen");
}
