import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const seen = new Set();
const notices = [];

function visit(name, from) {
  const require = createRequire(pathToFileURL(join(from, "package.json")));
  let directory;
  try { directory = dirname(require.resolve(`${name}/package.json`)); }
  catch {
    try { directory = dirname(require.resolve(name)); }
    catch { return; } // Type-only or optional dependency without a JS entry.
  }
  while (directory !== parse(directory).root) {
    const manifestPath = join(directory, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.name === name) {
        const id = `${name}@${manifest.version}`;
        if (seen.has(id)) return;
        seen.add(id);
        const files = readdirSync(directory).filter((file) => /^(licen[cs]e|copying|notice|copyright)(\.|$)/i.test(file));
        const license = files.map((file) => readFileSync(join(directory, file), "utf8")).join("\n\n");
        notices.push(`${id}\nLicense: ${manifest.license ?? "See upstream package"}\nhttps://www.npmjs.com/package/${name}/v/${manifest.version}\n\n${license}`);
        if (name === "@plantuml/core") {
          const viz = readFileSync(join(directory, "viz-global.js"), "utf8");
          notices.push(`Bundled Viz.js / Graphviz third-party notices\n${viz.slice(0, viz.indexOf("*/") + 2)}`);
        }
        for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency, directory);
        return;
      }
    }
    directory = dirname(directory);
  }
}

const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const name of Object.keys(manifest.dependencies)) visit(name, root);
const sourceNotices = readFileSync(join(root, 'THIRD-PARTY-NOTICES.txt'), 'utf8');
const output = `Markitty frontend third-party notices\n\n${sourceNotices}\n\n${notices.join("\n\n" + "=".repeat(78) + "\n\n")}\n`;
writeFileSync(join(root, "dist", "THIRD-PARTY-NOTICES.txt"), output);
console.log(`Included notices for ${seen.size} frontend packages.`);
