export type DatasetCase = {
  id: string;
  task: string;
  input: string;
  instruction: string;
  choices: Record<string, string>;
  expected: string;
  tags: string[];
};

export type DecisionResult = {
  id: string;
  adapter: string;
  model: string;
  expected: string;
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  /** Request start to response headers (TTFB). Kept for comparability with earlier runs. */
  latencyMs: number;
  /** Same as latencyMs; recorded explicitly alongside bodyMs. */
  ttfbMs?: number;
  /** Response headers to body fully read. */
  bodyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

export interface DecisionAdapter {
  readonly name: string;
  decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">>;
}
