import { z } from "zod";

export const createArticleSchema = z.object({
  cityId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  title: z.string().min(3).max(500),
  content: z.string().optional(),
  platform: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  status: z.string().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  categoryId: z.number().int().positive().optional(),
  status: z.string().optional(),
  content: z.string().optional(),
  seoDescription: z.string().optional(),
  newsletterHtml: z.string().optional(),
});

export const articleListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
});

export const aiGenerateSchema = z.object({
  generationType: z.enum([
    "summary",
    "rewrite",
    "headline",
    "seo",
    "newsletter",
    "social_caption",
  ]),
  prompt: z.string().min(10),
  sourceText: z.string().optional(),
});
