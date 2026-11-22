"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { saveNote, setBookmark } from "@/lib/bible/notes";

const verseOf = (formData: FormData) => {
  const v = Number(formData.get("verse"));
  if (!Number.isInteger(v) || v < 1_000_000 || v > 66_999_999) throw new Error("Ungültiger Vers");
  return v;
};

export async function toggleBookmark(formData: FormData) {
  await requireUser();
  setBookmark(verseOf(formData), formData.get("on") === "1");
  revalidatePath("/bibel", "layout");
}

export type NoteState = { message?: string; error?: string } | undefined;

export async function saveVerseNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  await requireUser();
  const text = String(formData.get("text") ?? "");
  if (text.length > 10_000) return { error: "Notiz ist zu lang." };
  saveNote(verseOf(formData), text);
  revalidatePath("/bibel", "layout");
  return { message: text.trim() ? "Notiz gespeichert." : "Notiz gelöscht." };
}
