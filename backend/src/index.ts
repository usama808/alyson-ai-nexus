import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { logger } from "./utils/logger.js";
import { scheduleRecurringJobs } from "./jobs/scheduler.js";
import { getAiStatus } from "./config/ai-config.js";

async function bootstrap() {
  await connectDatabase();
  if (!env.USE_INLINE_JOBS) {
    await connectRedis();
  } else {
    logger.info("Local mode: inline jobs (no Redis), SQLite database");
  }
  const aiStatus = getAiStatus();
  if (aiStatus.mock) {
    logger.info("Mock AI enabled — no live LLM calls");
  } else if (aiStatus.configuredProviders.length > 0) {
    logger.info(
      {
        primary: aiStatus.primaryProvider,
        providers: aiStatus.configuredProviders,
        openaiModel: aiStatus.models.openai,
      },
      "Live AI enabled",
    );
  } else {
    logger.warn("MOCK_AI=false but no API keys set — AI requests will fail");
  }

  const app = createApp();

  if (env.NODE_ENV !== "test") {
    await scheduleRecurringJobs();
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Alyson AI API listening on port ${env.PORT}`);
    logger.info(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
    logger.info(`Health: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
