import { Router } from "express";

import {
  getDesignTokens,
  TokenRegistryValidationError
} from "../services/design-system.service";

export const designSystemRoutes = Router();

designSystemRoutes.get("/tokens", async (_req, res, next) => {
  try {
    const tokens = await getDesignTokens();
    return res.status(200).json(tokens);
  } catch (error) {
    if (error instanceof TokenRegistryValidationError) {
      return res.status(500).json({
        success: false,
        error: "TOKEN_REGISTRY_INVALID",
        message: error.message
      });
    }

    return next(error);
  }
});
