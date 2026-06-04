import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { citiesRoutes } from "./cities.routes.js";
import { articlesRoutes } from "./articles.routes.js";
import { rankingsRoutes } from "./rankings.routes.js";
import { moderationRoutes } from "./moderation.routes.js";
import { aiRoutes } from "./ai.routes.js";
import { analyticsRoutes } from "./analytics.routes.js";
import { integrationsRoutes } from "./integrations.routes.js";
import { subscribersRoutes } from "./subscribers.routes.js";
import { emailRoutes } from "./email.routes.js";
import { scrapingRoutes } from "./scraping.routes.js";
import { settingsRoutes } from "./settings.routes.js";
import { jobsRoutes } from "./jobs.routes.js";
import { categoriesRoutes } from "./categories.routes.js";
import { feedRoutes } from "./feed.routes.js";
import { getAiStatus } from "../../config/ai-config.js";

export const apiRouter = Router();

apiRouter.use("/feed", feedRoutes);

apiRouter.use("/auth", authRoutes);
apiRouter.use("/cities", citiesRoutes);
apiRouter.use("/categories", categoriesRoutes);
apiRouter.use("/articles", articlesRoutes);
apiRouter.use("/rankings", rankingsRoutes);
apiRouter.use("/moderation", moderationRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/integrations", integrationsRoutes);
apiRouter.use("/subscribers", subscribersRoutes);
apiRouter.use("/email", emailRoutes);
apiRouter.use("/scraping", scrapingRoutes);
apiRouter.use("/settings", settingsRoutes);
apiRouter.use("/jobs", jobsRoutes);

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      ai: getAiStatus(),
    },
  });
});
