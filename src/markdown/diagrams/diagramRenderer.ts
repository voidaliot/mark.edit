import { prepareDiagram } from "./diagramSource";
import { sanitizeDiagram } from "./diagramSanitize";
import type { DiagramFormat } from "./diagramSource";

let queue: Promise<unknown> = Promise.resolve();
let nextRender = 0;
const cache = new Map<string, ReturnType<typeof sanitizeDiagram>>();
const MAX_CACHE_CHARS = 5_000_000;
let cacheChars = 0;

/** Both engines have shared rendering state; never overlap their jobs. */
export function renderDiagram(format: DiagramFormat, source: string, signal: AbortSignal) {
  const job = queue.then(async () => {
    signal.throwIfAborted();
    const prepared = prepareDiagram(format, source);
    const key = `${format}\n${prepared}`;
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    const svg = format === "mermaid" ? await renderMermaid(prepared, signal) : await renderPlantuml(prepared, signal);
    signal.throwIfAborted();
    const result = sanitizeDiagram(svg);
    const size = key.length + result.svg.length;
    if (size <= MAX_CACHE_CHARS) {
      while (cache.size && (cacheChars + size > MAX_CACHE_CHARS || cache.size >= 32)) {
        const [oldKey, oldResult] = cache.entries().next().value!;
        cacheChars -= oldKey.length + oldResult.svg.length;
        cache.delete(oldKey);
      }
      cache.set(key, result);
      cacheChars += size;
    }
    return result;
  });
  queue = job.catch(() => undefined);
  return job;
}

async function renderMermaid(source: string, signal: AbortSignal): Promise<string> {
  const { default: mermaid } = await import("mermaid");
  signal.throwIfAborted();
  mermaid.initialize({
    startOnLoad: false, securityLevel: "strict", theme: "neutral",
    fontFamily: "Segoe UI, sans-serif", htmlLabels: true,
    maxTextSize: 50_000, maxEdges: 500, suppressErrorRendering: true,
    // Strip image labels before Mermaid inserts them for measurement.
    dompurifyConfig: { FORBID_TAGS: ["img", "image"] },
    secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "suppressErrorRendering", "htmlLabels", "themeCSS", "fontFamily", "dompurifyConfig"],
  });
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-100000px;top:0;width:1200px;visibility:hidden;pointer-events:none;contain:layout style paint";
  document.body.append(container);
  try {
    return (await mermaid.render(`diagram-${++nextRender}`, source, container)).svg;
  } finally { container.remove(); }
}

function renderPlantuml(source: string, signal: AbortSignal): Promise<string> {
  // One disposable frame isolates the engine globals, and can be removed on
  // cancellation or timeout without letting a late callback corrupt the next job.
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    let finished = false;
    const frame = document.createElement("iframe");
    frame.title = "PlantUML renderer";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "position:fixed;left:-100000px;top:0;width:1200px;height:800px;visibility:hidden;border:0;pointer-events:none";
    const finish = (error?: unknown, svg?: string) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      signal.removeEventListener("abort", abort);
      frame.remove();
      if (error) reject(error);
      else resolve(svg!);
    };
    const abort = () => finish(signal.reason ?? new DOMException("Rendering cancelled", "AbortError"));
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.type === "plantuml-ready") frame.contentWindow?.postMessage({ type: "plantuml-render", source }, window.location.origin);
      else if (event.data?.type === "plantuml-result" && typeof event.data.svg === "string") finish(undefined, event.data.svg);
      else if (event.data?.type === "plantuml-error") finish(new Error(String(event.data.error)));
    };
    const timeout = window.setTimeout(() => finish(new Error("PlantUML rendering timed out. Simplify the diagram and retry.")), 30_000);
    window.addEventListener("message", receive);
    signal.addEventListener("abort", abort, { once: true });
    frame.src = new URL("plantuml.html", document.baseURI).href;
    frame.onerror = () => finish(new Error("Could not load the bundled PlantUML renderer."));
    document.body.append(frame);
  });
}
