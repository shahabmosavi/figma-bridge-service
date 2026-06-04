import { NextFunction, Request, Response } from "express";

import { createFigmaDesignDraft } from "../services/figma.service";
import { createDesignDraftSchema } from "../schemas/figma.schema";

export const createDesignDraft = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = createDesignDraftSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        details: validation.error.issues
      });
    }

    const result = await createFigmaDesignDraft(validation.data);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
