import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();

export const createDesignDraftSchema = z.object({
  issueKey: requiredText,
  briefTitle: requiredText,
  objective: requiredText,
  targetUser: requiredText,
  requiredSections: optionalText,
  requiredStates: optionalText,
  uxNotes: optionalText,
  designConstraints: optionalText,
  acceptanceCriteria: optionalText,
  figmaInstruction: requiredText
});

export type CreateDesignDraftInput = z.infer<typeof createDesignDraftSchema>;

export const completeDesignJobSchema = z.object({
  figmaFrameId: requiredText,
  figmaFileKey: z.string().trim().min(1).nullish(),
  figmaFileUrl: z.string().trim().min(1).nullish(),
  figmaFrameUrl: z.string().trim().min(1).nullish()
});

export type CompleteDesignJobInput = z.infer<typeof completeDesignJobSchema>;

export const failDesignJobSchema = z.object({
  reason: requiredText
});

export type FailDesignJobInput = z.infer<typeof failDesignJobSchema>;
