import { mergeAttributes, Node, type CommandProps } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockInsert: {
      /**
       * Fügt einen Bibel- oder Notiz-Block ein: um markierten Text herum, sonst anstelle eines
       * leeren Absatzes oder direkt nach dem aktuellen Absatz/der Überschrift. Cursor landet im Block.
       */
      insertBlock: (name: "bibleBlock" | "note", attrs?: Record<string, string>, text?: string) => ReturnType;
    };
  }
}

function insertBlock(name: "bibleBlock" | "note", attrs: Record<string, string> = {}, text = "") {
  return ({ state, tr, dispatch, commands }: CommandProps) => {
    const { selection, schema } = state;
    const type = schema.nodes[name];
    if (!type) return false;

    // Markierter Text ohne eigenen Verstext: den markierten Bereich einpacken.
    if (!selection.empty && !text.trim() && commands.wrapIn(name, attrs)) return true;

    const paragraphs = text
      .split(/\n\s*\n|\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => schema.nodes.paragraph.create(null, schema.text(t)));
    const node = type.create(attrs, paragraphs.length ? paragraphs : [schema.nodes.paragraph.create()]);

    const { $from } = selection;
    let from: number;
    let to: number;
    if ($from.depth === 0) {
      from = to = selection.from;
    } else {
      const block = $from.node(1); // oberster Block, in dem der Cursor steht
      const isEmptyParagraph = block.type.name === "paragraph" && block.content.size === 0;
      from = isEmptyParagraph ? $from.before(1) : $from.after(1);
      to = isEmptyParagraph ? $from.after(1) : from;
    }
    if (!dispatch) return true;
    tr.replaceWith(from, to, node);
    tr.setSelection(TextSelection.create(tr.doc, from + node.nodeSize - 2)); // Ende des letzten Absatzes im Block
    tr.scrollIntoView();
    return true;
  };
}

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
  addCommands() {
    return { insertBlock: (name, attrs, text) => insertBlock(name, attrs, text) };
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
