import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { hashToken } from "../utils/encryption.js";
import type { AuthPayload } from "../middleware/auth.js";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "active") {
      throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    return this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async refresh(refreshToken: string) {
    let payload: AuthPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AuthPayload;
    } catch {
      throw new AppError("Invalid refresh token", "INVALID_REFRESH", 401);
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: { userId: payload.userId, tokenHash },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError("Refresh token expired", "INVALID_REFRESH", 401);
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(payload);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  private async issueTokens(payload: AuthPayload) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return { accessToken, refreshToken, user };
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

export const authService = new AuthService();
