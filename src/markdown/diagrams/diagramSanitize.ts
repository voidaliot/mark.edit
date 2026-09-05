import DOMPurify from "dompurify";

function localStyles(style: CSSStyleDeclaration): string {
  for (const property of Array.from(style)) {
    const value = style.getPropertyValue(property);
    const decoded = value.replace(/\\([0-9a-f]{1,6})\s?|\\(.)/gi,
      (_match, hex: string | undefined, char: string | undefined) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)) : char ?? "");
    if (/url\s*\(/i.test(decoded) && !/^url\(\s*["']?#[\w:.-]+["']?\s*\)$/i.test(decoded.trim())) {
      style.removeProperty(property);
    }
  }
  return style.cssText;
}

/** Exported SVGs must remain safe when opened as standalone documents too. */
export function sanitizeDiagram(svg: string): { svg: string; width: number; height: number } {
  if (svg.length > 10_000_000) throw new Error("Rendered diagram is too large.");
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["foreignObject", "div", "span", "p", "br", "b", "i", "strong", "em"],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
    FORBID_TAGS: ["a", "image", "script", "animate", "animateTransform", "set"],
    RETURN_DOM_FRAGMENT: true,
  });
  // Mermaid HTML labels contain HTML void tags and named entities. Parse them
  // as DOM, then serialize as XML; parsing the HTML serialization as SVG XML
  // rejects otherwise valid <br> labels and &nbsp; text.
  const root = clean.firstElementChild;
  if (!root || root.localName !== "svg" || clean.children.length !== 1) {
    throw new Error("The renderer did not return a valid SVG diagram.");
  }
  if (!root.querySelector("path, rect, circle, ellipse, polygon, polyline, line, text, foreignObject, use")) {
    throw new Error("The renderer returned an empty diagram. A styles-only file needs diagram content.");
  }
  for (const element of [root, ...root.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      if (attribute.localName === "base" || (["href", "src"].includes(attribute.localName) && !/^#[\w:.-]+$/.test(attribute.value))) {
        element.removeAttributeNode(attribute);
      } else if (attribute.localName !== "style" && /url\s*\(/i.test(attribute.value)
        && !/^url\(\s*["']?#[\w:.-]+["']?\s*\)$/i.test(attribute.value.trim())) {
        element.removeAttributeNode(attribute);
      }
    }
    if (element.hasAttribute("style")) {
      const holder = document.createElement("span");
      holder.style.cssText = element.getAttribute("style") ?? "";
      element.setAttribute("style", localStyles(holder.style));
    }
    if (element.localName === "style") {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(element.textContent ?? "");
      // Drop @import, fonts, and animations; retain static diagram styles.
      element.textContent = Array.from(sheet.cssRules).filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
        .map((rule) => `${rule.selectorText}{${localStyles(rule.style)}}`).join("\n");
    }
  }
  const box = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const width = box?.length === 4 ? box[2]! : parseFloat(root.getAttribute("width") ?? "");
  const height = box?.length === 4 ? box[3]! : parseFloat(root.getAttribute("height") ?? "");
  if (![width, height].every((value) => Number.isFinite(value) && value > 0 && value <= 32_768)) {
    throw new Error("Rendered diagram dimensions are invalid or exceed 32,768 pixels.");
  }
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  return { svg: new XMLSerializer().serializeToString(root), width, height };
}
