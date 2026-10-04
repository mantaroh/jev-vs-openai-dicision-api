import { HttpSystemOneAdapter } from "./system-one";

export class JevAdapter extends HttpSystemOneAdapter {
  readonly name = "jev";
  private readonly configuredApiKey = process.env.JEV_API_KEY ?? "";
  private model = process.env.JEV_MODEL ?? "jev-latest";
  private baseUrl = process.env.JEV_BASE_URL ?? "https://api.typesafe.ai";

  protected modelName(): string {
    return this.model;
  }

  protected endpoint(): string {
    return `${this.baseUrl}/v1/systemone`;
  }

  protected apiKey(): string {
    return this.configuredApiKey;
  }

  protected missingCredentialMessage(): string {
    return "JEV_API_KEY is required";
  }
}
