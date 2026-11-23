"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createTopic, deleteTopic, renameTopic, setParent } from "@/lib/topics";

export type TopicState = { error?: string; message?: string } | undefined;

const idOf = (fd: FormData) => {
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Ungültiges Thema");
  return id;
};

export async function renameTopicAction(_prev: TopicState, fd: FormData): Promise<TopicState> {
  await requireUser();
  const name = String(fd.get("name") ?? "");
  if (!name.trim()) return { error: "Bitte einen Namen eingeben." };
  const r = renameTopic(idOf(fd), name);
  revalidatePath("/", "layout");
  if (r.merged) redirect(`/themen/${r.id}?zusammengefuehrt=1`);
  return { message: "Umbenannt." };
}

export async function setParentAction(_prev: TopicState, fd: FormData): Promise<TopicState> {
  await requireUser();
  const parent = String(fd.get("parent") ?? "");
  try {
    setParent(idOf(fd), parent && /^[0-9a-f-]{36}$/.test(parent) ? parent : null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Nicht möglich" };
  }
  revalidatePath("/themen", "layout");
  return { message: "Gespeichert." };
}

export async function deleteTopicAction(fd: FormData) {
  await requireUser();
  deleteTopic(idOf(fd));
  revalidatePath("/", "layout");
  redirect("/themen");
}

export async function createTopicAction(_prev: TopicState, fd: FormData): Promise<TopicState> {
  await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen eingeben." };
  const id = createTopic(name);
  revalidatePath("/themen");
  redirect(`/themen/${id}`);
}
