import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export class CityRepository {
  findMany(args: Prisma.CityFindManyArgs) {
    return prisma.city.findMany(args);
  }

  findUnique(id: number) {
    return prisma.city.findUnique({
      where: { id },
      include: { cityMetrics: true },
    });
  }

  findBySlug(slug: string) {
    return prisma.city.findUnique({ where: { slug } });
  }

  create(data: Prisma.CityCreateInput) {
    return prisma.city.create({ data });
  }

  update(id: number, data: Prisma.CityUpdateInput) {
    return prisma.city.update({ where: { id }, data });
  }
}

export const cityRepository = new CityRepository();
