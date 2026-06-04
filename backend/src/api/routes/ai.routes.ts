import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { aiOrchestratorService } from "../../services/ai-orchestrator.service.js";
import { aiGenerationQueue, defaultJobOptions, QUEUE_NAMES } from "../../config/queues.js";
import { systemJobsService } from "../../services/system-jobs.service.js";
import { sendSuccess } from "../../utils/api-response.js";
import { validate } from "../../middleware/validate.js";
import { aiGenerateSchema } from "../../validators/articles.validator.js";
import { getAiStatus } from "../../config/ai-config.js";
import { z } from "zod";

const queueAiSchema = z.object({
  articleId: z.number().int().positive(),
  generationType: aiGenerateSchema.shape.generationType,
  prompt: z.string().min(10),
  sourceText: z.string().optional(),
});

const generateSchema = z.object({
  articleId: z.number().int().positive(),
  generationType: aiGenerateSchema.shape.generationType,
  prompt: z.string().min(10),
  sourceText: z.string().optional(),
});

export const aiRoutes = Router();

aiRoutes.use(authenticate, requireRoles("admin", "editor"));

/** Connection info for CMS (providers, mock flag, models). */
aiRoutes.get("/status", async (_req, res, next) => {
  try {
    sendSuccess(res, getAiStatus());
  } catch (e) {
    next(e);
  }
});

/** Verify OpenAI / configured provider with a minimal completion. */
aiRoutes.post("/test", requireRoles("admin"), async (_req, res, next) => {
  try {
    const result = await aiOrchestratorService.testConnection();
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/** Synchronous generation (same as POST /articles/:id/ai/generate). */
aiRoutes.post("/generate", validate(generateSchema), async (req, res, next) => {
  try {
    const { articleId, generationType, prompt, sourceText } = req.body;
    const result = await aiOrchestratorService.generate({
      articleId,
      generationType,
      prompt,
      sourceText,
    });
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

aiRoutes.post("/queue", validate(queueAiSchema), async (req, res, next) => {
  try {
    const jobRecord = await systemJobsService.create({
      jobType: `ai_${req.body.generationType}`,
      queueName: QUEUE_NAMES.AI_GENERATION,
      payload: req.body,
      articleId: req.body.articleId,
    });
    const bullJob = await aiGenerationQueue.add(
      "generate",
      { ...req.body, systemJobId: jobRecord.id },
      defaultJobOptions,
    );
    sendSuccess(res, { queued: true, bullJobId: bullJob.id, systemJobId: jobRecord.id }, undefined, 202);
  } catch (e) {
    next(e);
  }
});

aiRoutes.get("/pipeline", async (_req, res, next) => {
  try {
    const { pipelineService } = await import("../../services/pipeline.service.js");
    sendSuccess(res, await pipelineService.getVisualization());
  } catch (e) {
    next(e);
  }
});
