import { env } from "../config/env.js";
import { QUEUE_NAMES, createWorker } from "../config/queues.js";
import { connectDatabase } from "../config/database.js";
import { connectRedis } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import {
  processAiGenerate,
  processEmailSend,
  processRankingRecalculate,
  processScrapeAll,
  processScrapeCity,
} from "./processors.js";

async function startWorkers() {
  if (env.USE_INLINE_JOBS) {
    logger.info("Inline jobs mode — separate worker process not required");
    process.exit(0);
  }

  await connectDatabase();
  await connectRedis();

  createWorker<{ cityId: number; systemJobId?: number }>(
    QUEUE_NAMES.SCRAPING,
    async (job) => {
      if (job.name === "scrape-all") return processScrapeAll(job.data);
      return processScrapeCity(job.data);
    },
  );

  createWorker<{
    articleId: number;
    generationType: import("../services/ai-orchestrator.service.js").GenerationType;
    prompt: string;
    sourceText?: string;
    systemJobId?: number;
  }>(QUEUE_NAMES.AI_GENERATION, async (job) => processAiGenerate(job.data));

  createWorker<{ systemJobId?: number }>(QUEUE_NAMES.RANKING, async (job) =>
    processRankingRecalculate(job.data),
  );

  createWorker<{ campaignId: number; systemJobId?: number }>(QUEUE_NAMES.EMAIL, async (job) =>
    processEmailSend(job.data),
  );

  logger.info("BullMQ workers started");
}

startWorkers().catch((err) => {
  logger.fatal({ err }, "Worker failed to start");
  process.exit(1);
});
