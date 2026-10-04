import { describe, expect, test } from "bun:test";
import { estimateCost, type Pricing } from "./cost";

const pricing = (input: number | null, output: number | null): Pricing => ({
  inputUsdPerMTok: input,
  outputUsdPerMTok: output,
  source: "",
  checkedAt: ""
});

describe("estimateCost", () => {
  test("token 数と単価から合計と1000リクエストあたりの費用を出す", () => {
    const cost = estimateCost({ inputTokens: 2_000_000, outputTokens: 500_000 }, 100, pricing(0.5, 2));
    expect(cost?.totalUsd).toBeCloseTo(2);
    expect(cost?.usdPer1kRequests).toBeCloseTo(20);
  });

  test("単価が未設定なら null", () => {
    expect(estimateCost({ inputTokens: 10, outputTokens: 10 }, 1, undefined)).toBeNull();
    expect(estimateCost({ inputTokens: 10, outputTokens: 10 }, 1, pricing(null, 1))).toBeNull();
    expect(estimateCost({ inputTokens: 10, outputTokens: 10 }, 1, pricing(1, null))).toBeNull();
  });

  test("完了件数が0なら1000リクエストあたりは null", () => {
    const cost = estimateCost({ inputTokens: 0, outputTokens: 0 }, 0, pricing(1, 1));
    expect(cost?.totalUsd).toBe(0);
    expect(cost?.usdPer1kRequests).toBeNull();
  });
});
