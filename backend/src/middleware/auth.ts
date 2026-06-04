import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { sendError } from "../utils/api-response.js";

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    sendError(res, "Authentication required", "UNAUTHORIZED", 401);
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    sendError(res, "Invalid or expired token", "UNAUTHORIZED", 401);
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Authentication required", "UNAUTHORIZED", 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, "Insufficient permissions", "FORBIDDEN", 403);
      return;
    }
    next();
  };
}

export async function loadUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "active") {
    throw new AppError("User not found or inactive", "USER_INACTIVE", 401);
  }
  return user;
}
