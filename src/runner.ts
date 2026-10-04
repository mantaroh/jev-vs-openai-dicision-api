import { loadDataset } from "./load-dataset";
import type { DecisionAdapter, DecisionResult } from "./types";
import { JevAdapter } from "./adapters/jev";
import { CloudflareClefAdapter } from "./adapters/cloudflare-clef";
import { CloudflareClefFlashAdapter } from "./adapters/cloudflare-clef-flash";
import { OpenAIDecisionsAdapter } from "./adapters/openai-decisions";
import { summarize } from "./metrics";

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const adapterName = arg("--adapter", "jev")!;
const datasetPath = arg("--dataset", "datasets/japanese-decision-v1")!;
const limit = Number(arg("--limit", "0"));
const concurrency = Math.max(1, Number(arg("--concurrency", "4")));

const adapters: Record<string, () => DecisionAdapter> = {
  jev: () => new JevAdapter(),
  clef: () => new CloudflareClefAdapter(),
  "clef-flash": () => new CloudflareClefFlashAdapter(),
  "openai-decisions": () => new OpenAIDecisionsAdapter()
};

if (!adapters[adapterName]) {
  throw new Error(`Unknown adapter: ${adapterName}`);
}

const adapter = adapters[adapterName]();
let dataset = await loadDataset(datasetPath);
if (limit > 0) dataset = dataset.slice(0, limit);

const results: DecisionResult[] = new Array(dataset.length);
let cursor = 0;

async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= dataset.length) return;

    const c = dataset[i];
    try {
      results[i] = {
        id: c.id,
        expected: c.expected,
        ...(await adapter.decide(c))
      };
    } catch (e) {
      results[i] = {
        id: c.id,
        expected: c.expected,
        adapter: adapter.name,
        model: "unknown",
        choice: "",
        latencyMs: 0,
        error: String(e)
      };
    }

    console.error(`[${i + 1}/${dataset.length}] ${c.id} => ${results[i].choice || "ERROR"}`);
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

await Bun.write("results/.gitkeep", "");
await Bun.write(
  `results/${adapterName}.jsonl`,
  results.map(r => JSON.stringify(r)).join("\n") + "\n"
);
await Bun.write(
  `results/${adapterName}.summary.json`,
  JSON.stringify(summarize(results), null, 2) + "\n"
);

console.log(JSON.stringify(summarize(results), null, 2));
