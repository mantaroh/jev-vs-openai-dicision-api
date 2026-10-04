import { CloudflareSystemOneAdapter } from "./system-one";

/** Cloudflare Clef-flash (9B), tuned for latency-sensitive decision paths. */
export class CloudflareClefFlashAdapter extends CloudflareSystemOneAdapter {
  readonly name = "clef-flash";
  protected readonly workersAiModelId = "@cf/cloudflare/clef-flash" as const;

  protected modelName(): string {
    return "clef-flash";
  }
}
