import { prisma } from "../config/database.js";
import type { QueueName } from "../config/queues.js";

export class SystemJobsService {
  async create(data: {
    jobType: string;
    queueName: QueueName;
    payload?: Record<string, unknown>;
    cityId?: number;
    articleId?: number;
    bullJobId?: string;
  }) {
    return prisma.systemJob.create({
      data: {
        jobType: data.jobType,
        queueName: data.queueName,
        status: "pending",
        payload: data.payload as object | undefined,
        cityId: data.cityId,
        articleId: data.articleId,
        bullJobId: data.bullJobId,
      },
    });
  }

  async markActive(id: number) {
    return prisma.systemJob.update({
      where: { id },
      data: { status: "active", startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  async markCompleted(id: number, result?: Record<string, unknown>) {
    return prisma.systemJob.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
        result: result as object | undefined,
      },
    });
  }

  async markFailed(id: number, errorMessage: string) {
    return prisma.systemJob.update({
      where: { id },
      data: { status: "failed", errorMessage, completedAt: new Date() },
    });
  }

  async list(queueName?: string, status?: string, skip = 0, take = 50) {
    const where = {
      queueName: queueName ?? undefined,
      status: status ?? undefined,
    };
    const [items, total] = await Promise.all([
      prisma.systemJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.systemJob.count({ where }),
    ]);
    return { items, total };
  }
}

export const systemJobsService = new SystemJobsService();
