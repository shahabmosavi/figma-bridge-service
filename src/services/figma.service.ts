import { CreateDesignDraftInput } from "../schemas/figma.schema";

export type FigmaDraftResult = {
  success: true;
  issueKey: string;
  figma_url: string;
  figma_file_id: string;
  figma_frame_id: string;
  briefTitle: string;
  message: string;
};

export const createFigmaDesignDraft = async (
  input: CreateDesignDraftInput
): Promise<FigmaDraftResult> => {
  return {
    success: true,
    issueKey: input.issueKey,
    figma_url: "https://figma.com/file/mock-ai-design-draft",
    figma_file_id: "mock-file-id",
    figma_frame_id: "mock-frame-id",
    briefTitle: input.briefTitle,
    message: "Mock Figma draft created successfully."
  };
};
