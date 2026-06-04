import type { AiGenerationType } from "@/lib/api";

export function buildSourceContext(ctx: {
  title: string;
  city: string;
  category: string;
  body: string;
}): string {
  const parts = [
    `City: ${ctx.city}`,
    `Category: ${ctx.category}`,
    `Title: ${ctx.title}`,
  ];
  const body = ctx.body.trim();
  if (body.length > 0) {
    parts.push("", "Source material / draft body:", body.slice(0, 4000));
  }
  return parts.join("\n");
}

export function buildAiPrompt(
  type: AiGenerationType,
  ctx: { title: string; city: string; category: string; body: string },
): string {
  const base = buildSourceContext(ctx);

  const instructions: Record<AiGenerationType, string> = {
    headline:
      "Write one compelling, accurate local news headline (8–14 words, under 90 characters). Use only facts from the source material. Return only the headline, no quotes.",
    summary:
      "Write exactly 2 paragraphs (at least 90 words total) summarizing this story for local readers. Stick to facts in the source; do not invent names, numbers, or quotes.",
    rewrite:
      "Rewrite as polished local news prose (at least 180 words). Preserve every fact from the source; do not add unverified claims. Return only the article body.",
    seo: 'Return valid JSON only: {"title":"...","description":"120-160 char meta description","canonicalPath":"/slug","keywords":["..."]}. Use facts from the source only.',
    newsletter:
      "Generate newsletter HTML with one h2 and 2-3 p tags (at least 120 words). Factual, local tone. No script tags.",
    social_caption:
      "Write one social caption (40–260 characters) with a local hook and 2–3 hashtags. No invented facts.",
  };

  return `${base}\n\nTask: ${instructions[type]}`;
}

/** Shown in editor after generation to explain how to raise confidence. */
export function confidenceImprovementTips(factors?: {
  coherence: number;
  formatting: number;
  sourceSimilarity: number;
  completeness: number;
  hallucinationRisk: number;
}): string[] {
  if (!factors) {
    return [
      "Add or paste the original story text in the body before running AI.",
      "Use Summarize or Rewrite so the model has enough source material.",
      "Avoid empty drafts — confidence stays low until AI runs on real content.",
    ];
  }
  const tips: string[] = [];
  if (factors.sourceSimilarity < 0.7) {
    tips.push("Include more of the original article or scrape text in the body so the AI stays aligned with the source.");
  }
  if (factors.completeness < 0.75) {
    tips.push("Ask for a longer output (e.g. full Summarize or Rewrite) — short snippets score lower on completeness.");
  }
  if (factors.coherence < 0.7) {
    tips.push("Use complete sentences and two or more paragraphs for summaries.");
  }
  if (factors.hallucinationRisk > 0.25) {
    tips.push("Trim speculative language; keep claims tied to the source material.");
  }
  if (tips.length === 0) {
    tips.push("Strong scores — safe for review or publish per your moderation thresholds.");
  }
  return tips;
}

export const AI_ACTIONS: {
  label: string;
  generationType: AiGenerationType;
}[] = [
  { label: "Rewrite headline", generationType: "headline" },
  { label: "Summarize", generationType: "summary" },
  { label: "Improve SEO", generationType: "seo" },
  { label: "Generate newsletter version", generationType: "newsletter" },
  { label: "Generate social caption", generationType: "social_caption" },
];
