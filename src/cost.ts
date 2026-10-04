export type Pricing = {
  inputUsdPerMTok: number | null;
  outputUsdPerMTok: number | null;
  source: string;
  checkedAt: string;
  note?: string;
};

export type Usage = { inputTokens: number; outputTokens: number };

export async function loadPricing(path = "pricing.json"): Promise<Record<string, Pricing>> {
  const f = Bun.file(path);
  return (await f.exists()) ? await f.json() : {};
}

/** Returns null when either unit price is not configured. */
export function estimateCost(usage: Usage, completed: number, pricing?: Pricing) {
  if (pricing?.inputUsdPerMTok == null || pricing.outputUsdPerMTok == null) return null;
  const totalUsd =
    (usage.inputTokens * pricing.inputUsdPerMTok + usage.outputTokens * pricing.outputUsdPerMTok) / 1_000_000;
  return {
    totalUsd,
    usdPer1kRequests: completed > 0 ? (totalUsd / completed) * 1000 : null
  };
}
