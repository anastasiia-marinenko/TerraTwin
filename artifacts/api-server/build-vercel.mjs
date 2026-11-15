// Збирає Express-застосунок у ОДИН готовий JS-файл для Vercel Function.
// Завдяки цьому Vercel більше не перевіряє TypeScript-код бекенду (саме це падало).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  outfile: path.resolve(artifactDir, "dist/vercel/app.cjs"),
  platform: "node",
  target: "node22",
  bundle: true,
  format: "cjs",
  logLevel: "info",
  // pino-pretty потрібен лише локально (у production логер його не використовує)
  external: ["pino-pretty"],
});
