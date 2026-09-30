import { loadDataset } from "./load-dataset";

const path = process.argv[2] ?? "datasets/japanese-decision-v1";
const rows = await loadDataset(path);
const ids = new Set<string>();
const tasks: Record<string, number> = {};
const errors: string[] = [];

for (const r of rows) {
  if (ids.has(r.id)) {
    errors.push(`duplicate id: ${r.id}`);
  }
  ids.add(r.id);

  if (!(r.expected in r.choices)) {
    errors.push(`${r.id}: expected is not in choices`);
  }
  if (!r.input || !r.instruction || Object.keys(r.choices).length < 2) {
    errors.push(`${r.id}: missing required fields`);
  }

  tasks[r.task] = (tasks[r.task] ?? 0) + 1;
}

console.log({ rows: rows.length, tasks, errors });
if (errors.length) process.exit(1);
