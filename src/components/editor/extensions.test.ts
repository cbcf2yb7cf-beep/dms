// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { extensions } from "./extensions";
import { sermonTemplate, type JSONNode } from "@/lib/content";

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

const make = (content: JSONNode) => {
  editor = new Editor({ extensions, content });
  return editor;
};
// Ohne den leeren Absatz, den Tiptap ans Ende hängt, damit man nach einem Block weiterschreiben kann.
const types = (e: Editor) => {
  const nodes = e.getJSON().content ?? [];
  const last = nodes.at(-1);
  const trimmed = last?.type === "paragraph" && !last.content?.length && nodes.length > 1 ? nodes.slice(0, -1) : nodes;
  return trimmed.map((n) => n.type);
};
const para = (text: string): JSONNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const attrs = { reference: "Joh 3,16", translation: "Luther 1912" };

describe("Bibelstelle einfügen", () => {
  it("Cursor in einer Überschrift (neue Predigt): Block erscheint direkt darunter, mit Verstext", () => {
    const e = make(sermonTemplate());
    e.commands.setTextSelection(3); // in "Einleitung"
    expect(e.commands.insertBlock("bibleBlock", attrs, "Also hat Gott die Welt geliebt …")).toBe(true);

    const json = e.getJSON();
    expect(types(e).slice(0, 3)).toEqual(["heading", "bibleBlock", "paragraph"]);
    expect(json.content?.[1]).toMatchObject({ attrs, content: [{ type: "paragraph", content: [{ text: "Also hat Gott die Welt geliebt …" }] }] });
    expect(e.state.selection.$from.node(1).type.name).toBe("bibleBlock"); // Cursor steht im Block
  });

  it("leerer Absatz wird durch den Block ersetzt", () => {
    const e = make({ type: "doc", content: [para("Davor"), { type: "paragraph" }, para("Danach")] });
    e.commands.setTextSelection(8); // im leeren Absatz
    e.commands.insertBlock("bibleBlock", attrs);
    expect(types(e)).toEqual(["paragraph", "bibleBlock", "paragraph"]);
  });

  it("Absatz mit Text bleibt erhalten, Block kommt danach", () => {
    const e = make({ type: "doc", content: [para("Mein Gedanke")] });
    e.commands.setTextSelection(4);
    e.commands.insertBlock("bibleBlock", attrs, "Vers 1\nVers 2");
    expect(types(e)).toEqual(["paragraph", "bibleBlock"]);
    expect(e.getJSON().content?.[1].content).toHaveLength(2);
  });

  it("markierter Text wird eingepackt", () => {
    const e = make({ type: "doc", content: [para("Denn also hat Gott die Welt geliebt")] });
    e.commands.setTextSelection({ from: 1, to: 10 });
    e.commands.insertBlock("bibleBlock", attrs);
    expect(types(e)).toEqual(["bibleBlock"]);
    expect((e.getJSON().content?.[0] as JSONNode).content?.[0].content?.[0].text).toBe("Denn also hat Gott die Welt geliebt");
  });
});

describe("Notiz", () => {
  it("Absatz wird zur Notiz, in der Überschrift entsteht eine neue darunter", () => {
    const e = make({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Einleitung" }] }, para("Text")] });
    e.commands.setTextSelection(15); // im Absatz "Text"
    expect(e.commands.wrapIn("note")).toBe(true);
    expect(types(e)).toEqual(["heading", "note"]);

    e.commands.setTextSelection(3); // in der Überschrift
    expect(e.commands.wrapIn("note")).toBe(false);
    e.commands.insertBlock("note");
    expect(types(e)).toEqual(["heading", "note", "note"]);
  });
});
