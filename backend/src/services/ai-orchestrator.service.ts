import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { confidenceService } from "./confidence.service.js";
import { settingsService } from "./settings.service.js";
import { moderationService } from "./moderation.service.js";
import { logger } from "../utils/logger.js";
import { mockGenerate } from "./mock-ai.service.js";
import { getConfiguredProviders } from "../config/ai-config.js";

export type GenerationType =
  | "summary"
  | "rewrite"
  | "headline"
  | "seo"
  | "newsletter"
  | "social_caption";

type Provider = "openai" | "anthropic" | "deepseek";

const ROUTING: Record<GenerationType, Provider[]> = {
  summary: ["deepseek", "openai", "anthropic"],
  rewrite: ["anthropic", "openai", "deepseek"],
  headline: ["deepseek", "openai", "anthropic"],
  seo: ["openai", "deepseek", "anthropic"],
  newsletter: ["anthropic", "openai", "deepseek"],
  social_caption: ["deepseek", "anthropic", "openai"],
};

function getModels(): Record<Provider, string> {
  return {
    openai: env.OPENAI_MODEL,
    anthropic: "claude-3-5-sonnet-20241022",
    deepseek: "deepseek-chat",
  };
}

export class AiOrchestratorService {
  private openai = env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
    : null;
  private anthropic = env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    : null;

