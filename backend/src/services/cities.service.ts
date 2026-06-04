import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { slugify, uniqueSlug } from "../utils/slug.js";
import { normalizeStateCode } from "../utils/us-states.js";
import { analyticsService } from "./analytics.service.js";

export type CitySortField =
  | "name"
  | "articles"
  | "clicks"
  | "ctr"
  | "revenue"
  | "subscribers";

export class CitiesService {
  async list(params: {
    status?: string;
    search?: string;
    skip: number;
    take: number;
    sortBy?: CitySortField;
    sortOrder?: "asc" | "desc";
  }) {
    const where = {
      status: params.status,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              { state: { contains: params.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [cities, total] = await Promise.all([
      prisma.city.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: "asc" },
        include: { cityMetrics: true, _count: { select: { articles: true, subscribers: true } } },
      }),
      prisma.city.count({ where }),
    ]);

    const items = cities.map((c) => this.formatCity(c));
    const sorted = this.sortCities(items, params.sortBy ?? "name", params.sortOrder ?? "asc");

    return {
      items: sorted,
      total,
    };
  }

  sortCities<T extends Record<CitySortField, number | string>>(
    items: T[],
    sortBy: CitySortField,
    sortOrder: "asc" | "desc",
  ): T[] {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }

  async getById(id: number) {
    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        cityMetrics: true,
        _count: { select: { articles: true, subscribers: true } },
      },
    });
    if (!city) throw new AppError("City not found", "NOT_FOUND", 404);
    return this.formatCity(city, true);
  }

  async create(data: {
    name: string;
    state: string;
    subdomain: string;
    population: number;
    status?: string;
  }) {
    const slug = await uniqueSlug(data.name, async (s) => {
      const exists = await prisma.city.findUnique({ where: { slug: s } });
      return !!exists;
    });

    const stateCode = normalizeStateCode(data.state);
    if (!stateCode) {
      throw new AppError("Invalid US state", "VALIDATION", 400);
    }

    const city = await prisma.city.create({
      data: {
        name: data.name,
        state: stateCode,
        slug,
        subdomain: data.subdomain,
        population: data.population,
        status: data.status ?? "active",
      },
    });

    await prisma.cityMetric.create({
      data: {
        cityId: city.id,
        views: 0,
        clicks: 0,
        avgCtr: 0,
        revenue: 0,
        subscriberCount: 0,
        totalArticles: 0,
        pendingReviews: 0,
        updatedAt: new Date(),
      },
    });

    return this.getById(city.id);
  }

  async update(id: number, data: Partial<{ name: string; status: string; subdomain: string; population: number }>) {
    await prisma.city.update({ where: { id }, data });
    await analyticsService.refreshCityMetrics(id);
    return this.getById(id);
  }

  private formatCity(
    city: {
      id: number;
      name: string;
      state: string;
      slug: string;
      subdomain: string;
      population: number;
      status: string;
      cityMetrics?: {
        clicks: number;
        avgCtr: number;
        revenue: number;
        subscriberCount: number;
        totalArticles: number;
        topCategory: string | null;
      } | null;
      _count?: { articles: number; subscribers: number };
    },
    detailed = false,
  ) {
    const m = city.cityMetrics;
    const base = {
      id: city.id,
      name: city.name,
      state: city.state,
      slug: city.slug,
      subdomain: city.subdomain,
      population: city.population,
      status: city.status,
      articles: m?.totalArticles ?? city._count?.articles ?? 0,
      clicks: m?.clicks ?? 0,
      ctr: m?.avgCtr ?? 0,
      revenue: m?.revenue ?? 0,
      subscribers: m?.subscriberCount ?? city._count?.subscribers ?? 0,
      topCategory: m?.topCategory ?? "Local News",
    };
    if (!detailed) return base;
    return base;
  }
}

export const citiesService = new CitiesService();
