"use strict";
const designSystemKeywords = [
    "design system",
    "design foundation",
    "style guide",
    "color rules",
    "typography rules",
    "spacing rules",
    "component rules",
    "figma naming",
    "ai usage rules"
];
const designSystemPlaceholder = "Define this section based on the generated brief and product design foundation.";
const regularFont = { family: "Inter", style: "Regular" };
const boldFont = { family: "Inter", style: "Bold" };
figma.showUI(__html__, { width: 420, height: 640, themeColors: true });
figma.ui.onmessage = async (message) => {
    if (message.type === "fetch-request") {
        await handleFetchRequest(message);
        return;
    }
    if (message.type !== "create-draft") {
        return;
    }
    try {
        await figma.loadFontAsync(regularFont);
        await figma.loadFontAsync(boldFont);
        const frame = isDesignSystemJob(message.job)
            ? createDesignSystemDraft(message.job)
            : createDraftFrame(message.job);
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
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : "Unable to create the Figma draft frame.";
        figma.ui.postMessage({
            type: "frame-create-error",
            success: false,
            jobId: message.job.jobId,
            reason
        });
    }
};
async function handleFetchRequest(message) {
    try {
        const headers = {
            "ngrok-skip-browser-warning": "1"
        };
        const messageHeaders = message.headers ? message.headers : {};
        for (const key in messageHeaders) {
            headers[key] = messageHeaders[key];
        }
        const init = {
            method: message.method ? message.method : "GET",
            headers
        };
        if (message.body !== undefined) {
            init.body = message.body;
        }
        const response = await fetch(message.url, init);
        const text = await response.text();
        figma.ui.postMessage({
            type: "fetch-response",
            requestId: message.requestId,
            ok: response.ok,
            status: response.status,
            text
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: "fetch-response",
            requestId: message.requestId,
            error: getErrorMessage(error)
        });
    }
}
function createDraftFrame(job) {
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
    cardRow.appendChild(createTextSectionCard("Objective", job.objective));
    cardRow.appendChild(createTextSectionCard("Required Sections", job.requiredSections));
    cardRow.appendChild(createTextSectionCard("Required States", job.requiredStates));
    cardRow.appendChild(createTextSectionCard("UX Notes", job.uxNotes));
    cardRow.appendChild(createTextSectionCard("Acceptance Criteria", job.acceptanceCriteria));
    cardRow.appendChild(createNoteCard("This is an AI-generated draft scaffold. A designer should review and refine it."));
    if (job.requiredSections || job.objective) {
        frame.appendChild(createPrimaryButton("Review draft scaffold"));
    }
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createDesignSystemDraft(job) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const briefTitle = textOrFallback(job.briefTitle, "Untitled design system job");
    const targetUser = textOrFallback(job.targetUser, "Not specified");
    const objective = truncateText(textOrFallback(job.objective, designSystemPlaceholder), 160);
    const frame = figma.createFrame();
    frame.name = `AI Design System - ${issueKey} - ${briefTitle}`;
    frame.resize(1440, 1800);
    frame.clipsContent = false;
    frame.fills = [{ type: "SOLID", color: hexToRgb("F3F4F6") }];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "FIXED";
    frame.paddingTop = 64;
    frame.paddingRight = 64;
    frame.paddingBottom = 64;
    frame.paddingLeft = 64;
    frame.itemSpacing = 32;
    frame.appendChild(createDesignSystemHeader(briefTitle, issueKey, targetUser, objective));
    frame.appendChild(createColorSystemSection());
    frame.appendChild(createTypographySection());
    frame.appendChild(createSpacingSection());
    frame.appendChild(createRadiusShadowSection());
    frame.appendChild(createComponentFoundationSection());
    frame.appendChild(createStateRulesSection());
    frame.appendChild(createNamingConventionSection());
    frame.appendChild(createAiUsageRulesSection());
    frame.appendChild(createNoteCard("This is an AI-generated design system scaffold. It defines the initial structure for future refinement, not final production UI."));
    ensureMinimumFrameHeight(frame, 1800);
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createDesignSystemHeader(title, issueKey, targetUser, objective) {
    const header = figma.createFrame();
    header.name = "Header";
    header.layoutMode = "VERTICAL";
    header.primaryAxisSizingMode = "AUTO";
    header.counterAxisSizingMode = "FIXED";
    header.layoutAlign = "STRETCH";
    header.paddingTop = 32;
    header.paddingRight = 32;
    header.paddingBottom = 32;
    header.paddingLeft = 32;
    header.itemSpacing = 18;
    header.cornerRadius = 20;
    header.fills = [{ type: "SOLID", color: hexToRgb("FFFFFF") }];
    header.strokes = [{ type: "SOLID", color: hexToRgb("E5E7EB") }];
    header.strokeWeight = 1;
    const badge = createModeBadge("Design System Foundation");
    header.appendChild(badge);
    const titleText = createText(title, 40, boldFont, "111827");
    titleText.layoutAlign = "STRETCH";
    header.appendChild(titleText);
    const meta = createText(`Issue: ${issueKey} | Target user: ${targetUser}`, 16, regularFont, "6B7280");
    meta.layoutAlign = "STRETCH";
    header.appendChild(meta);
    const summary = createText(objective, 18, regularFont, "374151");
    summary.layoutAlign = "STRETCH";
    summary.lineHeight = { value: 28, unit: "PIXELS" };
    header.appendChild(summary);
    return header;
}
function createColorSystemSection() {
    const swatches = [
        createSwatch("Brand / Primary", "111827"),
        createSwatch("Neutral / 900", "111827"),
        createSwatch("Neutral / 700", "374151"),
        createSwatch("Neutral / 500", "6B7280"),
        createSwatch("Neutral / 200", "E5E7EB"),
        createSwatch("Neutral / 50", "F9FAFB"),
        createSwatch("Accent / AI", "635BFF"),
        createSwatch("Success", "16A34A"),
        createSwatch("Warning", "F59E0B"),
        createSwatch("Error", "DC2626"),
        createSwatch("Info", "2563EB")
    ];
    return createSectionCard("Color System", [
        createHorizontalGroup(swatches.slice(0, 6), 12),
        createHorizontalGroup(swatches.slice(6), 12)
    ]);
}
function createTypographySection() {
    return createSectionCard("Typography Scale", [
        createTypographyRow("Display", 40, "Bold"),
        createTypographyRow("H1", 32, "Bold"),
        createTypographyRow("H2", 24, "Semibold"),
        createTypographyRow("Body", 16, "Regular"),
        createTypographyRow("Label", 14, "Medium"),
        createTypographyRow("Caption", 12, "Regular")
    ]);
}
function createSpacingSection() {
    return createSectionCard("Spacing Scale", [
        createSpacingRow(4),
        createSpacingRow(8),
        createSpacingRow(12),
        createSpacingRow(16),
        createSpacingRow(24),
        createSpacingRow(32),
        createSpacingRow(48),
        createSpacingRow(64)
    ]);
}
function createRadiusShadowSection() {
    return createSectionCard("Radius & Shadow", [
        createHorizontalGroup([
            createRadiusExample("Small", 6),
            createRadiusExample("Medium", 12),
            createRadiusExample("Large", 20)
        ], 16),
        createHorizontalGroup([
            createShadowExample("None", "none"),
            createShadowExample("Card subtle", "card"),
            createShadowExample("Overlay subtle", "overlay")
        ], 16)
    ]);
}
function createComponentFoundationSection() {
    return createSectionCard("Component Foundation", [
        createHorizontalGroup([
            createComponentPlaceholder("Primary Button"),
            createComponentPlaceholder("Secondary Button"),
            createComponentPlaceholder("Text Input")
        ], 16),
        createHorizontalGroup([
            createComponentPlaceholder("Select Field"),
            createComponentPlaceholder("Dashboard Card"),
            createComponentPlaceholder("Empty State Card"),
            createComponentPlaceholder("Status Message")
        ], 16)
    ]);
}
function createStateRulesSection() {
    return createSectionCard("State Rules", [
        createHorizontalGroup([
            createStateCard("Default"),
            createStateCard("Hover"),
            createStateCard("Focus"),
            createStateCard("Disabled")
        ], 12),
        createHorizontalGroup([
            createStateCard("Loading"),
            createStateCard("Error"),
            createStateCard("Success"),
            createStateCard("Empty")
        ], 12)
    ]);
}
function createNamingConventionSection() {
    return createSectionCard("Figma Naming Convention", [
        createHorizontalGroup([
            createCodePill("Color/Brand/Primary"),
            createCodePill("Color/Neutral/900"),
            createCodePill("Text/Heading/H1")
        ], 10),
        createHorizontalGroup([
            createCodePill("Component/Button/Primary"),
            createCodePill("Component/Input/Text/Default"),
            createCodePill("Effect/Shadow/Card")
        ], 10)
    ]);
}
function createAiUsageRulesSection() {
    const bullets = [
        "Use this system as source of truth.",
        "Prefer existing styles/components.",
        "Do not invent a new visual identity.",
        "Keep screens clear for non-technical business owners.",
        "Use simple SaaS patterns unless task says otherwise."
    ];
    const rows = bullets.map((bullet) => createBulletRow(bullet));
    return createSectionCard("AI Usage Rules", rows);
}
function createSectionCard(title, children) {
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
    for (const child of children) {
        card.appendChild(child);
    }
    return card;
}
function createTextSectionCard(title, body) {
    const content = createText(truncateText(textOrFallback(body, "Not provided."), 220), 18, regularFont, "374151");
    content.layoutAlign = "STRETCH";
    content.lineHeight = { value: 28, unit: "PIXELS" };
    return createSectionCard(title, [content]);
}
function createNoteCard(body) {
    const card = createTextSectionCard("Draft Note", body);
    card.fills = [{ type: "SOLID", color: hexToRgb("ECFDF5") }];
    card.strokes = [{ type: "SOLID", color: hexToRgb("A7F3D0") }];
    return card;
}
function createModeBadge(label) {
    const badge = figma.createFrame();
    badge.name = label;
    badge.layoutMode = "HORIZONTAL";
    badge.primaryAxisSizingMode = "AUTO";
    badge.counterAxisSizingMode = "AUTO";
    badge.paddingTop = 10;
    badge.paddingRight = 16;
    badge.paddingBottom = 10;
    badge.paddingLeft = 16;
    badge.cornerRadius = 999;
    badge.fills = [{ type: "SOLID", color: hexToRgb("DBEAFE") }];
    badge.strokes = [{ type: "SOLID", color: hexToRgb("93C5FD") }];
    badge.strokeWeight = 1;
    const text = createText(label, 16, boldFont, "1D4ED8");
    badge.appendChild(text);
    return badge;
}
function ensureMinimumFrameHeight(frame, minimumHeight) {
    if (frame.height >= minimumHeight) {
        return;
    }
    const spacer = figma.createFrame();
    spacer.name = "Minimum height spacer";
    spacer.resize(1, minimumHeight - frame.height);
    spacer.layoutAlign = "STRETCH";
    spacer.fills = [];
    frame.appendChild(spacer);
}
function createSwatch(name, hex) {
    const swatch = figma.createFrame();
    swatch.name = name;
    swatch.layoutMode = "VERTICAL";
    swatch.primaryAxisSizingMode = "AUTO";
    swatch.counterAxisSizingMode = "FIXED";
    swatch.resize(186, 122);
    swatch.paddingTop = 10;
    swatch.paddingRight = 10;
    swatch.paddingBottom = 10;
    swatch.paddingLeft = 10;
    swatch.itemSpacing = 8;
    swatch.cornerRadius = 12;
    swatch.fills = [{ type: "SOLID", color: hexToRgb("F9FAFB") }];
    swatch.strokes = [{ type: "SOLID", color: hexToRgb("E5E7EB") }];
    swatch.strokeWeight = 1;
    const colorBlock = figma.createFrame();
    colorBlock.name = `${name} color`;
    colorBlock.resize(166, 50);
    colorBlock.cornerRadius = 8;
    colorBlock.fills = [{ type: "SOLID", color: hexToRgb(hex) }];
    colorBlock.strokes = [{ type: "SOLID", color: hexToRgb("D1D5DB") }];
    colorBlock.strokeWeight = 1;
    swatch.appendChild(colorBlock);
    const label = createText(name, 12, boldFont, "111827");
    label.layoutAlign = "STRETCH";
    swatch.appendChild(label);
    const value = createText(`#${hex}`, 12, regularFont, "6B7280");
    value.layoutAlign = "STRETCH";
    swatch.appendChild(value);
    return swatch;
}
function createTypographyRow(name, size, weight) {
    const row = createRow("Typography row", 16);
    const label = createText(`${name} / ${size} / ${weight}`, 14, regularFont, "6B7280");
    label.resize(260, label.height);
    row.appendChild(label);
    const sampleFont = weight === "Regular" ? regularFont : boldFont;
    const sample = createText("Aa Product screen foundation", size, sampleFont, "111827");
    sample.layoutGrow = 1;
    row.appendChild(sample);
    return row;
}
function createSpacingRow(value) {
    const row = createRow(`Spacing ${value}`, 16);
    const label = createText(`${value}px`, 14, boldFont, "111827");
    label.resize(64, label.height);
    row.appendChild(label);
    const bar = figma.createFrame();
    bar.name = `${value}px spacing bar`;
    bar.resize(Math.max(value * 6, 24), 18);
    bar.cornerRadius = 4;
    bar.fills = [{ type: "SOLID", color: hexToRgb("635BFF") }];
    row.appendChild(bar);
    return row;
}
function createCodePill(text) {
    const pill = figma.createFrame();
    pill.name = text;
    pill.layoutMode = "HORIZONTAL";
    pill.primaryAxisSizingMode = "AUTO";
    pill.counterAxisSizingMode = "AUTO";
    pill.paddingTop = 8;
    pill.paddingRight = 12;
    pill.paddingBottom = 8;
    pill.paddingLeft = 12;
    pill.cornerRadius = 999;
    pill.fills = [{ type: "SOLID", color: hexToRgb("F3F4F6") }];
    pill.strokes = [{ type: "SOLID", color: hexToRgb("D1D5DB") }];
    pill.strokeWeight = 1;
    pill.appendChild(createText(text, 12, regularFont, "374151"));
    return pill;
}
function createRadiusExample(name, radius) {
    const example = createVisualTile(`${name} ${radius}`, 180, 96);
    const shape = figma.createFrame();
    shape.name = `${name} radius`;
    shape.resize(76, 40);
    shape.cornerRadius = radius;
    shape.fills = [{ type: "SOLID", color: hexToRgb("DBEAFE") }];
    shape.strokes = [{ type: "SOLID", color: hexToRgb("2563EB") }];
    shape.strokeWeight = 1;
    example.appendChild(shape);
    example.appendChild(createText(`${name} ${radius}`, 13, boldFont, "111827"));
    return example;
}
function createShadowExample(name, variant) {
    const example = createVisualTile(name, 220, 96);
    if (variant === "card") {
        example.effects = [{
                type: "DROP_SHADOW",
                color: { r: 0.067, g: 0.094, b: 0.153, a: 0.12 },
                offset: { x: 0, y: 8 },
                radius: 20,
                spread: -8,
                visible: true,
                blendMode: "NORMAL"
            }];
    }
    if (variant === "overlay") {
        example.effects = [{
                type: "DROP_SHADOW",
                color: { r: 0.067, g: 0.094, b: 0.153, a: 0.18 },
                offset: { x: 0, y: 16 },
                radius: 32,
                spread: -10,
                visible: true,
                blendMode: "NORMAL"
            }];
    }
    example.appendChild(createText(name, 13, boldFont, "111827"));
    return example;
}
function createComponentPlaceholder(name) {
    const tile = createVisualTile(name, 286, 104);
    tile.itemSpacing = 10;
    tile.appendChild(createText(name, 14, boldFont, "111827"));
    const preview = figma.createFrame();
    preview.name = `${name} preview`;
    preview.resize(220, 32);
    preview.cornerRadius = name.indexOf("Button") >= 0 ? 8 : 10;
    preview.fills = [{ type: "SOLID", color: name.indexOf("Primary") >= 0 ? hexToRgb("111827") : hexToRgb("F9FAFB") }];
    preview.strokes = [{ type: "SOLID", color: hexToRgb("D1D5DB") }];
    preview.strokeWeight = 1;
    tile.appendChild(preview);
    return tile;
}
function createStateCard(name) {
    const card = createVisualTile(name, 150, 74);
    const marker = figma.createEllipse();
    marker.name = `${name} marker`;
    marker.resize(14, 14);
    marker.fills = [{ type: "SOLID", color: stateColor(name) }];
    card.appendChild(marker);
    card.appendChild(createText(name, 13, boldFont, "111827"));
    return card;
}
function createBulletRow(text) {
    const row = createRow("AI usage bullet", 10);
    const marker = figma.createEllipse();
    marker.resize(6, 6);
    marker.fills = [{ type: "SOLID", color: hexToRgb("635BFF") }];
    row.appendChild(marker);
    const label = createText(text, 15, regularFont, "374151");
    label.layoutGrow = 1;
    row.appendChild(label);
    return row;
}
function createVisualTile(name, width, height) {
    const tile = figma.createFrame();
    tile.name = name;
    tile.layoutMode = "VERTICAL";
    tile.primaryAxisSizingMode = "AUTO";
    tile.counterAxisSizingMode = "FIXED";
    tile.resize(width, height);
    tile.paddingTop = 16;
    tile.paddingRight = 16;
    tile.paddingBottom = 16;
    tile.paddingLeft = 16;
    tile.itemSpacing = 8;
    tile.cornerRadius = 12;
    tile.fills = [{ type: "SOLID", color: hexToRgb("FFFFFF") }];
    tile.strokes = [{ type: "SOLID", color: hexToRgb("E5E7EB") }];
    tile.strokeWeight = 1;
    return tile;
}
function createHorizontalGroup(children, spacing) {
    const group = createRow("Group", spacing);
    group.layoutAlign = "STRETCH";
    for (const child of children) {
        group.appendChild(child);
    }
    return group;
}
function createRow(name, spacing) {
    const row = figma.createFrame();
    row.name = name;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.layoutAlign = "STRETCH";
    row.fills = [];
    row.itemSpacing = spacing;
    row.counterAxisAlignItems = "CENTER";
    return row;
}
function createPrimaryButton(label) {
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
function createText(characters, fontSize, fontName, colorHex) {
    const textNode = figma.createText();
    textNode.fontName = fontName;
    textNode.fontSize = fontSize;
    textNode.characters = characters;
    textNode.fills = [{ type: "SOLID", color: hexToRgb(colorHex) }];
    return textNode;
}
function textOrFallback(value, fallback) {
    const trimmed = value ? value.trim() : "";
    return trimmed ? trimmed : fallback;
}
function truncateText(text, maxLength) {
    const value = textOrFallback(text, "");
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}
function findNextFramePosition() {
    let rightmost = 0;
    let foundFrame = false;
    for (const node of figma.currentPage.children) {
        if (node.type !== "FRAME") {
            continue;
        }
        foundFrame = true;
        rightmost = Math.max(rightmost, node.x + node.width);
    }
    if (!foundFrame) {
        return { x: 0, y: 0 };
    }
    return { x: rightmost + 200, y: 0 };
}
function isDesignSystemJob(job) {
    const searchableText = [
        job.briefTitle,
        job.objective,
        job.figmaInstruction,
        job.requiredSections,
        job.acceptanceCriteria
    ].join(" ").toLowerCase();
    for (const keyword of designSystemKeywords) {
        if (searchableText.indexOf(keyword) >= 0) {
            return true;
        }
    }
    return false;
}
function collectJobContent(job, keywords) {
    const fields = [
        { label: "Objective", value: job.objective },
        { label: "Figma instruction", value: job.figmaInstruction },
        { label: "Required sections", value: job.requiredSections },
        { label: "Required states", value: job.requiredStates },
        { label: "UX notes", value: job.uxNotes },
        { label: "Design constraints", value: job.designConstraints },
        { label: "Acceptance criteria", value: job.acceptanceCriteria }
    ];
    const matches = [];
    for (const field of fields) {
        const value = field.value ? field.value.trim() : "";
        const lowerValue = value.toLowerCase();
        if (!value) {
            continue;
        }
        for (const keyword of keywords) {
            if (lowerValue.indexOf(keyword) >= 0) {
                matches.push(`${field.label}: ${value}`);
                break;
            }
        }
    }
    return matches.length ? matches.join("\n") : designSystemPlaceholder;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === "object") {
        return JSON.stringify(error);
    }
    return String(error);
}
function stateColor(name) {
    const normalized = name.toLowerCase();
    if (normalized === "error") {
        return hexToRgb("DC2626");
    }
    if (normalized === "success") {
        return hexToRgb("16A34A");
    }
    if (normalized === "disabled") {
        return hexToRgb("9CA3AF");
    }
    if (normalized === "loading") {
        return hexToRgb("635BFF");
    }
    if (normalized === "focus") {
        return hexToRgb("2563EB");
    }
    if (normalized === "empty") {
        return hexToRgb("F59E0B");
    }
    return hexToRgb("111827");
}
function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const value = parseInt(normalized, 16);
    return {
        r: ((value >> 16) & 255) / 255,
        g: ((value >> 8) & 255) / 255,
        b: (value & 255) / 255
    };
}
