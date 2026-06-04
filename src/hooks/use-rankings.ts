import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRankedArticles,
  fetchRankingWeights,
  recalculateRankings,
  saveRankingWeights,
  isLiveApiEnabled,
  type RankingWeights,
} from "@/lib/api-client";

export const rankingKeys = {
  weights: ["ranking-weights"] as const,
  list: (cityId?: number, weights?: RankingWeights) =>
    ["ranked-articles", cityId, weights] as const,
};

export function useRankingWeights() {
  return useQuery({
    queryKey: rankingKeys.weights,
    queryFn: fetchRankingWeights,
    enabled: isLiveApiEnabled(),
    staleTime: 30_000,
  });
}

export function useRankedArticles(cityId?: number, weights?: RankingWeights, enabled = true) {
  return useQuery({
    queryKey: rankingKeys.list(cityId, weights),
    queryFn: () => fetchRankedArticles(cityId, weights),
    enabled: isLiveApiEnabled() && enabled,
    staleTime: 10_000,
  });
}

export function useSaveRankingWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weights, autoRank }: { weights: RankingWeights; autoRank?: boolean }) =>
      saveRankingWeights(weights, autoRank),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rankingKeys.weights });
      qc.invalidateQueries({ queryKey: ["ranked-articles"] });
    },
  });
}

export function useRecalculateRankings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cityId, weights }: { cityId?: number; weights: RankingWeights }) =>
      recalculateRankings(cityId, weights),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ranked-articles"] });
    },
  });
}
