import type { DatasetCase, DecisionAdapter, DecisionResult } from "../types";

type JsonObject = Record<string, unknown>;

export type SystemOneRequest = {
  model: string;
  state: string;
  questions: {
    decision: {
      type: "choice";
      instructions: string;
      criteria: Record<string, string>;
    };
  };
};

type SystemOneResponse = {
  model?: unknown;
  answers?: unknown;
  usage?: unknown;
};

type SystemOneTransportResult = {
  body: unknown;
  latencyMs: number;
  bodyMs?: number;
};

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function probabilityMap(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value);
  if (!entries.length || entries.some(([, probability]) => numberOrUndefined(probability) === undefined)) {
    return undefined;
  }

  return Object.fromEntries(entries.map(([label, probability]) => [label, probability as number]));
}

function asSystemOneResponse(value: unknown): SystemOneResponse {
  if (!isRecord(value)) throw new Error("System One response is not a JSON object");
  return value;
}

/**
 * Shared implementation for System One-compatible decision APIs. It owns the
 * benchmark's single `choice` question and validates the portable response
 * fields used by the metrics pipeline.
 */
export abstract class SystemOneAdapter implements DecisionAdapter {
  abstract readonly name: string;

  protected abstract modelName(): string;
  protected abstract invokeSystemOne(request: SystemOneRequest): Promise<SystemOneTransportResult>;

  async decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">> {
    const model = this.modelName();
    const { body, latencyMs, bodyMs } = await this.invokeSystemOne({
      model,
      state: testCase.input,
      questions: {
        decision: {
          type: "choice",
          instructions: testCase.instruction,
          criteria: testCase.choices
        }
      }
    });

    const response = asSystemOneResponse(body);
    if (!isRecord(response.answers) || !isRecord(response.answers.decision)) {
      throw new Error("System One response is missing answers.decision");
    }

    const answer = response.answers.decision;
    if (answer.type !== undefined && answer.type !== "choice") {
      throw new Error(`Unexpected System One answer type: ${String(answer.type)}`);
    }
    if (typeof answer.choice !== "string") {
      throw new Error("System One response is missing a choice answer");
    }

    const usage = isRecord(response.usage) ? response.usage : undefined;
    return {
      adapter: this.name,
      model: typeof response.model === "string" ? response.model : model,
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

/** Shared HTTP transport for APIs that accept the System One request body. */
export abstract class HttpSystemOneAdapter extends SystemOneAdapter {
  protected abstract endpoint(): string;
  protected abstract apiKey(): string;
  protected abstract missingCredentialMessage(): string;

  protected requestHeaders(apiKey: string): HeadersInit {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
  }

  /** Providers may wrap a System One response in their own API envelope. */
  protected unwrapResponse(body: unknown): unknown {
    return body;
  }

  protected async invokeSystemOne(request: SystemOneRequest): Promise<SystemOneTransportResult> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new Error(this.missingCredentialMessage());

    const started = performance.now();
    const response = await fetch(this.endpoint(), {
      method: "POST",
      headers: this.requestHeaders(apiKey),
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

    return { body: this.unwrapResponse(body), latencyMs, bodyMs };
  }
}

/**
 * Workers AI returns the model output under `result` in its REST API envelope.
 * Clef variants share this transport while keeping distinct public adapters.
 */
export abstract class CloudflareSystemOneAdapter extends HttpSystemOneAdapter {
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  private readonly token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_AUTH_TOKEN ?? "";

  protected abstract readonly workersAiModelId: "@cf/cloudflare/clef" | "@cf/cloudflare/clef-flash";

  protected endpoint(): string {
    if (!this.accountId) return "";
    return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/ai/run/${this.workersAiModelId}`;
  }

  protected apiKey(): string {
    return this.token;
  }

  protected missingCredentialMessage(): string {
    if (!this.accountId) return "CLOUDFLARE_ACCOUNT_ID is required";
    return "CLOUDFLARE_API_TOKEN is required";
  }

  protected unwrapResponse(body: unknown): unknown {
    if (!isRecord(body)) throw new Error("Cloudflare response is not a JSON object");
    if (body.success === false) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(body.errors ?? body.messages ?? body)}`);
    }
    if (!("result" in body)) throw new Error("Cloudflare response is missing result");
    return body.result;
  }
}
