import {
  CompleteDesignJobInput,
  CreateDesignDraftInput,
  FailDesignJobInput
} from "../schemas/figma.schema";

export type DesignJobStatus = "pending" | "completed" | "failed";

export type DesignJob = CreateDesignDraftInput & {
  jobId: string;
  status: DesignJobStatus;
  createdAt: string;
  updatedAt: string;
  figmaFileKey?: string;
  figmaFileUrl?: string;
  figmaFrameId?: string;
  figmaFrameUrl?: string;
  failureReason?: string;
};

export type CreateDesignJobResult = {
  success: true;
  status: "pending";
  jobId: string;
  issueKey: string;
  briefTitle: string;
  message: string;
};

const jobs = new Map<string, DesignJob>();

export const createFigmaDesignDraft = async (
  input: CreateDesignDraftInput
): Promise<CreateDesignJobResult> => {
  const now = new Date().toISOString();
  const job: DesignJob = {
    jobId: crypto.randomUUID(),
    ...input,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };

  jobs.set(job.jobId, job);

  return {
    success: true,
    status: "pending",
    jobId: job.jobId,
    issueKey: input.issueKey,
    briefTitle: input.briefTitle,
    message: "Design brief received. Waiting for Figma plugin to create the draft."
  };
};

export const listPendingDesignJobs = async (): Promise<DesignJob[]> => {
  return Array.from(jobs.values()).filter((job) => job.status === "pending");
};

export const getDesignJob = async (jobId: string): Promise<DesignJob | undefined> => {
  return jobs.get(jobId);
};

export const completeDesignJob = async (
  jobId: string,
  input: CompleteDesignJobInput
): Promise<DesignJob | undefined> => {
  const job = jobs.get(jobId);

  if (!job) {
    return undefined;
  }

  const updatedJob: DesignJob = {
    ...job,
    status: "completed",
    figmaFileKey: input.figmaFileKey,
    figmaFileUrl: input.figmaFileUrl,
    figmaFrameId: input.figmaFrameId,
    figmaFrameUrl: input.figmaFrameUrl,
    failureReason: undefined,
    updatedAt: new Date().toISOString()
  };

  jobs.set(jobId, updatedJob);
  return updatedJob;
};

export const failDesignJob = async (
  jobId: string,
  input: FailDesignJobInput
): Promise<DesignJob | undefined> => {
  const job = jobs.get(jobId);

  if (!job) {
    return undefined;
  }

  const updatedJob: DesignJob = {
    ...job,
    status: "failed",
    failureReason: input.reason,
    updatedAt: new Date().toISOString()
  };

  jobs.set(jobId, updatedJob);
  return updatedJob;
};
