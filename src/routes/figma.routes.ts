import { Router } from "express";

import {
  completeJob,
  createDesignDraft,
  failJob,
  getJobById,
  getPendingJobs
} from "../controllers/figma.controller";

export const figmaRoutes = Router();

figmaRoutes.post("/create-design-draft", createDesignDraft);
figmaRoutes.get("/jobs/pending", getPendingJobs);
figmaRoutes.get("/jobs/:jobId", getJobById);
figmaRoutes.post("/jobs/:jobId/complete", completeJob);
figmaRoutes.post("/jobs/:jobId/fail", failJob);
