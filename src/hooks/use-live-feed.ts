import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchLiveArticles,
  fetchLiveCities,
  fetchLiveArticle,
  refreshLiveFeed,
  createLiveCity,
  isLiveApiEnabled,
  type ArticleSortField,
  type CreateCityInput,
} from "@/lib/api-client";

export const articleKeys = {
  all: ["live-articles"] as const,
  list: (filters: Record<string, unknown>) => ["live-articles", filters] as const,
  detail: (id: number) => ["live-articles", id] as const,
};

export const cityKeys = {
  all: (sort?: { sortBy?: string; sortOrder?: string }) => ["live-cities", sort] as const,
};

export function useLiveArticles(filters?: {
  cityId?: number;
  status?: string;
  search?: string;
  limit?: number;
  sortBy?: ArticleSortField;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: articleKeys.list(filters ?? {}),
    queryFn: () => fetchLiveArticles(filters),
    enabled: isLiveApiEnabled(),
    staleTime: 60_000,
  });
}

export function useLiveArticle(id: number) {
  return useQuery({
    queryKey: articleKeys.detail(id),
    queryFn: () => fetchLiveArticle(id),
    enabled: isLiveApiEnabled() && id > 0,
  });
}

export function useLiveCities(sort?: {
  sortBy?: import("../lib/api-client.js").CitySortField;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: cityKeys.all(sort),
    queryFn: () => fetchLiveCities(sort),
    enabled: isLiveApiEnabled(),
    staleTime: 120_000,
  });
}

export function useRefreshFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cityId?: number) => refreshLiveFeed(cityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: articleKeys.all });
      qc.invalidateQueries({ queryKey: cityKeys.all });
    },
  });
}

export function useCreateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCityInput) => createLiveCity(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-cities"] });
    },
  });
}
