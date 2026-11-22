import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";

/** Bibelstelle: eingerückter Block mit Stellenangabe (oben) und Übersetzung (unten). */
export const BibleBlock = Node.create({
  name: "bibleBlock",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return {
      reference: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-reference") ?? "",
        renderHTML: (attrs) => ({ "data-reference": attrs.reference }),
      },
      translation: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-translation") ?? "",
        renderHTML: (attrs) => ({ "data-translation": attrs.translation }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="bible"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "bible", class: "bible-block" }), 0];
  },
});

/** Persönliche Notiz – im Manuskript sichtbar, aber farblich abgesetzt (z. B. „nicht vorlesen“). */
export const Note = Node.create({
  name: "note",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML() {
    return [{ tag: 'aside[data-type="note"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-type": "note", class: "note-block" }), 0];
  },
});

export const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  Highlight,
  BibleBlock,
  Note,
  Placeholder.configure({
    placeholder: ({ node }) => (node.type.name === "heading" ? "Überschrift" : "Schreiben … (Überschriften erscheinen links in der Gliederung)"),
  }),
];
