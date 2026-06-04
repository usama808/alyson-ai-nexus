import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { sendError } from "../utils/api-response.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.code, err.statusCode, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, "Validation failed", "VALIDATION_ERROR", 422, err.flatten());
    return;
  }

  logger.error({ err }, "Unhandled error");
  sendError(res, "Internal server error", "INTERNAL_ERROR", 500);
}
