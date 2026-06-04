import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import {
  completeDesignJob,
  createFigmaDesignDraft,
  failDesignJob,
  getDesignJob,
  listPendingDesignJobs
} from "../services/figma.service";
import {
  completeDesignJobSchema,
  createDesignDraftSchema,
  failDesignJobSchema
} from "../schemas/figma.schema";

export const createDesignDraft = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = validateBody(createDesignDraftSchema, req.body, res);
    if (!validation) return;

    const result = await createFigmaDesignDraft(validation.data);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getPendingJobs = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[figma/jobs/pending] called", {
      timestamp: new Date().toISOString()
    });

    const jobs = await listPendingDesignJobs();
    console.log("[figma/jobs/pending] returning pending jobs", {
      timestamp: new Date().toISOString(),
      count: jobs.length
    });

    return res.status(200).json({
      success: true,
      jobs
    });
  } catch (error) {
    return next(error);
  }
};

export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jobId = getJobIdParam(req);
    const job = await getDesignJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "JOB_NOT_FOUND",
        message: "Design job not found."
      });
    }

    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    return next(error);
  }
};

export const completeJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jobId = getJobIdParam(req);
    const validation = validateBody(completeDesignJobSchema, req.body, res);
    if (!validation) return;

    const job = await completeDesignJob(jobId, validation.data);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "JOB_NOT_FOUND",
        message: "Design job not found."
      });
    }

    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    return next(error);
  }
};

export const failJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jobId = getJobIdParam(req);
    const validation = validateBody(failDesignJobSchema, req.body, res);
    if (!validation) return;

    const job = await failDesignJob(jobId, validation.data);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "JOB_NOT_FOUND",
        message: "Design job not found."
      });
    }

    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    return next(error);
  }
};

const validateBody = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  body: unknown,
  res: Response
): z.SafeParseSuccess<z.infer<Schema>> | undefined => {
  const validation = schema.safeParse(body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      details: validation.error.issues
    });
    return undefined;
  }

  return validation;
};

const getJobIdParam = (req: Request): string => {
  const { jobId } = req.params;
  return Array.isArray(jobId) ? jobId[0] : jobId;
};
