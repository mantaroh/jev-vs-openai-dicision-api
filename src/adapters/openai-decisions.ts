import type { DatasetCase, DecisionAdapter, DecisionResult } from "../types";

/**
 * OpenAI Decisions API adapter.
 * 2026-09-30 時点では limited preview で公開 schema が未確定のため、
 * GA 後にこのファイルだけ公式仕様へ合わせて更新する。
 */
export class OpenAIDecisionsAdapter implements DecisionAdapter {
  readonly name = "openai-decisions";
  private apiKey = process.env.OPENAI_API_KEY ?? "";
  private endpoint = process.env.OPENAI_DECISIONS_ENDPOINT ?? "";
  private model = process.env.OPENAI_DECISIONS_MODEL ?? "decisions-unreleased";

  async decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is required");
    if (!this.endpoint) {
      throw new Error("OPENAI_DECISIONS_ENDPOINT is unset. Update this adapter after the official API schema is published.");
    }

    // IMPORTANT: 以下は intentionally unsupported。未公開 schema を推測して実装しない。
    // GA 後に公式 request/response schema に置き換えること。
    void testCase;
    throw new Error(`Decisions API adapter is waiting for the official schema (${this.model}, ${this.endpoint})`);
  }
}
