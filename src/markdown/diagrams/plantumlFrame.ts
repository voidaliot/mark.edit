import vizUrl from "@plantuml/core/viz-global.js?url";
import plantumlUrl from "@plantuml/core/plantuml.js?url";

const reply = (data: unknown) => window.parent.postMessage(data, window.location.origin);
let started = false;

window.addEventListener("message", async (event) => {
  if (event.source !== window.parent || event.origin !== window.location.origin || started
    || event.data?.type !== "plantuml-render" || typeof event.data.source !== "string") return;
  started = true;
  try {
    if (event.data.source.length > 50_100) throw new Error("Diagram exceeds the source limit.");
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = vizUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the bundled Graphviz engine."));
      document.head.append(script);
    });
    // TeaVM output already ships compiled. esbuild's label minifier can turn
    // its nested labeled loops into invalid JavaScript, so ship it verbatim.
    const { renderToString } = await import(/* @vite-ignore */ plantumlUrl) as typeof import("@plantuml/core");
    renderToString(event.data.source.split("\n"),
      (svg) => {
        // PlantUML reports syntax errors as a diagnostic SVG, not onError.
        const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
        const lines = Array.from(parsed.querySelectorAll("text"), (text) => text.textContent ?? "");
        if (lines[0]?.startsWith("Diagram not supported by this release of PlantUML")) {
          reply({ type: "plantuml-error", error: "This diagram type is not supported by the bundled PlantUML JavaScript engine." });
        } else if (lines[0]?.startsWith("PlantUML version ") && lines.some((line) => /^\[From .+\(line \d+\)/.test(line))) {
          reply({ type: "plantuml-error", error: lines.slice(1).join("\n").slice(0, 4_000) });
        } else reply({ type: "plantuml-result", svg });
      },
      (error) => reply({ type: "plantuml-error", error }));
  } catch (error) {
    reply({ type: "plantuml-error", error: error instanceof Error ? error.message : String(error) });
  }
});

reply({ type: "plantuml-ready" });
