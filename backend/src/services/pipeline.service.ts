import { prisma } from "../config/database.js";
import { QUEUE_NAMES } from "../config/queues.js";
import { PLACEHOLDER_POST_PATTERN } from "../config/news-sources.js";
import { buildSourcePlatformRows, type SourcePlatformRow } from "./source-platforms.service.js";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type PipelineStage = {
  name: string;
  active: number;
  queued: number;
  success: number;
};

export type PipelineSourcePlatform = SourcePlatformRow;

export type PipelineEvent = {
  id: number;
  message: string;
  status: "success" | "warning" | "error" | "info";
  at: string;
};

async function queueJobStats(queueName: string): Promise<{ active: number; queued: number; success: number }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [active, queued, completed, failed] = await Promise.all([
    prisma.systemJob.count({ where: { queueName, status: "active" } }),
    prisma.systemJob.count({ where: { queueName, status: "pending" } }),
    prisma.systemJob.count({
      where: { queueName, status: "completed", completedAt: { gte: since } },
    }),
    prisma.systemJob.count({
      where: { queueName, status: "failed", completedAt: { gte: since } },
    }),
  ]);
  const finished = completed + failed;
  const success = finished > 0 ? Math.round((completed / finished) * 1000) / 10 : 100;
  return { active, queued, success };
}

function successFromCounts(completed: number, failed: number): number {
  const finished = completed + failed;
  return finished > 0 ? Math.round((completed / finished) * 1000) / 10 : 100;
}

export class PipelineService {
  async getVisualization(): Promise<{
    pipelineStages: PipelineStage[];
    sourcePlatforms: PipelineSourcePlatform[];
    recentEvents: PipelineEvent[];
    summary: { liveAi: boolean; lastScrapeAt: string | null };
  }> {
    const since = new Date(Date.now() - WINDOW_MS);

    const [
      scraping,
      aiGen,
      ranking,
      email,
      draftArticles,
      pendingReview,
      pendingReviewQueue,
      publishedToday,
      seoGenerations24h,
      rawPostsPending,
      scrapeCompleted,
      scrapeFailed,
      recentJobs,
      sourcePlatforms,
      lastRawPost,
      aiStatus,
    ] = await Promise.all([
      queueJobStats(QUEUE_NAMES.SCRAPING),
      queueJobStats(QUEUE_NAMES.AI_GENERATION),
      queueJobStats(QUEUE_NAMES.RANKING),
      queueJobStats(QUEUE_NAMES.EMAIL),
      prisma.article.count({ where: { status: "draft" } }),
      prisma.article.count({ where: { status: "pending_review" } }),
      prisma.reviewQueue.count({ where: { status: "pending" } }),
      prisma.article.count({
        where: { status: "published", publishedAt: { gte: since } },
      }),
      prisma.aiGeneration.count({
        where: {
          generationType: { in: ["seo", "headline"] },
          createdAt: { gte: since },
        },
      }),
      prisma.socialPostRaw.count({
        where: {
          scrapedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
      }),
      prisma.systemJob.count({
        where: { queueName: QUEUE_NAMES.SCRAPING, status: "completed", completedAt: { gte: since } },
      }),
      prisma.systemJob.count({
        where: { queueName: QUEUE_NAMES.SCRAPING, status: "failed", completedAt: { gte: since } },
      }),
      prisma.systemJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { city: { select: { name: true } } },
      }),
      buildSourcePlatformRows(),
      prisma.socialPostRaw.findMany({
        orderBy: { scrapedAt: "desc" },
        take: 40,
        select: { scrapedAt: true, postText: true },
      }),
      import("../config/ai-config.js").then((m) => m.getAiStatus()),
    ]);

    const lastRealPost = lastRawPost.find((p) => !PLACEHOLDER_POST_PATTERN.test(p.postText));

    const publishSuccess = await this.publishStageSuccess(since);

    const pipelineStages: PipelineStage[] = [
      {
        name: "Scraping",
        active: scraping.active,
        queued: scraping.queued,
        success: scraping.success,
      },
      {
        name: "Processing",
        active: draftArticles,
        queued: Math.min(rawPostsPending, 999),
        success: successFromCounts(scrapeCompleted, scrapeFailed),
      },
      {
        name: "AI Summarization",
        active: aiGen.active,
        queued: aiGen.queued,
        success: aiGen.success,
      },
      {
        name: "SEO Optimization",
        active: seoGenerations24h,
        queued: 0,
        success: aiGen.success,
      },
      {
        name: "Moderation",
        active: pendingReview,
        queued: pendingReviewQueue,
        success: pendingReviewQueue === 0 ? 100 : Math.max(85, 100 - pendingReviewQueue),
      },
      {
        name: "Publishing",
        active: publishedToday + email.active,
        queued: email.queued + ranking.queued,
        success: publishSuccess,
      },
    ];

    const recentEvents = recentJobs.map((job) => this.formatJobEvent(job));

    return {
      pipelineStages,
      sourcePlatforms,
      recentEvents,
      summary: {
        liveAi: !aiStatus.mock && aiStatus.configuredProviders.length > 0,
        lastScrapeAt: lastRealPost?.scrapedAt?.toISOString() ?? null,
      },
    };
  }

  private async publishStageSuccess(since: Date): Promise<number> {
    const [completed, failed] = await Promise.all([
      prisma.systemJob.count({
        where: {
          queueName: { in: [QUEUE_NAMES.RANKING, QUEUE_NAMES.EMAIL] },
          status: "completed",
          completedAt: { gte: since },
        },
      }),
      prisma.systemJob.count({
        where: {
          queueName: { in: [QUEUE_NAMES.RANKING, QUEUE_NAMES.EMAIL] },
          status: "failed",
          completedAt: { gte: since },
        },
      }),
    ]);
    return successFromCounts(completed, failed);
  }

  private formatJobEvent(job: {
    id: number;
    jobType: string;
    queueName: string;
    status: string;
    errorMessage: string | null;
    result: unknown;
    createdAt: Date;
    city: { name: string } | null;
  }): PipelineEvent {
    const city = job.city?.name;
    const citySuffix = city ? ` · ${city}` : "";
    let message = `${job.jobType.replace(/_/g, " ")}${citySuffix}`;
    let status: PipelineEvent["status"] = "info";

    if (job.status === "completed") {
      status = "success";
      const result = job.result as Record<string, unknown> | null;
      if (job.queueName === QUEUE_NAMES.SCRAPING && result?.articlesCreated != null) {
        message = `Scraped ${result.articlesCreated} new articles${citySuffix}`;
      } else if (job.queueName === QUEUE_NAMES.RANKING) {
        message = `Homepage rankings recalculated${citySuffix}`;
      } else if (job.queueName === QUEUE_NAMES.AI_GENERATION) {
        message = `AI generation completed${citySuffix}`;
      } else if (job.jobType === "ranking_scheduled") {
        message = "Scheduled ranking run finished";
      } else if (job.jobType === "scrape_scheduled") {
        message = `Scheduled scrape finished${citySuffix}`;
      }
    } else if (job.status === "failed") {
      status = "error";
      message = `${message} failed${job.errorMessage ? `: ${job.errorMessage.slice(0, 80)}` : ""}`;
    } else if (job.status === "active") {
      status = "info";
      message = `${message} running…`;
    } else if (job.status === "pending") {
      status = "warning";
      message = `${message} queued${citySuffix}`;
    }

    return {
      id: job.id,
      message,
      status,
      at: job.createdAt.toISOString(),
    };
  }
}

export const pipelineService = new PipelineService();
