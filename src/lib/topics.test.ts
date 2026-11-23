import { describe, expect, it } from "vitest";
import { createDocument, getDocument, listDocuments, saveDocument, type SaveInput } from "./documents";
import { chaptersForTopic, deleteTopic, listTopics, relatedTopics, renameTopic, setParent } from "./topics";

const base = (over: Partial<SaveInput>): SaveInput => ({
  title: "T",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Text mit Röm 8,28." }] }] },
  type: "predigt",
  status: "fertig",
  heldOn: null,
  occasion: "",
  place: "",
  series: "",
  mainRef: "",
  summary: "",
  favorite: false,
  topics: [],
  tags: [],
  ...over,
});

const make = (over: Partial<SaveInput>) => {
  const id = createDocument("predigt");
  saveDocument(id, base(over), Date.now() + 1000);
  return id;
};
const topicId = (name: string) => listTopics().find((t) => t.name === name)!.id;

describe("Themennetz", () => {
  it("Zählung, Querverbindungen, Bibelkapitel", () => {
    make({ title: "Gnade A", topics: ["Gnadenthema", "Rechtfertigung"] });
    make({ title: "Gnade B", topics: ["Gnadenthema", "Rechtfertigung"], mainRef: "Röm 3,24" });
    make({ title: "Gnade C", topics: ["Gnadenthema"] });
    const id = topicId("Gnadenthema");
    expect(listTopics().find((t) => t.id === id)?.n).toBe(3);
    expect(relatedTopics(id)[0]).toMatchObject({ name: "Rechtfertigung", n: 2 });
    expect(chaptersForTopic(id)[0]).toMatchObject({ label: "Röm 8", n: 3 });
  });

  it("Umbenennen; gleicher Name führt zusammen, Suche findet neuen Namen", () => {
    const a = make({ title: "Doc Heil", topics: ["Heilsgewisheit"] }); // Tippfehler
    make({ title: "Doc Heil 2", topics: ["Heilsgewissheit"] });
    const wrong = topicId("Heilsgewisheit");
    const r = renameTopic(wrong, "heilsgewissheit");
    expect(r.merged).toBe(true);
    expect(listTopics().filter((t) => t.name.toLowerCase() === "heilsgewissheit")).toHaveLength(1);
    expect(getDocument(a)!.topics).toEqual(["Heilsgewissheit"]);
    renameTopic(topicId("Heilsgewissheit"), "Heilsgewissheit (Thema)");
    expect(listDocuments({ q: "Heilsgewissheit" }).items.map((d) => d.title)).toEqual(expect.arrayContaining(["Doc Heil", "Doc Heil 2"]));
  });

  it("Oberthema ohne Kreise, Löschen behält Dokumente", () => {
    make({ title: "X", topics: ["Ober", "Unter"] });
    const ober = topicId("Ober");
    const unter = topicId("Unter");
    setParent(unter, ober);
    expect(() => setParent(ober, unter)).toThrow();
    deleteTopic(ober);
    expect(listTopics().find((t) => t.id === unter)?.parentId).toBeNull();
    expect(listDocuments({ q: "X" }).items.some((d) => d.title === "X")).toBe(true);
  });

  it("Archiv-Filter: ganzes Bibelbuch", () => {
    make({ title: "Römerbrief-Predigt", mainRef: "Röm 12,1" });
    expect(listDocuments({ book: 45 }).items.map((d) => d.title)).toContain("Römerbrief-Predigt");
    expect(listDocuments({ book: 1 }).items.map((d) => d.title)).not.toContain("Römerbrief-Predigt");
  });
});
