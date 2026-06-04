import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class AuthController {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body.email, req.body.password);
    sendSuccess(res, result);
  }

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, result);
  }

  async logout(req: Request, res: Response) {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { loggedOut: true });
  }

  async me(req: Request, res: Response) {
    sendSuccess(res, { user: req.user });
  }
}

export const authController = new AuthController();
