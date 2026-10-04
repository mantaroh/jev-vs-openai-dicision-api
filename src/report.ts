import { estimateCost, loadPricing } from "./cost";

const names = ["jev", "clef", "clef-flash", "openai-decisions"];
const rows: any[] = [];
for (const name of names) {
  const f = Bun.file(`results/${name}.summary.json`);
  if (await f.exists()) rows.push({ name, ...(await f.json()) });
}
const pricing = await loadPricing();
const pct = (v: any) => v == null ? "-" : `${(v * 100).toFixed(2)}%`;
const num = (v: any) => v == null ? "-" : Number(v).toFixed(1);
const usd = (v: any, digits: number) => v == null ? "-" : `$${Number(v).toFixed(digits)}`;

let md = `# Decision benchmark report\n\n`;
md += `## Quality\n\n`;
md += `| Adapter | Completed | Accuracy | Macro F1 | Brier ↓ | ECE ↓ | p50 ms | p95 ms | p99 ms | Input tokens | Output tokens |\n`;
md += `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
for (const r of rows) {
  md += `| ${r.name} | ${r.completed}/${r.total} | ${pct(r.accuracy)} | ${pct(r.macroF1)} | ${r.brier == null ? "-" : r.brier.toFixed(4)} | ${r.ece == null ? "-" : r.ece.toFixed(4)} | ${num(r.latencyMs.p50)} | ${num(r.latencyMs.p95)} | ${num(r.latencyMs.p99)} | ${r.usage.inputTokens} | ${r.usage.outputTokens} |\n`;
}

md += `\n## Latency breakdown\n\n`;
md += `TTFB = request start to response headers, Body = headers to body fully read.\n\n`;
md += `| Adapter | TTFB p50 | TTFB p95 | Body p50 | Body p95 | Total p50 | Total p95 | Total p99 |\n`;
md += `|---|---:|---:|---:|---:|---:|---:|---:|\n`;
for (const r of rows) {
  const t = r.timingMs;
  md += `| ${r.name} | ${num(t?.ttfb.p50)} | ${num(t?.ttfb.p95)} | ${num(t?.body.p50)} | ${num(t?.body.p95)} | ${num(t?.total.p50)} | ${num(t?.total.p95)} | ${num(t?.total.p99)} |\n`;
}

md += `\n## Cost\n\n`;
md += `Prices come from \`pricing.json\`. Failed requests have no token usage and are not counted.\n\n`;
md += `| Adapter | Input $/1M tok | Output $/1M tok | Total USD | USD per 1k requests | Price checked |\n`;
md += `|---|---:|---:|---:|---:|---|\n`;
for (const r of rows) {
  const p = pricing[r.name];
  const cost = estimateCost(r.usage, r.completed, p);
  md += `| ${r.name} | ${usd(p?.inputUsdPerMTok, 4)} | ${usd(p?.outputUsdPerMTok, 4)} | ${usd(cost?.totalUsd, 4)} | ${usd(cost?.usdPer1kRequests, 4)} | ${p?.checkedAt || "-"} |\n`;
}

await Bun.write("results/report.md", md);
console.log(md);
