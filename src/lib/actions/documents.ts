"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOC_TYPES, type DocType } from "@/db/schema";
import { requireUser } from "@/lib/session";
import {
  createDocument,
  deleteForever,
  duplicateDocument,
  moveToTrash,
  restoreFromTrash,
  restoreVersion,
  setArchived,
  setFavorite,
} from "@/lib/documents";

// Alle Actions bekommen ihre Werte aus versteckten Formularfeldern (kein .bind im Client).

const idOf = (formData: FormData) => {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Ungültige Dokument-ID");
  return id;
};

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/archiv/${id}`);
}

export async function newDocument(formData: FormData) {
  await requireUser();
  const type = String(formData.get("type") ?? "predigt") as DocType;
  const id = createDocument(DOC_TYPES.includes(type) ? type : "predigt");
  redirect(`/archiv/${id}`);
}

export async function toggleFavorite(formData: FormData) {
  await requireUser();
  const id = idOf(formData);
  setFavorite(id, formData.get("favorite") === "1");
  refresh(id);
}

export async function toggleArchive(formData: FormData) {
  await requireUser();
  const id = idOf(formData);
  setArchived(id, formData.get("archived") === "1");
  refresh(id);
}

export async function trashDocument(formData: FormData) {
  await requireUser();
  const id = idOf(formData);
  moveToTrash(id);
  refresh(id);
  if (formData.get("redirect") === "1") redirect("/archiv");
}

export async function untrashDocument(formData: FormData) {
  await requireUser();
  const id = idOf(formData);
  restoreFromTrash(id);
  refresh(id);
}

export async function destroyDocument(formData: FormData) {
  await requireUser();
  deleteForever(idOf(formData));
  refresh();
}

export async function duplicate(formData: FormData) {
  await requireUser();
  const copy = duplicateDocument(idOf(formData));
  refresh();
  redirect(`/archiv/${copy}`);
}

export async function restoreVersionAction(formData: FormData) {
  await requireUser();
  const id = idOf(formData);
  const versionId = Number(formData.get("versionId"));
  if (!Number.isInteger(versionId)) throw new Error("Ungültige Version");
  restoreVersion(id, versionId);
  refresh(id);
  redirect(`/archiv/${id}`);
}
