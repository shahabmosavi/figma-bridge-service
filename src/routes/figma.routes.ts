import { Router } from "express";

import { createDesignDraft } from "../controllers/figma.controller";

export const figmaRoutes = Router();

figmaRoutes.post("/create-design-draft", createDesignDraft);
