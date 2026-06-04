import { prisma } from "../config/database.js";
import { encryptSecret, decryptSecret } from "../utils/encryption.js";
import { AppError } from "../utils/app-error.js";

export class IntegrationsService {
  async list() {
    const items = await prisma.integration.findMany({
      orderBy: { id: "asc" },
      include: { credentials: true },
    });
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      provider: i.provider,
      category: this.providerCategory(i.provider),
      status: i.status,
      lastSync: i.lastSyncAt
        ? this.relativeTime(i.lastSyncAt)
        : "never",
      description: this.providerDescription(i.provider),
      hasCredentials: !!i.credentials,
    }));
  }

  async upsertCredential(integrationId: number, secret: string) {
    const encrypted = encryptSecret(secret);
    return prisma.integrationCredential.upsert({
      where: { integrationId },
      create: { integrationId, encryptedSecret: encrypted },
      update: { encryptedSecret: encrypted },
    });
  }

  async getDecryptedSecret(integrationId: number): Promise<string | null> {
    const cred = await prisma.integrationCredential.findUnique({
      where: { integrationId },
    });
    if (!cred) return null;
    return decryptSecret(cred.encryptedSecret);
  }

  async updateStatus(integrationId: number, status: string) {
    return prisma.integration.update({
      where: { id: integrationId },
      data: { status, lastSyncAt: new Date() },
    });
  }

  async sync(integrationId: number) {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { credentials: true },
    });
    if (!integration) throw new AppError("Integration not found", "NOT_FOUND", 404);

    const hasEnvOrCred =
      !!integration.credentials ||
      ["OpenAI", "Anthropic", "DeepSeek"].includes(integration.provider);

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: hasEnvOrCred ? "connected" : "disconnected",
        lastSyncAt: new Date(),
      },
    });

    return { synced: true, provider: integration.provider };
  }

  private providerCategory(provider: string): string {
    if (["OpenAI", "Anthropic", "DeepSeek"].includes(provider)) return "AI Model";
    if (["Salesforce", "GMass"].includes(provider)) return "Email/CRM";
    return "Source";
  }

  private providerDescription(provider: string): string {
    const map: Record<string, string> = {
      OpenAI: "GPT-4o for summaries & headlines",
      Anthropic: "Anthropic Claude 3.5 Sonnet",
      DeepSeek: "DeepSeek-V3 for cost-efficient gen",
      Salesforce: "Subscriber sync & campaigns",
      GMass: "Bulk newsletter delivery",
      Reddit: "Trending subreddit ingestion",
      TikTok: "Trending video ingestion",
      Reuters: "Realtime news wire",
    };
    return map[provider] ?? `${provider} integration`;
  }

  private relativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  }
}

export const integrationsService = new IntegrationsService();
