type DesignJob = {
  jobId: string;
  issueKey?: string;
  briefTitle?: string;
  objective?: string;
  targetUser?: string;
  requiredSections?: string;
  requiredStates?: string;
  uxNotes?: string;
  acceptanceCriteria?: string;
  createdAt?: string;
};

type CreateDraftMessage = {
  type: "create-draft";
  job: DesignJob;
};

const regularFont: FontName = { family: "Inter", style: "Regular" };
const boldFont: FontName = { family: "Inter", style: "Bold" };

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

figma.ui.onmessage = async (message: CreateDraftMessage) => {
  if (message.type !== "create-draft") {
    return;
  }

  try {
    await figma.loadFontAsync(regularFont);
    await figma.loadFontAsync(boldFont);

    const frame = createDraftFrame(message.job);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);

    const figmaFileKey = figma.fileKey ? figma.fileKey : "";
    const encodedFrameId = encodeURIComponent(frame.id);
    const figmaFileUrl = figmaFileKey ? `https://www.figma.com/file/${figmaFileKey}` : "";
    const figmaFrameUrl = figmaFileKey ? `${figmaFileUrl}?node-id=${encodedFrameId}` : "";

    figma.ui.postMessage({
      type: "frame-created",
      success: true,
      jobId: message.job.jobId,
      figmaFrameId: frame.id,
      figmaFileKey,
      figmaFileUrl,
      figmaFrameUrl
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unable to create the Figma draft frame.";
    figma.ui.postMessage({
      type: "frame-create-error",
      success: false,
      jobId: message.job.jobId,
      reason
    });
  }
};

function createDraftFrame(job: DesignJob): FrameNode {
  const issueKey = textOrFallback(job.issueKey, "No issue key");
  const briefTitle = textOrFallback(job.briefTitle, "Untitled design job");
  const targetUser = textOrFallback(job.targetUser, "Not specified");

  const frame = figma.createFrame();
  frame.name = `AI Draft - ${issueKey} - ${briefTitle}`;
  frame.resize(1440, 1024);
  frame.fills = [{ type: "SOLID", color: hexToRgb("F3F4F6") }];
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.paddingTop = 64;
  frame.paddingRight = 64;
  frame.paddingBottom = 64;
  frame.paddingLeft = 64;
  frame.itemSpacing = 24;

  const title = createText(briefTitle, 44, boldFont, "111827");
  title.layoutAlign = "STRETCH";
  frame.appendChild(title);

  const subtitle = createText(`Issue: ${issueKey} | Target user: ${targetUser}`, 20, regularFont, "4B5563");
  subtitle.layoutAlign = "STRETCH";
  frame.appendChild(subtitle);

  const cardRow = figma.createFrame();
  cardRow.name = "Draft content";
  cardRow.layoutMode = "VERTICAL";
  cardRow.primaryAxisSizingMode = "AUTO";
  cardRow.counterAxisSizingMode = "FIXED";
  cardRow.layoutAlign = "STRETCH";
  cardRow.fills = [];
  cardRow.itemSpacing = 16;
  frame.appendChild(cardRow);

  cardRow.appendChild(createSectionCard("Objective", job.objective));
  cardRow.appendChild(createSectionCard("Required Sections", job.requiredSections));
  cardRow.appendChild(createSectionCard("Required States", job.requiredStates));
  cardRow.appendChild(createSectionCard("UX Notes", job.uxNotes));
  cardRow.appendChild(createSectionCard("Acceptance Criteria", job.acceptanceCriteria));
  cardRow.appendChild(createNoteCard("This is an AI-generated draft scaffold. A designer should review and refine it."));

  if (job.requiredSections || job.objective) {
    frame.appendChild(createPrimaryButton("Review draft scaffold"));
  }

  figma.currentPage.appendChild(frame);
  frame.x = figma.viewport.center.x - 720;
  frame.y = figma.viewport.center.y - 512;

  return frame;
}

function createSectionCard(title: string, body?: string): FrameNode {
  const card = figma.createFrame();
  card.name = title;
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.layoutAlign = "STRETCH";
  card.paddingTop = 24;
  card.paddingRight = 24;
  card.paddingBottom = 24;
  card.paddingLeft = 24;
  card.itemSpacing = 10;
  card.cornerRadius = 16;
  card.fills = [{ type: "SOLID", color: hexToRgb("FFFFFF") }];
  card.strokes = [{ type: "SOLID", color: hexToRgb("E5E7EB") }];
  card.strokeWeight = 1;

  const heading = createText(title, 18, boldFont, "111827");
  heading.layoutAlign = "STRETCH";
  card.appendChild(heading);

  const content = createText(textOrFallback(body, "Not provided."), 18, regularFont, "374151");
  content.layoutAlign = "STRETCH";
  content.lineHeight = { value: 28, unit: "PIXELS" };
  card.appendChild(content);

  return card;
}

function createNoteCard(body: string): FrameNode {
  const card = createSectionCard("Draft note", body);
  card.fills = [{ type: "SOLID", color: hexToRgb("ECFDF5") }];
  card.strokes = [{ type: "SOLID", color: hexToRgb("A7F3D0") }];
  return card;
}

function createPrimaryButton(label: string): FrameNode {
  const button = figma.createFrame();
  button.name = "Primary action";
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "AUTO";
  button.counterAxisSizingMode = "AUTO";
  button.paddingTop = 16;
  button.paddingRight = 24;
  button.paddingBottom = 16;
  button.paddingLeft = 24;
  button.cornerRadius = 12;
  button.fills = [{ type: "SOLID", color: hexToRgb("2563EB") }];

  const buttonText = createText(label, 18, boldFont, "FFFFFF");
  button.appendChild(buttonText);

  return button;
}

function createText(characters: string, fontSize: number, fontName: FontName, colorHex: string): TextNode {
  const textNode = figma.createText();
  textNode.fontName = fontName;
  textNode.fontSize = fontSize;
  textNode.characters = characters;
  textNode.fills = [{ type: "SOLID", color: hexToRgb(colorHex) }];
  return textNode;
}

function textOrFallback(value: string | undefined, fallback: string): string {
  const trimmed = value ? value.trim() : "";
  return trimmed ? trimmed : fallback;
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}
