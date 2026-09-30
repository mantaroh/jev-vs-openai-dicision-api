import type { DatasetCase, DecisionAdapter, DecisionResult } from "../types";

export class JevAdapter implements DecisionAdapter {
  readonly name = "jev";
  private apiKey = process.env.JEV_API_KEY ?? "";
  private model = process.env.JEV_MODEL ?? "jev-latest";
  private baseUrl = process.env.JEV_BASE_URL ?? "https://api.typesafe.ai";

  async decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">> {
    if (!this.apiKey) throw new Error("JEV_API_KEY is required");
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/v1/systemone`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        state: testCase.input,
        model: this.model,
        questions: {
          decision: {
            type: "choice",
            instructions: testCase.instruction,
            criteria: testCase.choices
          }
        }
      })
    });
    const latencyMs = performance.now() - started;
    if (!response.ok) throw new Error(`Jev HTTP ${response.status}: ${await response.text()}`);
    const body: any = await response.json();
    const answer = body.answers?.decision;
    if (!answer || answer.type !== "choice") throw new Error("Unexpected Jev response");
    return {
      adapter: this.name,
      model: body.model ?? this.model,
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
      latencyMs,
      inputTokens: body.usage?.input_tokens,
      outputTokens: body.usage?.output_tokens
    };
  }
}
