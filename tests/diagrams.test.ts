import { describe, expect, it } from 'vitest';
import { renderMarkdownPreview } from '../src/editor/markdownRenderer';
import { diagramLanguage, plantumlSources, prepareDiagram } from '../src/markdown/diagrams/diagramSource';

describe('diagram fences', () => {
  it('recognizes aliases, case, metadata, tilde fences, and nested Markdown', () => {
    const parsed = renderMarkdownPreview('# Overview\n\n```Mermaid title\ngraph TD\nA-->B\n```\n\n> ~~~puml\n> Alice -> Bob\n> ~~~\n\n- Nested:\n\n  ```uml\n  Bob -> Alice\n  ```\n\n```js\nconst x = 1;\n```\n');
    expect(parsed.diagrams.map((item) => item.format)).toEqual(['mermaid', 'plantuml', 'plantuml']);
    expect(parsed.html).toContain('<h1>Overview</h1>');
    expect(parsed.html).toContain('const x = 1;');
    expect(parsed.html.match(/data-markitty-diagram=/g)).toHaveLength(3);
    for (const alias of ['mmd', 'MERMAID']) expect(diagramLanguage(alias)).toBe('mermaid');
    for (const alias of ['pu', 'puml', 'uml', 'PLANTUML']) expect(diagramLanguage(alias)).toBe('plantuml');
    expect(diagramLanguage('javascript')).toBeNull();
  });

  it('keeps raw HTML and images while preventing forged diagram slots', () => {
    const parsed = renderMarkdownPreview('<h2 align="center">Heading</h2>\n\n<div data-markitty-diagram="0"><script>alert(1)</script></div>\n\n![cat](cat.png)\n\n```html\n<script>alert(2)</script>\n```');
    expect(parsed.diagrams).toHaveLength(0);
    expect(parsed.html).not.toMatch(/<script|data-markitty-diagram=/);
    expect(parsed.html).toContain('&lt;script&gt;');
    expect(parsed.html).toContain('<h2 align="center">Heading</h2>');
    expect(parsed.html).toContain('src="cat.png"');
  });

  it('renders all PlantUML blocks in one fence, ignoring surrounding commentary', () => {
    const source = "A preamble\n/'\n@startuml\nnot a diagram\n@enduml\n'/\n@startuml\nAlice -> Bob\n@enduml\nBetween diagrams\n@startwbs\n* Root\n@endwbs\nFooter";
    const parsed = renderMarkdownPreview(`~~~plantuml\n${source}\n~~~`);
    expect(parsed.diagrams.map((diagram) => diagram.source)).toEqual(['@startuml\nAlice -> Bob\n@enduml', '@startwbs\n* Root\n@endwbs']);
    expect(plantumlSources("' heading\n@startuml\nA -> B\n@enduml\ntrailing text")).toEqual(['@startuml\nA -> B\n@enduml']);
  });

  it('bounds rendering without losing surrounding Markdown or excess source', () => {
    const parsed = renderMarkdownPreview('```mmd\ngraph TD\nA-->B\n```\n'.repeat(101) + '\nAfter diagrams');
    expect(parsed.diagrams).toHaveLength(100);
    expect(parsed.html).toContain('at most 100 diagrams');
    expect(parsed.html).toContain('language-mmd');
    expect(parsed.html).toContain('After diagrams');
  });
});

describe('diagram source preparation', () => {
  it('normalizes sources and wraps marker-free PlantUML', () => {
    expect(prepareDiagram('plantuml', '\uFEFF Alice -> Bob\r\n')).toBe('@startuml\nAlice -> Bob\n@enduml');
    expect(prepareDiagram('mermaid', '\uFEFFgraph TD\r\nA-->B\r\n')).toBe('graph TD\nA-->B');
    expect(() => prepareDiagram('mermaid', ' ')).toThrow(/empty/);
    expect(() => prepareDiagram('plantuml', 'A'.repeat(50_001))).toThrow(/50,000/);
  });

  it('rejects external includes and data while permitting comments and local definitions', () => {
    for (const source of ['!include https://example.com/a', '!include_once <aws>', '!import x', '%load_json("file")', '%load_yaml("file")', '!theme blue from https://example.com']) {
      expect(() => prepareDiagram('plantuml', source)).toThrow(/unavailable offline/);
    }
    expect(() => prepareDiagram('plantuml', "@startuml\n/'\n!include https://example.com/file\n'/\n!define NAME Alice\nNAME -> Bob\n@enduml")).not.toThrow();
  });

  it('explains bundled engine limitations', () => {
    for (const source of ['@startditaa\n+--+\n@endditaa', '@startsalt\n{ [Button] }\n@endsalt', '@startuml\nnwdiag {\n}\n@enduml', '@startuml\nlistopeniconic\n@enduml']) {
      expect(() => prepareDiagram('plantuml', source)).toThrow(/not supported by the bundled PlantUML JavaScript engine/);
    }
  });
});
