import type { DecisionResult } from "./types";

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.ceil((p / 100) * a.length) - 1));
  return a[i];
};

export function summarize(results: DecisionResult[]) {
  const valid = results.filter(r => !r.error);
  const labels = [...new Set(valid.flatMap(r => [r.expected, r.choice]))].sort();
  const accuracy = valid.length ? valid.filter(r => r.choice === r.expected).length / valid.length : 0;

  const f1s = labels.map(label => {
    const tp = valid.filter(r => r.expected === label && r.choice === label).length;
    const fp = valid.filter(r => r.expected !== label && r.choice === label).length;
    const fn = valid.filter(r => r.expected === label && r.choice !== label).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  });
  const macroF1 = f1s.length ? f1s.reduce((a,b) => a+b, 0) / f1s.length : 0;

  const withProbs = valid.filter(r => r.probabilities);
  const brier = withProbs.length ? withProbs.reduce((sum, r) => {
    const keys = Object.keys(r.probabilities!);
    return sum + keys.reduce((s, k) => s + Math.pow((r.probabilities![k] ?? 0) - (r.expected === k ? 1 : 0), 2), 0);
  }, 0) / withProbs.length : null;

  const calibrated = valid.filter(r => typeof r.confidence === "number");
  let ece: number | null = null;
  if (calibrated.length) {
    let total = 0;
    for (let b = 0; b < 10; b++) {
      const lo = b / 10, hi = (b + 1) / 10;
      const bin = calibrated.filter(r => r.confidence! >= lo && (b === 9 ? r.confidence! <= hi : r.confidence! < hi));
      if (!bin.length) continue;
      const acc = bin.filter(r => r.choice === r.expected).length / bin.length;
      const conf = bin.reduce((s, r) => s + r.confidence!, 0) / bin.length;
      total += (bin.length / calibrated.length) * Math.abs(acc - conf);
    }
    ece = total;
  }

  const latencies = valid.map(r => r.latencyMs);
  const timed = valid.filter(r => typeof r.bodyMs === "number");
  const dist = (xs: number[]) => ({
    p50: percentile(xs, 50),
    p95: percentile(xs, 95),
    p99: percentile(xs, 99)
  });
  return {
    total: results.length,
    completed: valid.length,
    errors: results.length - valid.length,
    accuracy,
    macroF1,
    brier,
    ece,
    latencyMs: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      mean: latencies.length ? latencies.reduce((a,b)=>a+b,0)/latencies.length : null
    },
    timingMs: {
      ttfb: dist(timed.map(r => r.latencyMs)),
      body: dist(timed.map(r => r.bodyMs!)),
      total: dist(timed.map(r => r.latencyMs + r.bodyMs!))
    },
    usage: {
      inputTokens: valid.reduce((s,r)=>s+(r.inputTokens ?? 0),0),
      outputTokens: valid.reduce((s,r)=>s+(r.outputTokens ?? 0),0)
    }
  };
}