  async generate(params: {
    articleId: number;
    generationType: GenerationType;
    prompt: string;
    sourceText?: string;
  }) {
    const article = await prisma.article.findUnique({
      where: { id: params.articleId },
      include: { content: true, city: true, category: true },
    });
    if (!article) throw new AppError("Article not found", "NOT_FOUND", 404);

    const sourceText = this.buildSourceText(article, params.sourceText);

    let output = "";
    let usedProvider: Provider | "mock" = "mock";
    let usedModel = "mock-local";

    if (env.MOCK_AI) {
      logger.info({ articleId: params.articleId, type: params.generationType }, "Using mock AI");
      const mock = mockGenerate(params.generationType, params.prompt, {
        cityName: article.city.name,
        title: article.title,
      });
      output = mock.output;
      usedProvider = mock.provider as Provider;
      usedModel = mock.model;
    } else {
      const providers = this.resolveProviderOrder(params.generationType);
      if (providers.length === 0) {
        throw new AppError(
          "No AI providers configured. Set OPENAI_API_KEY in backend/.env and MOCK_AI=false.",
          "AI_NOT_CONFIGURED",
          503,
        );
      }

      let lastError: Error | null = null;
      usedProvider = null as unknown as Provider;
      const models = getModels();

      for (const provider of providers) {
        try {
          output = await this.callProvider(provider, params.generationType, params.prompt);
          usedProvider = provider;
          usedModel = models[provider];
          logger.info(
            { articleId: params.articleId, provider, model: usedModel, type: params.generationType },
            "AI generation succeeded",
          );
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn({ provider, err: lastError.message }, "AI provider failed, trying fallback");
        }
      }

      if (!usedProvider || !output) {
        logger.warn({ err: lastError?.message }, "All AI providers failed — falling back to mock");
        const mock = mockGenerate(params.generationType, params.prompt, {
          cityName: article.city.name,
          title: article.title,
        });
        output = mock.output;
        usedProvider = "mock" as Provider;
        usedModel = mock.model;
      }
    }

    const confidence = confidenceService.evaluate({
      content: output,
      sourceText,
      generationType: params.generationType,
    });

    const generation = await prisma.aiGeneration.create({
      data: {
        articleId: params.articleId,
        model: usedModel,
        provider: usedProvider === ("mock" as Provider) ? "mock" : usedProvider,
        generationType: params.generationType,
        confidenceScore: confidence.score,
        outputType: "text",
        outputContent: output,
      },
    });

    await this.applyOutput(article.id, params.generationType, output);
    await moderationService.applyConfidenceRouting(article.id, confidence.score);

    const versionCount = await prisma.articleVersion.count({
      where: { articleId: article.id },
    });

    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        versionNumber: versionCount + 1,
        content: output,
        changeType: `ai_${params.generationType}`,
        aiGenerationId: generation.id,
      },
    });

    return { generation, confidence, output };
  }

  /** Prefer configured providers; OpenAI first when it is the only key present. */
  private resolveProviderOrder(generationType: GenerationType): Provider[] {
    const configured = getConfiguredProviders();
    if (configured.length === 0) return [];

    const route = ROUTING[generationType];
    const ordered = [
      ...route.filter((p) => configured.includes(p)),
      ...configured.filter((p) => !route.includes(p)),
    ];
    return [...new Set(ordered)];
  }

  private async callProvider(
    provider: Provider,
    generationType: GenerationType,
    prompt: string,
  ): Promise<string> {
    const system = this.systemPrompt(generationType);

    if (provider === "openai") {
      if (!this.openai) throw new Error("OpenAI not configured");
      const res = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
      });
      return res.choices[0]?.message?.content?.trim() ?? "";
    }

    if (provider === "anthropic") {
      if (!this.anthropic) throw new Error("Anthropic not configured");
      const res = await this.anthropic.messages.create({
        model: getModels().anthropic,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      const block = res.content.find((b) => b.type === "text");
      return block && "text" in block ? block.text.trim() : "";
    }

    return this.callDeepSeek(system, prompt);
  }

  private async callDeepSeek(system: string, prompt: string): Promise<string> {
    if (!env.DEEPSEEK_API_KEY) throw new Error("DeepSeek not configured");
    const res = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: getModels().deepseek,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek error: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }

  private buildSourceText(
    article: { title: string; content?: { content: string } | null },
    provided?: string,
  ): string {
    const chunks = [provided, article.content?.content, article.title].filter(
      (s): s is string => Boolean(s?.trim()),
    );
    return [...new Set(chunks)].join("\n\n").slice(0, 8000);
  }

  private systemPrompt(type: GenerationType): string {
    const base =
      "You are Alyson AI, a local news editor. Use ONLY facts from the user message. Do not invent quotes, statistics, or names. Write clear, complete sentences.";
    const prompts: Record<GenerationType, string> = {
      summary: `${base} Produce a 2-paragraph summary (90+ words).`,
      rewrite: `${base} Produce a full article body (150+ words). Journalistic tone.`,
      headline: `${base} Produce one headline (8–14 words, under 90 characters).`,
      seo: `${base} Return only valid JSON with title, description, canonicalPath, keywords.`,
      newsletter: `${base} Produce newsletter HTML with h2 and p tags only (120+ words).`,
      social_caption: `${base} Produce one caption (40–260 characters) with hashtags.`,
    };
    return prompts[type];
  }

  private async applyOutput(articleId: number, type: GenerationType, output: string) {
    if (type === "headline") {
      await prisma.article.update({ where: { id: articleId }, data: { title: output.slice(0, 200) } });
      return;
    }

    const existing = await prisma.articleContent.findUnique({ where: { articleId } });
    const data: {
      content?: string;
      seoDescription?: string;
      newsletterHtml?: string;
    } = {};

    if (type === "summary" || type === "rewrite") data.content = output;
    if (type === "seo") {
      try {
        const parsed = JSON.parse(output) as { description?: string };
        data.seoDescription = parsed.description ?? output;
      } catch {
        data.seoDescription = output;
      }
    }
    if (type === "newsletter") data.newsletterHtml = output;

    if (existing) {
      await prisma.articleContent.update({ where: { articleId }, data });
    } else if (Object.keys(data).length > 0) {
      await prisma.articleContent.create({
        data: {
          articleId,
          content: data.content ?? "",
          seoDescription: data.seoDescription,
          newsletterHtml: data.newsletterHtml,
        },
      });
    }
  }

  async listByArticle(articleId: number) {
    return prisma.aiGeneration.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
    });
  }

  async testConnection(): Promise<{ ok: boolean; provider: string; model: string; sample?: string }> {
    if (env.MOCK_AI) {
      return { ok: true, provider: "mock", model: "mock-local", sample: "Mock AI is enabled." };
    }
    const providers = getConfiguredProviders();
    if (providers.length === 0) {
      return { ok: false, provider: "none", model: "none" };
    }
    const provider = providers[0];
    const sample = await this.callProvider(provider, "headline", "Reply with exactly: Alyson AI connected.");
    return { ok: true, provider, model: getModels()[provider], sample: sample.slice(0, 120) };
  }
}

export const aiOrchestratorService = new AiOrchestratorService();
