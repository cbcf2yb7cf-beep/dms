import { parse, type HTMLElement, type Node as HtmlNode, NodeType } from "node-html-parser";
import type { JSONNode } from "@/lib/content";
import { doc, heading, headingLevelFor, list, nodeText, paragraph, text, type Mark } from "./blocks";

// HTML (aus Word über mammoth) → Tiptap-JSON. Unbekanntes wird zu Text, nichts geht verloren.

const MARK_TAGS: Record<string, Mark> = {
  strong: { type: "bold" },
  b: { type: "bold" },
  em: { type: "italic" },
  i: { type: "italic" },
  u: { type: "underline" },
  s: { type: "strike" },
  strike: { type: "strike" },
  del: { type: "strike" },
  mark: { type: "highlight" },
};
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "table", "tr", "div", "section", "article", "hr", "pre"]);

const isEl = (n: HtmlNode): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;
const tag = (n: HTMLElement) => n.tagName?.toLowerCase() ?? "";

function inline(nodes: HtmlNode[], marks: Mark[] = []): JSONNode[] {
  const out: JSONNode[] = [];
  for (const n of nodes) {
    if (n.nodeType === NodeType.TEXT_NODE) {
      const t = n.text.replace(/\s+/g, " ");
      if (t) out.push(text(t, marks));
    } else if (isEl(n)) {
      const t = tag(n);
      if (t === "br") out.push({ type: "hardBreak" });
      else if (t === "img") continue;
      else if (MARK_TAGS[t]) out.push(...inline(n.childNodes, [...marks.filter((m) => m.type !== MARK_TAGS[t].type), MARK_TAGS[t]]));
      else if (t === "a" && n.getAttribute("href")?.match(/^(https?:|mailto:)/)) {
        out.push(...inline(n.childNodes, [...marks, { type: "link", attrs: { href: n.getAttribute("href") } }]));
      } else out.push(...inline(n.childNodes, marks));
    }
  }
  return trimInline(mergeTexts(out));
}

function mergeTexts(nodes: JSONNode[]): JSONNode[] {
  const out: JSONNode[] = [];
  for (const n of nodes) {
    const prev = out.at(-1);
    if (prev?.type === "text" && n.type === "text" && JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])) prev.text += n.text ?? "";
    else out.push({ ...n });
  }
  return out;
}

function trimInline(nodes: JSONNode[]): JSONNode[] {
  const out = [...nodes];
  while (out[0]?.type === "hardBreak") out.shift();
  while (out.at(-1)?.type === "hardBreak") out.pop();
  if (out[0]?.type === "text") out[0] = { ...out[0], text: out[0].text!.replace(/^\s+/, "") };
  const last = out.length - 1;
  if (out[last]?.type === "text") out[last] = { ...out[last], text: out[last].text!.replace(/\s+$/, "") };
  return out.filter((n) => n.type !== "text" || n.text);
}

/** Absatz – oder Überschrift, wenn er nur aus kurzem Fettdruck besteht (so sind deine Gliederungspunkte geschrieben). */
function paragraphOrHeading(content: JSONNode[]): JSONNode | null {
  if (!content.length) return null;
  const texts = content.filter((n) => n.type === "text");
  const allBold = texts.length > 0 && texts.every((n) => n.marks?.some((m) => m.type === "bold") || !n.text!.trim());
  if (allBold) {
    const plain = content.map(nodeText).join("").trim();
    const level = headingLevelFor(plain);
    if (level) return heading(level, plain);
  }
  return paragraph(content);
}

function blocks(nodes: HtmlNode[]): JSONNode[] {
  const out: JSONNode[] = [];
  let loose: HtmlNode[] = [];
  const flush = () => {
    const p = paragraphOrHeading(inline(loose));
    if (p) out.push(p);
    loose = [];
  };
  for (const n of nodes) {
    if (!isEl(n) || !BLOCK_TAGS.has(tag(n))) {
      loose.push(n);
      continue;
    }
    flush();
    const t = tag(n);
    if (t === "p" || t === "pre") {
      const p = paragraphOrHeading(inline(n.childNodes));
      if (p) out.push(p);
    } else if (/^h[1-6]$/.test(t)) {
      const plain = n.text.replace(/\s+/g, " ").trim();
      if (plain) out.push(heading(Math.min(4, Math.max(2, Number(t[1]))), plain));
    } else if (t === "ul" || t === "ol") {
      const items = n.childNodes.filter((c): c is HTMLElement => isEl(c) && tag(c) === "li").map((li) => {
        const inner = blocks(li.childNodes).map((b) => (b.type === "heading" ? paragraph([text(nodeText(b), [{ type: "bold" }])]) : b));
        return inner;
      });
      if (items.length) out.push(list(t === "ol", items));
    } else if (t === "blockquote") {
      const inner = blocks(n.childNodes).filter((b) => b.type === "paragraph");
      if (inner.length) out.push({ type: "blockquote", content: inner });
    } else if (t === "table") {
      // Tabellen gibt es im Editor nicht: je Zeile ein Absatz, Zellen mit " · " getrennt.
      for (const row of n.querySelectorAll("tr")) {
        const cells = row.querySelectorAll("td, th").map((c) => c.text.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (cells.length) out.push(paragraph([text(cells.join(" · "))]));
      }
    } else if (t === "hr") {
      out.push({ type: "horizontalRule" });
    } else {
      out.push(...blocks(n.childNodes)); // div, section, li außerhalb einer Liste …
    }
  }
  flush();
  return out;
}

export function htmlToDoc(html: string): JSONNode {
  return doc(blocks(parse(html, { comment: false }).childNodes));
}
