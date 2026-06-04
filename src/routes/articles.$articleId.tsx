import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Sparkles,
  Wand2,
  FileText,
  Mail,
  Share2,
  Search,
  Save,
  Send,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { PageShell, SectionCard, Badge } from "@/components/PageShell";
import { articles as mockArticles } from "@/lib/mock-data";
import { fetchAiStatus, isLiveApiEnabled } from "@/lib/api-client";
import type { AiGenerateResult, AiGenerationType } from "@/lib/api-client";
import type { AiStatus } from "@/lib/api-client";
import { AI_ACTIONS, buildAiPrompt, buildSourceContext, confidenceImprovementTips } from "@/lib/ai-prompts";
import { useArticleAi } from "@/hooks/use-article-ai";
import { articleKeys, useLiveArticle } from "@/hooks/use-live-feed";
import type { LiveArticle } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/articles/$articleId")({
  component: ArticleEditor,
});

function AiStatusBadge({ status }: { status?: AiStatus }) {
  if (!status) return null;
  if (status.mock) {
    return (
      <Badge tone="warning">
        <Sparkles className="h-2.5 w-2.5" /> Mock AI
      </Badge>
    );
  }
  const model = status.models.openai ?? status.primaryProvider ?? "live";
  return (
    <Badge tone="primary">
      <Sparkles className="h-2.5 w-2.5" /> {model} · {status.primaryProvider}
    </Badge>
  );
}

const actionIcons = {
  headline: Wand2,
  summary: FileText,
  seo: Search,
  newsletter: Mail,
  social_caption: Share2,
  rewrite: FileText,
} as const;

