import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { decryptSecret } from "../utils/encryption.js";
import { logger } from "../utils/logger.js";

export class EmailService {
  async createCampaign(data: {
    cityId: number;
    title: string;
    campaignType: string;
    scheduledAt?: Date;
  }) {
    return prisma.emailCampaign.create({
      data: {
        cityId: data.cityId,
        title: data.title,
        campaignType: data.campaignType,
        status: data.scheduledAt ? "scheduled" : "draft",
        scheduledAt: data.scheduledAt,
      },
    });
  }

  async generateNewsletterHtml(cityId: number, articleIds: number[]) {
    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds }, cityId },
      include: { content: true, category: true },
    });

    const sections = articles
      .map(
        (a) =>
          `<h2>${a.title}</h2><p>${a.content?.seoDescription ?? a.title}</p><a href="/${a.slug}">Read more</a>`,
      )
      .join("\n");

    return `<!DOCTYPE html><html><body><h1>Local News Digest</h1>${sections}</body></html>`;
  }

  async sendCampaign(campaignId: number) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { city: true },
    });
    if (!campaign) throw new AppError("Campaign not found", "NOT_FOUND", 404);

    const subscribers = await prisma.subscriber.findMany({
      where: { cityId: campaign.cityId, status: "active" },
    });

    let sentVia = "mock";
    if (env.MOCK_EMAIL) {
      logger.info(
        { campaignId, recipients: subscribers.length },
        "Mock email send — no provider configured",
      );
    } else {
      try {
        if (env.GMASS_API_KEY) {
          await this.sendViaGMass(campaign.title, subscribers.map((s) => s.email));
          sentVia = "gmass";
        } else if (env.SALESFORCE_CLIENT_ID && env.SALESFORCE_REST_URL) {
          await this.sendViaSalesforce(campaign, subscribers.map((s) => s.email));
          sentVia = "salesforce";
        } else {
          sentVia = "internal";
        }
      } catch (err) {
        logger.error({ err, campaignId }, "Email provider send failed");
        throw new AppError("Email delivery failed", "EMAIL_SEND_FAILED", 502);
      }
    }

    const updated = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentCount: subscribers.length,
      },
    });

    await prisma.event.createMany({
      data: subscribers.slice(0, 100).map(() => ({
        eventType: "email_sent",
        cityId: campaign.cityId,
        metadata: { campaignId, provider: sentVia },
      })),
    });

    return { campaign: updated, recipientCount: subscribers.length, provider: sentVia };
  }

  private async sendViaGMass(subject: string, emails: string[]) {
    const res = await fetch("https://api.gmass.co/api/v1/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GMASS_API_KEY}`,
      },
      body: JSON.stringify({
        subject,
        recipients: emails,
        message: subject,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GMass: ${res.status} ${body}`);
    }
  }

  private async sendViaSalesforce(
    campaign: { title: string; cityId: number },
    emails: string[],
  ) {
    const integration = await prisma.integration.findFirst({
      where: { provider: "Salesforce" },
      include: { credentials: true },
    });

    let accessToken = env.SALESFORCE_CLIENT_SECRET;
    if (integration?.credentials) {
      accessToken = decryptSecret(integration.credentials.encryptedSecret);
    }

    const res = await fetch(`${env.SALESFORCE_REST_URL}/services/data/v59.0/sobjects/EmailMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: campaign.title,
        HtmlBody: `<p>${campaign.title}</p>`,
        ToAddress: emails[0],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Salesforce: ${res.status} ${body}`);
    }
  }

  async trackOpen(cityId: number, campaignId: number) {
    await prisma.event.create({
      data: {
        eventType: "email_open",
        cityId,
        metadata: { campaignId },
      },
    });
  }

  async trackClick(cityId: number, campaignId: number, articleId?: number) {
    await prisma.event.create({
      data: {
        eventType: "email_click",
        cityId,
        articleId,
        metadata: { campaignId },
      },
    });
  }

  async listCampaigns(cityId?: number, skip = 0, take = 20) {
    const where = { cityId: cityId ?? undefined };
    const [items, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { city: { select: { id: true, name: true } } },
      }),
      prisma.emailCampaign.count({ where }),
    ]);
    return { items, total };
  }

  async listSubscribers(cityId: number, skip = 0, take = 20, status?: string) {
    const where = { cityId, status: status ?? undefined };
    const [items, total] = await Promise.all([
      prisma.subscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.subscriber.count({ where }),
    ]);
    return { items, total };
  }

  async addSubscriber(cityId: number, email: string, source: string) {
    return prisma.subscriber.upsert({
      where: { cityId_email: { cityId, email } },
      create: { cityId, email, source, status: "active" },
      update: { status: "active", source },
    });
  }
}

export const emailService = new EmailService();
