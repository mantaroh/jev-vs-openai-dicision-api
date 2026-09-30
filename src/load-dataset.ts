import type { DatasetCase } from "./types";

async function readJsonl(path: string): Promise<DatasetCase[]> {
  const text = await Bun.file(path).text();
  return text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    try {
      return JSON.parse(line) as DatasetCase;
    } catch (e) {
      throw new Error(`${path}:${i + 1}: invalid JSON: ${e}`);
    }
  });
}

export async function loadDataset(path: string): Promise<DatasetCase[]> {
  if (path.endsWith(".jsonl")) {
    return readJsonl(path);
  }

  const glob = new Bun.Glob("*.jsonl");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: path, absolute: true, onlyFiles: true })) {
    files.push(file);
  }
  files.sort();

  if (!files.length) {
    throw new Error(`No JSONL shards found in: ${path}`);
  }

  const chunks = await Promise.all(files.map(readJsonl));
  return chunks.flat();
}
