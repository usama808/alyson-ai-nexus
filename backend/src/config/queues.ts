import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "./env.js";
import { getRedis } from "./redis.js";
import { logger } from "../utils/logger.js";
import {
  processAiGenerate,
  processEmailSend,
  processRankingRecalculate,
  processScrapeAll,
  processScrapeCity,
} from "../jobs/processors.js";

export const QUEUE_NAMES = {
  SCRAPING: "scraping",
  AI_GENERATION: "ai-generation",
  RANKING: "ranking",
  EMAIL: "email",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

type JobHandler = (name: string, data: Record<string, unknown>) => Promise<unknown>;

const inlineHandlers: Record<string, JobHandler> = {
  [QUEUE_NAMES.SCRAPING]: async (name, data) => {
    if (name === "scrape-all") return processScrapeAll(data as { systemJobId?: number });
    return processScrapeCity(data as { cityId: number; systemJobId?: number });
  },
  [QUEUE_NAMES.AI_GENERATION]: async (_name, data) =>
    processAiGenerate(
      data as {
        articleId: number;
        generationType: import("../services/ai-orchestrator.service.js").GenerationType;
        prompt: string;
        sourceText?: string;
        systemJobId?: number;
      },
    ),
  [QUEUE_NAMES.RANKING]: async (_name, data) =>
    processRankingRecalculate(data as { systemJobId?: number }),
  [QUEUE_NAMES.EMAIL]: async (_name, data) =>
    processEmailSend(data as { campaignId: number; systemJobId?: number }),
};

class InlineQueue {
  constructor(private queueName: string) {}

  async add(name: string, data: Record<string, unknown>, _opts?: JobsOptions) {
    const handler = inlineHandlers[this.queueName];
    if (!handler) throw new Error(`No inline handler for ${this.queueName}`);
    logger.info({ queue: this.queueName, name }, "Running job inline (no Redis)");
    const result = await handler(name, data);
    return { id: `inline-${Date.now()}`, name, data, returnvalue: result };
  }
}

class BullQueueAdapter {
  constructor(private queue: Queue) {}

  async add(name: string, data: Record<string, unknown>, opts?: JobsOptions) {
    return this.queue.add(name, data, opts ?? defaultJobOptions);
  }
}

function createQueueAdapter(queueName: string) {
  if (env.USE_INLINE_JOBS) {
    return new InlineQueue(queueName);
  }
  const redis = getRedis();
  if (!redis) {
    logger.warn("Redis unavailable — using inline jobs");
    return new InlineQueue(queueName);
  }
  return new BullQueueAdapter(new Queue(queueName, { connection: redis }));
}

export const scrapingQueue = createQueueAdapter(QUEUE_NAMES.SCRAPING);
export const aiGenerationQueue = createQueueAdapter(QUEUE_NAMES.AI_GENERATION);
export const rankingQueue = createQueueAdapter(QUEUE_NAMES.RANKING);
export const emailQueue = createQueueAdapter(QUEUE_NAMES.EMAIL);

export function createWorker<T>(
  queueName: string,
  processor: (job: { id?: string; name: string; data: T }) => Promise<unknown>,
  concurrency = 5,
): Worker<T> | null {
  if (env.USE_INLINE_JOBS) return null;
  const redis = getRedis();
  if (!redis) return null;
  return new Worker<T>(queueName, processor, { connection: redis, concurrency });
}
