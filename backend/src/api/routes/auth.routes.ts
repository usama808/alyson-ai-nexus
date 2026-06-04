import { Router } from "express";
import { authController } from "../../controllers/auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { loginSchema, refreshSchema } from "../../validators/auth.validator.js";

export const authRoutes = Router();

authRoutes.post("/login", validate(loginSchema), (req, res, next) =>
  authController.login(req, res).catch(next),
);
authRoutes.post("/refresh", validate(refreshSchema), (req, res, next) =>
  authController.refresh(req, res).catch(next),
);
authRoutes.post("/logout", validate(refreshSchema), (req, res, next) =>
  authController.logout(req, res).catch(next),
);
authRoutes.get("/me", authenticate, (req, res, next) =>
  authController.me(req, res).catch(next),
);
