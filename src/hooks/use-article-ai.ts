import { useMutation } from "@tanstack/react-query";
import {
  generateLiveArticleAi,
  isLiveApiEnabled,
  type AiGenerationType,
} from "@/lib/api-client";
import { generateArticleAi } from "@/lib/api";

export function useArticleAi(articleId: number) {
  return useMutation({
    mutationFn: (params: {
      generationType: AiGenerationType;
      prompt: string;
      sourceText?: string;
    }) =>
      isLiveApiEnabled()
        ? generateLiveArticleAi(articleId, params)
        : generateArticleAi(articleId, params),
  });
}
