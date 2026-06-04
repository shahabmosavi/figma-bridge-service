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
