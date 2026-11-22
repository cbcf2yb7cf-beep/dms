import JSZip from "jszip";

// Kleine, echte Office-Dateien für Tests (ohne Beispieldateien im Repository).

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** DOCX mit Absätzen; "**Text**" wird fett geschrieben (wie deine Zwischenüberschriften). */
export async function makeDocx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const body = paragraphs
    .map((p) => {
      const bold = /^\*\*(.*)\*\*$/.exec(p);
      return bold ? `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${esc(bold[1])}</w:t></w:r></w:p>` : `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`;
    })
    .join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

/** PPTX: Folien als Absatzlisten, optional Sprechernotizen. Reihenfolge laut presentation.xml (hier absichtlich umgekehrt zu den Dateinamen). */
export async function makePptx(slides: { paragraphs: string[]; notes?: string }[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const ns = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;
  const n = slides.length;
  // Folie i liegt in slide{n-i}.xml
  zip.file("ppt/presentation.xml", `<p:presentation ${ns}><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("")}</p:sldIdLst></p:presentation>`);
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slides.map((_, i) => `<Relationship Id="rId${i + 1}" Type="slide" Target="slides/slide${n - i}.xml"/>`).join("")}</Relationships>`,
  );
  slides.forEach((s, i) => {
    const file = n - i;
    const paras = s.paragraphs.map((p) => `<a:p>${p.split("\n").map((part, j) => `${j ? "<a:br><a:rPr lang=\"de-DE\"/></a:br>" : ""}<a:r><a:t>${esc(part)}</a:t></a:r>`).join("")}</a:p>`).join("");
    zip.file(`ppt/slides/slide${file}.xml`, `<p:sld ${ns}><p:cSld><p:spTree><p:sp><p:txBody>${paras}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
    if (s.notes) {
      zip.file(`ppt/slides/_rels/slide${file}.xml.rels`, `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="notesSlide" Target="../notesSlides/notesSlide${file}.xml"/></Relationships>`);
      zip.file(`ppt/notesSlides/notesSlide${file}.xml`, `<p:notes ${ns}><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${esc(s.notes)}</a:t></a:r></a:p><a:p><a:r><a:t>${file}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`);
    }
  });
  return zip.generateAsync({ type: "uint8array" });
}
