import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().default("file:./data/alyson.db"),
  REDIS_URL: z.string().optional(),
  USE_INLINE_JOBS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  MOCK_AI: z.string().optional(),
  MOCK_EMAIL: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  ALLOW_PUBLIC_FEED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z.string().min(16),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().default("https://api.deepseek.com"),
  SALESFORCE_CLIENT_ID: z.string().optional(),
  SALESFORCE_CLIENT_SECRET: z.string().optional(),
  SALESFORCE_AUTH_URL: z.string().optional(),
  SALESFORCE_REST_URL: z.string().optional(),
  GMASS_API_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  SCRAPING_REDDIT_INTERVAL_SEC: z.coerce.number().default(60),
  SCRAPING_TIKTOK_INTERVAL_SEC: z.coerce.number().default(120),
  DAILY_ARTICLE_CAP: z.coerce.number().default(1200),
  AUTO_PUBLISH_THRESHOLD: z.coerce.number().default(0.9),
  REVIEW_THRESHOLD: z.coerce.number().default(0.7),
  MODERATION_MODE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  AUTO_RANK_INTERVAL_MIN: z.coerce.number().default(5),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}

const baseEnv = loadEnv();

function hasAnyAiKey(): boolean {
  return !!(baseEnv.OPENAI_API_KEY || baseEnv.ANTHROPIC_API_KEY || baseEnv.DEEPSEEK_API_KEY);
}

function resolveMockAi(): boolean {
  const raw = process.env.MOCK_AI;
  if (raw === undefined || raw.trim() === "") {
    return !hasAnyAiKey();
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export const env = {
  ...baseEnv,
  USE_INLINE_JOBS: baseEnv.USE_INLINE_JOBS ?? !baseEnv.REDIS_URL,
  MOCK_AI: resolveMockAi(),
  MOCK_EMAIL:
    baseEnv.MOCK_EMAIL ??
    !(baseEnv.GMASS_API_KEY || (baseEnv.SALESFORCE_CLIENT_ID && baseEnv.SALESFORCE_REST_URL)),
  ALLOW_PUBLIC_FEED:
    baseEnv.ALLOW_PUBLIC_FEED ?? baseEnv.NODE_ENV === "development",
};

export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
