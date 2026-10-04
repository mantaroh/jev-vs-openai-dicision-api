import { CloudflareSystemOneAdapter } from "./system-one";

/** Cloudflare Clef (27B), tuned for highest decision accuracy. */
export class CloudflareClefAdapter extends CloudflareSystemOneAdapter {
  readonly name = "clef";
  protected readonly workersAiModelId = "@cf/cloudflare/clef" as const;

  protected modelName(): string {
    return "clef";
  }
}
