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
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

export interface DecisionAdapter {
  readonly name: string;
  decide(testCase: DatasetCase): Promise<Omit<DecisionResult, "id" | "expected">>;
}