function ArticleEditor() {
  const { articleId } = Route.useParams();
  const id = Number(articleId);
  const isNew = articleId === "new";
  const live = isLiveApiEnabled() && !isNew && !Number.isNaN(id) && id > 0;
  const qc = useQueryClient();

  const { data: aiStatus } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAiStatus,
    enabled: live,
    staleTime: 60_000,
  });

  const {
    data: liveArticle,
    isLoading: liveLoading,
    isError: liveError,
    error: liveErrorDetail,
  } = useLiveArticle(live ? id : 0);

  const listFallback = useMemo((): LiveArticle | undefined => {
    if (!live) return undefined;
    const caches = qc.getQueriesData<{ articles: LiveArticle[] }>({ queryKey: articleKeys.all });
    for (const [, data] of caches) {
      const hit = data?.articles?.find((a) => a.id === id);
      if (hit) return hit;
    }
    return undefined;
  }, [live, id, qc, liveArticle]);

  const mockArticle = mockArticles.find((a) => String(a.id) === articleId);
  const article = live ? (liveArticle ?? listFallback) : mockArticle;
  const apiLoading = live && liveLoading;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [newsletterHtml, setNewsletterHtml] = useState("");
  const [socialCaption, setSocialCaption] = useState("");
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [confidenceFactors, setConfidenceFactors] = useState<
    AiGenerateResult["confidence"]["factors"] | null
  >(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const ai = useArticleAi(live ? id : 0);

  useEffect(() => {
    if (!article) return;
    setTitle(article.title);
    if ("content" in article && article.content) setBody(article.content);
    else if (!live) {
      setBody(
        "Write the body of the article here. Use the AI assistant to summarize, rewrite, and optimize.",
      );
    }
    if ("seoDescription" in article && article.seoDescription) {
      setMetaDescription(article.seoDescription);
    }
    if ("newsletterHtml" in article && article.newsletterHtml) {
      setNewsletterHtml(article.newsletterHtml);
    }
    setAiConfidence(article.aiConfidence ?? null);
  }, [article, live]);

  const runAi = async (generationType: AiGenerationType, label: string) => {
    if (!live) {
      setAiError("Connect the API (VITE_API_URL) to use live AI generation.");
      return;
    }
    if (!article) {
      setAiError("Article is still loading — try again in a moment.");
      return;
    }

    setAiError(null);
    setActiveAction(label);
    setLastOutput(null);

    const ctx = {
      title,
      city: article?.city ?? "Local",
      category: article?.category ?? "Local News",
      body,
    };
    const prompt = buildAiPrompt(generationType, ctx);
    const sourceText = buildSourceContext(ctx);

    try {
      const result = await ai.mutateAsync({
        generationType,
        prompt,
        sourceText,
      });

      setLastOutput(result.output);
      setAiConfidence(result.confidence.score);
      setConfidenceFactors(result.confidence.factors);

      if (generationType === "headline") {
        setTitle(result.output.replace(/^["']|["']$/g, "").trim());
      } else if (generationType === "summary" || generationType === "rewrite") {
        setBody(result.output);
      } else if (generationType === "seo") {
        try {
          const parsed = JSON.parse(result.output) as {
            description?: string;
            title?: string;
          };
          if (parsed.description) setMetaDescription(parsed.description);
          if (parsed.title) setTitle(parsed.title);
        } catch {
          setMetaDescription(result.output);
        }
      } else if (generationType === "newsletter") {
        setNewsletterHtml(result.output);
      } else if (generationType === "social_caption") {
        setSocialCaption(result.output);
      }

      qc.invalidateQueries({ queryKey: articleKeys.detail(id) });
      qc.invalidateQueries({ queryKey: articleKeys.all });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setActiveAction(null);
    }
  };

  const confidencePct =
    aiConfidence != null ? Math.round(aiConfidence * 100) : article ? Math.round((article.aiConfidence ?? 0) * 100) : 0;

  return (
    <PageShell
      title="Article Editor"
      subtitle={
        apiLoading && live
          ? "Loading…"
          : article
            ? `${article.city} · ${article.category}`
            : isNew
              ? "New draft"
              : "Article not found"
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          to="/articles"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> All articles
        </Link>
        {article && "sourceUrl" in article && article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View original source
          </a>
        )}
        {live && <AiStatusBadge status={aiStatus} />}
      </div>

      {!article && !apiLoading && !isNew && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {liveError
            ? liveErrorDetail instanceof Error
              ? liveErrorDetail.message
              : "Could not load this article from the API."
            : "Article not found."}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <SectionCard>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-semibold tracking-tight bg-transparent focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge tone="warning">{article?.status ?? "Draft"}</Badge>
              {live && <span>· Connected to OpenAI</span>}
            </div>
            <div className="mt-5 space-y-3 text-sm leading-relaxed">
              <textarea
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Article body…"
                className="w-full bg-transparent focus:outline-none resize-none border-t border-border pt-3"
              />
            </div>
          </SectionCard>

          <SectionCard title="SEO" description="Search optimization metadata">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Meta title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-9 w-full px-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Slug</label>
                <input
                  defaultValue={title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}
                  className="mt-1 h-9 w-full px-3 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Meta description</label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
          </SectionCard>

          {newsletterHtml && (
            <SectionCard title="Newsletter HTML" description="AI-generated email section">
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-40 overflow-auto">
                {newsletterHtml}
              </pre>
            </SectionCard>
          )}

          {socialCaption && (
            <SectionCard title="Social caption">
              <p className="text-sm">{socialCaption}</p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard
            title="AI Assistant"
            description={
              live
                ? aiStatus?.mock
                  ? "Mock mode — set OPENAI_API_KEY and MOCK_AI=false in backend/.env"
                  : `Powered by ${aiStatus?.models.openai ?? aiStatus?.primaryProvider ?? "OpenAI"}`
                : "Enable VITE_API_URL for live AI"
            }
            action={live ? <AiStatusBadge status={aiStatus} /> : undefined}
          >
            <ul className="space-y-2">
              {AI_ACTIONS.map((a) => {
                const Icon = actionIcons[a.generationType];
                const loading = activeAction === a.label;
                return (
                  <li key={a.label}>
                    <button
                      type="button"
                      disabled={!article || ai.isPending}
                      onClick={() => runAi(a.generationType, a.label)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md border border-border bg-card text-sm hover:bg-muted/50 transition text-left disabled:opacity-50",
                        loading && "border-primary bg-primary/5",
                      )}
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{a.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {aiError && (
              <p className="mt-3 text-xs text-destructive" role="alert">
                {aiError}
              </p>
            )}
            {lastOutput && (
              <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last output</p>
                <p className="text-xs whitespace-pre-wrap line-clamp-6">{lastOutput}</p>
              </div>
            )}
            <div className="mt-3 rounded-md border border-dashed border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Raising AI confidence
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                {confidenceImprovementTips(confidenceFactors ?? undefined).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </SectionCard>

          <SectionCard title="Publish">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI confidence</span>
                <span className="font-semibold tabular-nums">{confidencePct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source credibility</span>
                <Badge tone="success">High</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge tone="warning">{article?.status ?? "Draft"}</Badge>
              </div>
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <button
                  type="button"
                  className="h-9 px-3 text-sm rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center gap-1.5 font-medium hover:bg-primary/90"
                >
                  <Send className="h-3.5 w-3.5" /> Publish now
                </button>
                <button
                  type="button"
                  className="h-9 px-3 text-sm rounded-md border border-border bg-card inline-flex items-center justify-center gap-1.5 hover:bg-muted"
                >
                  <Save className="h-3.5 w-3.5" /> Save draft
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Live Preview">
            <div className="text-xs text-muted-foreground">{article?.city ?? "City"}</div>
            <h3 className="mt-1 text-base font-semibold leading-snug">{title}</h3>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{body || "Preview body…"}</p>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
