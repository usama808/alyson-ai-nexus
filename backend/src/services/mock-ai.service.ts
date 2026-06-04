import type { GenerationType } from "./ai-orchestrator.service.js";

const MOCK_MODEL = "mock-local";
const MOCK_PROVIDER = "mock";

export function mockAiEnabled(): boolean {
  return true;
}

export function mockGenerate(
  generationType: GenerationType,
  prompt: string,
  context?: { cityName?: string; title?: string },
): { output: string; provider: string; model: string } {
  const city = context?.cityName ?? "your city";
  const title = context?.title ?? prompt.slice(0, 80);

  const outputs: Record<GenerationType, string> = {
    summary: `[Mock summary] ${title} — Local developments in ${city} continue to draw reader interest. Key points from the source material are reflected below without added speculation. ${prompt.slice(0, 120)}`,
    rewrite: `[Mock rewrite] ${title}\n\nResidents of ${city} are following this story closely. ${prompt.slice(0, 200)}\n\nReporting reflects available public information at time of generation.`,
    headline: `${title.split(" ").slice(0, 8).join(" ")} — ${city} Update`,
    seo: JSON.stringify({
      title: `${title} | ${city} Local News`,
      description: `Latest on ${title} in ${city}. AI-assisted local coverage.`,
      canonicalPath: `/articles/${title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
      keywords: [city, "local news", "trending"],
    }),
    newsletter: `<h2>${title}</h2><p>Top story for ${city} readers today.</p><p>${prompt.slice(0, 160)}</p>`,
    social_caption: `📍 ${city}: ${title.slice(0, 120)} — read the full story on Alyson News.`,
  };

  return {
    output: outputs[generationType],
    provider: MOCK_PROVIDER,
    model: MOCK_MODEL,
  };
}
