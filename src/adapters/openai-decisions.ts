import type { DatasetCase, DecisionAdapter, DecisionResult } from "../types";

type JsonObject = Record<string, unknown>;

type OpenAIDecisionsRequest = {
  model: string;
  input: string;
  questions: {
    type: "choice";
    name: string;
    instructions: string;
    choices: { value: string; description: string }[];
  }[];
};

const QUESTION_NAME = "decision";

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** `[{ value, probability }]` を metrics が使う `{ value: probability }` に変換する。 */
function probabilityMap(value: unknown): Record<string, number> | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;

  const entries: [string, number][] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.value !== "string") return undefined;
    const probability = numberOrUndefined(item.probability);
    if (probability === undefined) return undefined;
    entries.push([item.value, probability]);
  }
  return Object.fromEntries(entries);
}

/**
 * OpenAI Decisions API adapter (public beta, 2026-10-06).
 * https://developers.openai.com/api/docs/guides/decisions
 */
export class OpenAIDecisionsAdapter implements DecisionAdapter {
  readonly name = "openai-decisions";
  private apiKey = process.env.OPENAI_API_KEY ?? "";
  private endpoint = process.env.OPENAI_DECISIONS_ENDPOINT ?? "https://api.openai.com/v1/decisions";
  private model = process.env.OPENAI_DECISIONS_MODEL ?? "gpt-6-luna";

  async decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is required");

    const request: OpenAIDecisionsRequest = {
      model: this.model,
      input: testCase.input,
      questions: [
        {
          type: "choice",
          name: QUESTION_NAME,
          instructions: testCase.instruction,
          choices: Object.entries(testCase.choices).map(([value, description]) => ({ value, description }))
        }
      ]
    };

    const started = performance.now();
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });
    const latencyMs = performance.now() - started;
    const text = await response.text();
    const bodyMs = performance.now() - started - latencyMs;
    if (!response.ok) throw new Error(`${this.name} HTTP ${response.status}: ${text}`);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(`${this.name} returned invalid JSON: ${String(error)}`);
    }
    if (!isRecord(body)) throw new Error("OpenAI Decisions response is not a JSON object");
    if (!Array.isArray(body.answers)) throw new Error("OpenAI Decisions response is missing answers");

    const answer = body.answers.find((item): item is JsonObject => isRecord(item) && item.name === QUESTION_NAME);
    if (!answer) throw new Error(`OpenAI Decisions response is missing answer "${QUESTION_NAME}"`);
    if (answer.type !== undefined && answer.type !== "choice") {
      throw new Error(`Unexpected OpenAI Decisions answer type: ${String(answer.type)}`);
    }
    if (typeof answer.choice !== "string") {
      throw new Error("OpenAI Decisions response is missing a choice answer");
    }

    const usage = isRecord(body.usage) ? body.usage : undefined;
    return {
      adapter: this.name,
      model: typeof body.model === "string" ? body.model : this.model,
      choice: answer.choice,
      confidence: numberOrUndefined(answer.confidence),
      probabilities: probabilityMap(answer.probabilities),
      latencyMs,
      ttfbMs: latencyMs,
      bodyMs,
      inputTokens: numberOrUndefined(usage?.input_tokens) ?? numberOrUndefined(usage?.prompt_tokens),
      outputTokens: numberOrUndefined(usage?.output_tokens) ?? numberOrUndefined(usage?.completion_tokens)
    };
  }
}
