export interface ConfidenceInput {
  content: string;
  sourceText?: string;
  generationType: string;
}

export interface ConfidenceResult {
  score: number;
  factors: {
    coherence: number;
    formatting: number;
    sourceSimilarity: number;
    completeness: number;
    hallucinationRisk: number;
  };
}

export class ConfidenceService {
  evaluate(input: ConfidenceInput): ConfidenceResult {
    const content = input.content.trim();
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const coherence = this.scoreCoherence(content, wordCount);
    const formatting = this.scoreFormatting(content);
    const sourceSimilarity = this.scoreSourceSimilarity(content, input.sourceText);
    const completeness = this.scoreCompleteness(wordCount, input.generationType);
    const hallucinationRisk = this.scoreHallucinationRisk(content, input.sourceText);

    const score =
      coherence * 0.25 +
      formatting * 0.15 +
      sourceSimilarity * 0.2 +
      completeness * 0.25 +
      (1 - hallucinationRisk) * 0.15;

    return {
      score: Math.min(0.99, Math.max(0.1, Math.round(score * 100) / 100)),
      factors: {
        coherence,
        formatting,
        sourceSimilarity,
        completeness,
        hallucinationRisk,
      },
    };
  }

  private scoreCoherence(content: string, wordCount: number): number {
    if (wordCount < 20) return 0.4;
    if (wordCount < 80) return 0.65;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length < 2) return 0.55;
    return 0.85 + Math.min(0.1, sentences.length / 50);
  }

  private scoreFormatting(content: string): number {
    let score = 0.7;
    if (/^#+\s/m.test(content) || content.includes("<p>")) score += 0.1;
    if (content.length > 100 && !content.includes("  ")) score += 0.1;
    if (!/lorem ipsum|as an ai|placeholder/i.test(content)) score += 0.1;
    return Math.min(1, score);
  }

  private scoreSourceSimilarity(content: string, sourceText?: string): number {
    if (!sourceText) return 0.75;
    const contentWords = new Set(content.toLowerCase().split(/\W+/).filter((w) => w.length > 4));
    const sourceWords = sourceText.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    if (sourceWords.length === 0) return 0.7;
    const overlap = sourceWords.filter((w) => contentWords.has(w)).length;
    const ratio = overlap / Math.max(sourceWords.length, 1);
    return Math.min(0.95, 0.5 + ratio * 0.5);
  }

  private scoreCompleteness(wordCount: number, generationType: string): number {
    const targets: Record<string, number> = {
      summary: 70,
      rewrite: 150,
      headline: 6,
      seo: 20,
      newsletter: 100,
      social_caption: 15,
    };
    const target = targets[generationType] ?? 80;
    const ratio = wordCount / target;
    if (generationType === "headline") {
      return Math.min(1, ratio >= 1 ? 1 : Math.max(0.5, ratio));
    }
    return Math.min(1, Math.max(0.35, ratio));
  }

  private scoreHallucinationRisk(content: string, sourceText?: string): number {
    let risk = 0.15;
    if (/according to undisclosed|unverified claim|breaking:\s*unknown/i.test(content)) {
      risk += 0.35;
    }
    if (sourceText && content.length > sourceText.length * 3) {
      risk += 0.2;
    }
    return Math.min(1, risk);
  }
}

export const confidenceService = new ConfidenceService();
