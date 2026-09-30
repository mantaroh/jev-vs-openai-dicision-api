import type { DatasetCase } from "./types";

export async function loadDataset(path: string): Promise<DatasetCase[]> {
  const text = await Bun.file(path).text();
  return text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line) as DatasetCase; }
    catch (e) { throw new Error(`${path}:${i + 1}: invalid JSON: ${e}`); }
  });
}
