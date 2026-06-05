import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();

const designPlanSchema = z.object({
  layoutPattern: z.string().trim().min(1).optional(),
  contentBlocks: z.array(z.record(z.unknown())).optional()
}).passthrough();

// Pull a non-empty string from an unknown designPlan object field.
function dpStr(dp: unknown, key: string): string | undefined {
  if (dp != null && typeof dp === "object" && key in dp) {
    const v = (dp as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

// Pull a non-empty string from a designPlan field that may be a string or string[].
function dpStrOrArr(dp: unknown, key: string): string | undefined {
  if (dp != null && typeof dp === "object" && key in dp) {
    const v = (dp as Record<string, unknown>)[key];
    if (Array.isArray(v)) {
      const joined = v.filter((x): x is string => typeof x === "string").join(", ");
      return joined.length > 0 ? joined : undefined;
    }
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export const createDesignDraftSchema = z.object({
  issueKey: requiredText,
  // These four are optional at top level — they may come from designPlan instead.
  briefTitle: optionalText,
  objective: optionalText,
  targetUser: optionalText,
  figmaInstruction: optionalText,
  requiredSections: optionalText,
  requiredStates: optionalText,
  uxNotes: optionalText,
  designConstraints: optionalText,
  acceptanceCriteria: optionalText,
  designPlan: designPlanSchema.optional()
}).superRefine((data, ctx) => {
  const dp = data.designPlan;
  for (const key of ["briefTitle", "objective", "targetUser", "figmaInstruction"] as const) {
    if (!data[key] && !dpStr(dp, key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} is required. Provide it at top level or inside designPlan.`,
        path: [key]
      });
    }
  }
}).transform((data) => {
  const dp = data.designPlan;
  return {
    ...data,
    briefTitle: data.briefTitle ?? dpStr(dp, "briefTitle") ?? "",
    objective: data.objective ?? dpStr(dp, "objective") ?? "",
    targetUser: data.targetUser ?? dpStr(dp, "targetUser") ?? "",
    figmaInstruction: data.figmaInstruction ?? dpStr(dp, "figmaInstruction") ?? "",
    requiredSections: data.requiredSections ?? dpStrOrArr(dp, "requiredSections"),
    requiredStates: data.requiredStates ?? dpStrOrArr(dp, "requiredStates")
  };
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
