const names = ["jev", "openai-decisions"];
const rows: any[] = [];
for (const name of names) {
  const f = Bun.file(`results/${name}.summary.json`);
  if (await f.exists()) rows.push({ name, ...(await f.json()) });
}
const pct = (v: any) => v == null ? "-" : `${(v * 100).toFixed(2)}%`;
const num = (v: any) => v == null ? "-" : Number(v).toFixed(1);
let md = `# Decision benchmark report\n\n`;
md += `| Adapter | Completed | Accuracy | Macro F1 | Brier ↓ | ECE ↓ | p50 ms | p95 ms | p99 ms |\n`;
md += `|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
for (const r of rows) {
  md += `| ${r.name} | ${r.completed}/${r.total} | ${pct(r.accuracy)} | ${pct(r.macroF1)} | ${r.brier == null ? "-" : r.brier.toFixed(4)} | ${r.ece == null ? "-" : r.ece.toFixed(4)} | ${num(r.latencyMs.p50)} | ${num(r.latencyMs.p95)} | ${num(r.latencyMs.p99)} |\n`;
}
await Bun.write("results/report.md", md);
console.log(md);
