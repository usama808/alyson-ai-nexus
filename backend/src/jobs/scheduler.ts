import { prisma } from "../config/database.js";
import { rankingQueue, scrapingQueue, defaultJobOptions, QUEUE_NAMES } from "../config/queues.js";
import { env } from "../config/env.js";
import { settingsService } from "../services/settings.service.js";
import { systemJobsService } from "../services/system-jobs.service.js";
import { logger } from "../utils/logger.js";

export async function scheduleRecurringJobs() {
  const rankIntervalMs = (await settingsService.getNumber("ranking.auto_interval_min")) * 60 * 1000;
  const redditIntervalMs = env.SCRAPING_REDDIT_INTERVAL_SEC * 1000;

  setInterval(async () => {
    try {
      const jobRecord = await systemJobsService.create({
        jobType: "ranking_scheduled",
        queueName: QUEUE_NAMES.RANKING,
        payload: { scheduled: true },
      });
      await rankingQueue.add(
        "recalculate-all",
        { systemJobId: jobRecord.id },
        { ...defaultJobOptions, jobId: `ranking-${Date.now()}` },
      );
    } catch (err) {
      logger.error({ err }, "Scheduled ranking job failed");
    }
  }, rankIntervalMs);

  setInterval(async () => {
    try {
      const cities = await prisma.city.findMany({ where: { status: "active" }, take: 5 });
      for (const city of cities) {
        const jobRecord = await systemJobsService.create({
          jobType: "scrape_scheduled",
          queueName: QUEUE_NAMES.SCRAPING,
          cityId: city.id,
          payload: { cityId: city.id },
        });
        await scrapingQueue.add(
          "scrape-city",
          { cityId: city.id, systemJobId: jobRecord.id },
          { ...defaultJobOptions, jobId: `scrape-${city.id}-${Date.now()}` },
        );
      }
    } catch (err) {
      logger.error({ err }, "Scheduled scraping job failed");
    }
  }, redditIntervalMs);

  logger.info({ rankIntervalMs, redditIntervalMs }, "Recurring jobs scheduled");
}
