import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { settingsService } from "./settings.service.js";

export class ModerationService {
  async applyConfidenceRouting(articleId: number, confidence: number) {
    const moderationOn = await settingsService.isModerationEnabled();
    const autoThreshold = await settingsService.getAutoPublishThreshold();
    const reviewThreshold = await settingsService.getReviewThreshold();

    if (moderationOn) {
      await this.ensureReviewQueue(articleId);
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "review_pending" },
      });
      return { action: "review_required", status: "review_pending" };
    }

    if (confidence >= autoThreshold) {
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "approved" },
      });
      await this.autoPublishIfReady(articleId);
      return { action: "auto_approved", status: "approved" };
    }

    if (confidence >= reviewThreshold) {
      await this.ensureReviewQueue(articleId);
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "review_pending" },
      });
      return { action: "review_queue", status: "review_pending" };
    }

    await prisma.article.update({
      where: { id: articleId },
      data: { status: "draft" },
    });
    return { action: "kept_draft", status: "draft" };
  }

  private async ensureReviewQueue(articleId: number) {
    await prisma.reviewQueue.upsert({
      where: { articleId },
      create: { articleId, status: "pending" },
      update: { status: "pending" },
    });
  }

  async approve(articleId: number, reviewerId: number, notes?: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: reviewerId } });
    await prisma.reviewQueue.upsert({
      where: { articleId },
      create: {
        articleId,
        status: "approved",
        reviewerId,
        reviewerName: user.name,
        notes,
        approvedAt: new Date(),
      },
      update: {
        status: "approved",
        reviewerId,
        reviewerName: user.name,
        notes,
        approvedAt: new Date(),
      },
    });
    await prisma.article.update({
      where: { id: articleId },
      data: { status: "approved" },
    });
    return this.publish(articleId);
  }

  async reject(articleId: number, reviewerId: number, notes?: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: reviewerId } });
    await prisma.reviewQueue.upsert({
      where: { articleId },
      create: {
        articleId,
        status: "rejected",
        reviewerId,
        reviewerName: user.name,
        notes,
      },
      update: {
        status: "rejected",
        reviewerId,
        reviewerName: user.name,
        notes,
      },
    });
    return prisma.article.update({
      where: { id: articleId },
      data: { status: "rejected" },
    });
  }

  async escalate(articleId: number, notes: string) {
    return prisma.reviewQueue.upsert({
      where: { articleId },
      create: { articleId, status: "escalated", notes },
      update: { status: "escalated", notes },
    });
  }

  async publish(articleId: number) {
    await prisma.article.update({
      where: { id: articleId },
      data: { status: "published", publishedAt: new Date() },
    });

    const article = await prisma.article.findUniqueOrThrow({
      where: { id: articleId },
      include: { city: true, category: true, sources: true, metrics: true, aiGenerations: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    await prisma.articleMetric.upsert({
      where: { articleId },
      create: {
        articleId,
        views: 0,
        clicks: 0,
        ctr: 0,
        engagement: 0,
        updatedAt: new Date(),
      },
      update: {},
    });

    return article;
  }

  private async autoPublishIfReady(articleId: number) {
    const moderationOn = await settingsService.isModerationEnabled();
    if (moderationOn) return;
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (article?.status === "approved") {
      await this.publish(articleId);
    }
  }

  async listQueue(cityId?: number, status?: string) {
    return prisma.reviewQueue.findMany({
      where: {
        status: status ?? undefined,
        article: cityId ? { cityId } : undefined,
      },
      include: {
        article: {
          include: {
            city: true,
            category: true,
            content: true,
            aiGenerations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { id: "desc" },
    });
  }
}

export const moderationService = new ModerationService();
