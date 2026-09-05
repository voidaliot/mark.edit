// Adapted from simple.pdf's local diagram pipeline; see THIRD-PARTY-NOTICES.txt.
export type DiagramFormat = 'mermaid' | 'plantuml';
export type DiagramSource = { format: DiagramFormat; source: string; id: string };

export const MAX_DIAGRAM_CHARS = 50_000;
export const MAX_DIAGRAMS = 100;

export function diagramLanguage(info: string): DiagramFormat | null {
  switch (info.trim().split(/\s+/)[0]?.toLowerCase()) {
    case 'mermaid': case 'mmd': return 'mermaid';
    case 'plantuml': case 'puml': case 'pu': case 'uml': return 'plantuml';
    default: return null;
  }
}

function plantumlLines(source: string): string[] {
  let comment = false;
  return source.split('\n').map((line) => {
    let text = line.trim();
    if (comment) {
      const end = text.indexOf("'/");
      if (end < 0) return '';
      comment = false;
      text = text.slice(end + 2).trim();
    }
    while (text.startsWith("/'")) {
      const end = text.indexOf("'/", 2);
      if (end < 0) { comment = true; return ''; }
      text = text.slice(end + 2).trim();
    }
    return text.startsWith("'") ? '' : text;
  });
}

export function plantumlSources(source: string): string[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const active = plantumlLines(lines.join('\n'));
  const blocks: string[] = [];
  for (let line = 0; line < active.length; line++) {
    const start = /^@start(\w+)\b/i.exec(active[line]);
    if (!start) continue;
    const first = line;
    const endMarker = `@end${start[1].toLowerCase()}`;
    while (++line < active.length) {
      if (active[line].toLowerCase().split(/\s/)[0] === endMarker) break;
      if (/^@start\w+\b/i.test(active[line])) { line--; break; }
    }
    blocks.push(lines.slice(first, line + 1).join('\n'));
  }
  // The browser engine requires @start... as its first line.
  return blocks.length ? blocks : [source];
}

export function prepareDiagram(format: DiagramFormat, source: string): string {
  source = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!source) throw new Error('This diagram is empty.');
  if (source.length > MAX_DIAGRAM_CHARS) throw new Error('Each diagram is limited to 50,000 characters.');
  if (format === 'plantuml') {
    source = plantumlSources(source)[0].trim();
    const active = plantumlLines(source).join('\n');
    // The frame CSP also blocks requests assembled by the preprocessor.
    if (/^\s*!(?:include\w*|import)\b/im.test(active) || /%load_(?:json|yaml)\s*\(/i.test(active)
      || /^\s*!theme\s+.+\s+from\s+/im.test(active)) {
      throw new Error('External includes, imported libraries, and data files are unavailable offline. Inline their contents in the diagram.');
    }
    const unsupported = /^@startditaa\b/im.test(active) ? 'Ditaa'
      : /^@startsalt\b/im.test(active) ? 'Salt wireframe'
      : /^nwdiag\s*\{/im.test(active) ? 'Network (nwdiag)'
      : /^(listopeniconic|listsprite|stdlib)\s*$/im.test(active) ? 'Library and icon listing'
      : null;
    if (unsupported) throw new Error(`${unsupported} diagrams are not supported by the bundled PlantUML JavaScript engine.`);
    if (!/^\s*@start\w+\b/im.test(source)) source = `@startuml\n${source}\n@enduml`;
  }
  return source;
}
