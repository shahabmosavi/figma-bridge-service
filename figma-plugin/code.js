"use strict";
const fallbackTokens = {
    colors: {
        brand: { primary: "#111827" },
        neutral: {
            "900": "#111827",
            "700": "#374151",
            "500": "#6B7280",
            "200": "#E5E7EB",
            "50": "#F9FAFB"
        },
        accent: { ai: "#635BFF" },
        semantic: {
            success: "#16A34A",
            warning: "#F59E0B",
            error: "#DC2626",
            info: "#2563EB"
        }
    },
    typography: {
        display: { fontSize: "40px", fontWeight: "bold" },
        h1: { fontSize: "32px", fontWeight: "bold" },
        h2: { fontSize: "24px", fontWeight: "semibold" },
        body: { fontSize: "16px", fontWeight: "regular" },
        label: { fontSize: "14px", fontWeight: "medium" },
        caption: { fontSize: "12px", fontWeight: "regular" }
    },
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radius: { sm: 6, md: 12, lg: 20 },
    shadows: {
        none: "none",
        cardSubtle: {
            type: "dropShadow",
            x: 0,
            y: 8,
            blur: 20,
            spread: -8,
            color: "rgba(17, 24, 39, 0.12)"
        },
        overlaySubtle: {
            type: "dropShadow",
            x: 0,
            y: 16,
            blur: 32,
            spread: -10,
            color: "rgba(17, 24, 39, 0.18)"
        }
    },
    components: {
        button: { primary: { name: "button.primary" }, secondary: { name: "button.secondary" } },
        input: { text: { name: "input.text" } },
        card: { dashboard: { name: "card.dashboard" }, emptyState: { name: "card.emptyState" } },
        status: { message: { name: "status.message" } }
    },
    states: ["default", "hover", "focus", "disabled", "loading", "error", "success", "empty"],
    figmaNaming: [
        "Color/Brand/Primary",
        "Color/Neutral/900",
        "Text/Heading/H1",
        "Component/Button/Primary",
        "Component/Input/Text/Default",
        "Effect/Shadow/Card"
    ],
    aiUsageRules: [
        "Use this token registry as the design source of truth.",
        "Prefer existing tokens before creating new values.",
        "Do not invent a new visual identity.",
        "Keep screens clear for non-technical Instagram business owners.",
        "Use simple SaaS layout patterns unless the Jira issue explicitly requires otherwise."
    ]
};
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
        const tokens = normalizeTokens(message.tokens);
        const frame = isDesignSystemJob(message.job)
            ? createDesignSystemDraft(message.job, tokens)
            : createDraftFrame(message.job, tokens);
        figma.currentPage.selection = [frame];
        figma.viewport.scrollAndZoomIntoView([frame]);
        const figmaFileKey = figma.fileKey || null;
        const encodedFrameId = encodeURIComponent(frame.id);
        const figmaFileUrl = figmaFileKey ? `https://www.figma.com/file/${figmaFileKey}` : null;
        const figmaFrameUrl = figmaFileKey ? `https://www.figma.com/file/${figmaFileKey}?node-id=${encodedFrameId}` : null;
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
function createDraftFrame(job, tokens) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const briefTitle = textOrFallback(job.briefTitle, "Untitled design job");
    const targetUser = textOrFallback(job.targetUser, "Not specified");
    const frame = figma.createFrame();
    frame.name = `AI Draft - ${issueKey} - ${briefTitle}`;
    frame.resize(1440, 1024);
    frame.fills = [solid(tokens.colors.neutral["50"])];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    setPadding(frame, spacing(tokens, 7));
    frame.itemSpacing = spacing(tokens, 4);
    const title = createTokenText(briefTitle, tokens, "display", "bold", tokens.colors.neutral["900"]);
    title.layoutAlign = "STRETCH";
    frame.appendChild(title);
    const subtitle = createTokenText(`Issue: ${issueKey} | Target user: ${targetUser}`, tokens, "body", "regular", tokens.colors.neutral["700"]);
    subtitle.layoutAlign = "STRETCH";
    frame.appendChild(subtitle);
    const cardRow = figma.createFrame();
    cardRow.name = "Draft content";
    cardRow.layoutMode = "VERTICAL";
    cardRow.primaryAxisSizingMode = "AUTO";
    cardRow.counterAxisSizingMode = "FIXED";
    cardRow.layoutAlign = "STRETCH";
    cardRow.fills = [];
    cardRow.itemSpacing = spacing(tokens, 3);
    frame.appendChild(cardRow);
    cardRow.appendChild(createTextSectionCard("Objective", job.objective, tokens));
    cardRow.appendChild(createTextSectionCard("Required Sections", job.requiredSections, tokens));
    cardRow.appendChild(createTextSectionCard("Required States", job.requiredStates, tokens));
    cardRow.appendChild(createTextSectionCard("UX Notes", job.uxNotes, tokens));
    cardRow.appendChild(createTextSectionCard("Acceptance Criteria", job.acceptanceCriteria, tokens));
    cardRow.appendChild(createNoteCard("This is an AI-generated draft scaffold. A designer should review and refine it.", tokens));
    if (job.requiredSections || job.objective) {
        frame.appendChild(createPrimaryButton("Review draft scaffold", tokens));
    }
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createDesignSystemDraft(job, tokens) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const briefTitle = textOrFallback(job.briefTitle, "Untitled design system job");
    const targetUser = textOrFallback(job.targetUser, "Not specified");
    const objective = truncateText(textOrFallback(job.objective, designSystemPlaceholder), 160);
    const frame = figma.createFrame();
    frame.name = `AI Design System - ${issueKey} - ${briefTitle}`;
    frame.resize(1440, 1800);
    frame.clipsContent = false;
    frame.fills = [solid(tokens.colors.neutral["50"])];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "FIXED";
    setPadding(frame, spacing(tokens, 7));
    frame.itemSpacing = spacing(tokens, 5);
    frame.appendChild(createDesignSystemHeader(briefTitle, issueKey, targetUser, objective, tokens));
    frame.appendChild(createColorSystemSection(tokens));
    frame.appendChild(createTypographySection(tokens));
    frame.appendChild(createSpacingSection(tokens));
    frame.appendChild(createRadiusShadowSection(tokens));
    frame.appendChild(createComponentFoundationSection(tokens));
    frame.appendChild(createStateRulesSection(tokens));
    frame.appendChild(createNamingConventionSection(tokens));
    frame.appendChild(createAiUsageRulesSection(tokens));
    frame.appendChild(createNoteCard("This is an AI-generated design system scaffold. It defines the initial structure for future refinement, not final production UI.", tokens));
    ensureMinimumFrameHeight(frame, 1800);
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createDesignSystemHeader(title, issueKey, targetUser, objective, tokens) {
    const header = figma.createFrame();
    header.name = "Header";
    header.layoutMode = "VERTICAL";
    header.primaryAxisSizingMode = "AUTO";
    header.counterAxisSizingMode = "FIXED";
    header.layoutAlign = "STRETCH";
    setPadding(frameLike(header), spacing(tokens, 5));
    header.itemSpacing = spacing(tokens, 3);
    header.cornerRadius = tokens.radius.lg;
    header.fills = [solid("#FFFFFF")];
    header.strokes = [solid(tokens.colors.neutral["200"])];
    header.strokeWeight = 1;
    applyShadow(header, tokens, "cardSubtle");
    const badge = createModeBadge("Design System Foundation", tokens);
    header.appendChild(badge);
    const titleText = createTokenText(title, tokens, "display", "bold", tokens.colors.neutral["900"]);
    titleText.layoutAlign = "STRETCH";
    header.appendChild(titleText);
    const meta = createTokenText(`Issue: ${issueKey} | Target user: ${targetUser}`, tokens, "body", "regular", tokens.colors.neutral["500"]);
    meta.layoutAlign = "STRETCH";
    header.appendChild(meta);
    const summary = createTokenText(objective, tokens, "body", "regular", tokens.colors.neutral["700"]);
    summary.layoutAlign = "STRETCH";
    summary.lineHeight = { value: 28, unit: "PIXELS" };
    header.appendChild(summary);
    return header;
}
function createColorSystemSection(tokens) {
    const swatches = colorSwatchTokens(tokens).map((item) => createSwatch(item.name, item.hex, tokens));
    return createSectionCard("Color System", [
        createHorizontalGroup(swatches.slice(0, 6), spacing(tokens, 2)),
        createHorizontalGroup(swatches.slice(6), spacing(tokens, 2))
    ], tokens);
}
function createTypographySection(tokens) {
    const rows = [];
    const order = ["display", "h1", "h2", "body", "label", "caption"];
    for (const key of order) {
        const token = textStyle(tokens, key);
        rows.push(createTypographyRow(labelForTypography(key), token.fontSize, token.fontWeight, tokens));
    }
    return createSectionCard("Typography Scale", rows, tokens);
}
function createSpacingSection(tokens) {
    const rows = tokens.spacing.map((value) => createSpacingRow(value, tokens));
    return createSectionCard("Spacing Scale", rows, tokens);
}
function createRadiusShadowSection(tokens) {
    return createSectionCard("Radius & Shadow", [
        createHorizontalGroup([
            createRadiusExample("Small", tokens.radius.sm, tokens),
            createRadiusExample("Medium", tokens.radius.md, tokens),
            createRadiusExample("Large", tokens.radius.lg, tokens)
        ], spacing(tokens, 3)),
        createHorizontalGroup([
            createShadowExample("None", "none", tokens),
            createShadowExample("Card subtle", "cardSubtle", tokens),
            createShadowExample("Overlay subtle", "overlaySubtle", tokens)
        ], spacing(tokens, 3))
    ], tokens);
}
function createComponentFoundationSection(tokens) {
    return createSectionCard("Component Foundation", [
        createHorizontalGroup([
            createComponentPlaceholder("Primary Button", tokens),
            createComponentPlaceholder("Secondary Button", tokens),
            createComponentPlaceholder("Text Input", tokens)
        ], spacing(tokens, 3)),
        createHorizontalGroup([
            createComponentPlaceholder("Select Field", tokens),
            createComponentPlaceholder("Dashboard Card", tokens),
            createComponentPlaceholder("Empty State Card", tokens),
            createComponentPlaceholder("Status Message", tokens)
        ], spacing(tokens, 3))
    ], tokens);
}
function createStateRulesSection(tokens) {
    const states = tokens.states.length ? tokens.states : fallbackTokens.states;
    const cards = states.map((state) => createStateCard(capitalize(state), tokens));
    return createSectionCard("State Rules", [
        createHorizontalGroup(cards.slice(0, 4), spacing(tokens, 2)),
        createHorizontalGroup(cards.slice(4, 8), spacing(tokens, 2))
    ], tokens);
}
function createNamingConventionSection(tokens) {
    const names = tokens.figmaNaming.length ? tokens.figmaNaming : fallbackTokens.figmaNaming;
    const pills = names.map((name) => createCodePill(name, tokens));
    return createSectionCard("Figma Naming Convention", [
        createHorizontalGroup(pills.slice(0, 3), spacing(tokens, 2)),
        createHorizontalGroup(pills.slice(3), spacing(tokens, 2))
    ], tokens);
}
function createAiUsageRulesSection(tokens) {
    const rules = tokens.aiUsageRules.length ? tokens.aiUsageRules : fallbackTokens.aiUsageRules;
    const rows = rules.slice(0, 5).map((bullet) => createBulletRow(bullet, tokens));
    return createSectionCard("AI Usage Rules", rows, tokens);
}
function createSectionCard(title, children, tokens) {
    const card = figma.createFrame();
    card.name = title;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.layoutAlign = "STRETCH";
    setPadding(card, spacing(tokens, 4));
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    card.appendChild(heading);
    for (const child of children) {
        card.appendChild(child);
    }
    return card;
}
function createTextSectionCard(title, body, tokens) {
    const content = createTokenText(truncateText(textOrFallback(body, "Not provided."), 220), tokens, "body", "regular", tokens.colors.neutral["700"]);
    content.layoutAlign = "STRETCH";
    content.lineHeight = { value: 28, unit: "PIXELS" };
    return createSectionCard(title, [content], tokens);
}
function createNoteCard(body, tokens) {
    const card = createTextSectionCard("Draft Note", body, tokens);
    card.fills = [solid(tokens.colors.neutral["50"])];
    card.strokes = [solid(tokens.colors.semantic.success)];
    return card;
}
function createModeBadge(label, tokens) {
    const badge = figma.createFrame();
    badge.name = label;
    badge.layoutMode = "HORIZONTAL";
    badge.primaryAxisSizingMode = "AUTO";
    badge.counterAxisSizingMode = "AUTO";
    badge.paddingTop = spacing(tokens, 1);
    badge.paddingRight = spacing(tokens, 3);
    badge.paddingBottom = spacing(tokens, 1);
    badge.paddingLeft = spacing(tokens, 3);
    badge.cornerRadius = 999;
    badge.fills = [solid(tokens.colors.neutral["50"])];
    badge.strokes = [solid(tokens.colors.semantic.info)];
    badge.strokeWeight = 1;
    const text = createTokenText(label, tokens, "label", "bold", tokens.colors.semantic.info);
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
function createSwatch(name, hex, tokens) {
    const swatch = figma.createFrame();
    swatch.name = name;
    swatch.layoutMode = "VERTICAL";
    swatch.primaryAxisSizingMode = "AUTO";
    swatch.counterAxisSizingMode = "FIXED";
    swatch.resize(186, 122);
    setPadding(swatch, spacing(tokens, 2));
    swatch.itemSpacing = spacing(tokens, 1);
    swatch.cornerRadius = tokens.radius.md;
    swatch.fills = [solid(tokens.colors.neutral["50"])];
    swatch.strokes = [solid(tokens.colors.neutral["200"])];
    swatch.strokeWeight = 1;
    const colorBlock = figma.createFrame();
    colorBlock.name = `${name} color`;
    colorBlock.resize(166, 50);
    colorBlock.cornerRadius = tokens.radius.sm;
    colorBlock.fills = [solid(hex)];
    colorBlock.strokes = [solid(tokens.colors.neutral["200"])];
    colorBlock.strokeWeight = 1;
    swatch.appendChild(colorBlock);
    const label = createTokenText(name, tokens, "caption", "bold", tokens.colors.neutral["900"]);
    label.layoutAlign = "STRETCH";
    swatch.appendChild(label);
    const value = createTokenText(formatHex(hex), tokens, "caption", "regular", tokens.colors.neutral["500"]);
    value.layoutAlign = "STRETCH";
    swatch.appendChild(value);
    return swatch;
}
function createTypographyRow(name, fontSizeValue, weight, tokens) {
    const row = createRow("Typography row", spacing(tokens, 3));
    const size = parseSize(fontSizeValue, 16);
    const label = createTokenText(`${name} / ${size} / ${weight}`, tokens, "label", "regular", tokens.colors.neutral["500"]);
    label.resize(260, label.height);
    row.appendChild(label);
    const sampleFont = fontForWeight(weight);
    const sample = createText("Aa Product screen foundation", size, sampleFont, tokens.colors.neutral["900"]);
    sample.layoutGrow = 1;
    row.appendChild(sample);
    return row;
}
function createSpacingRow(value, tokens) {
    const row = createRow(`Spacing ${value}`, spacing(tokens, 3));
    const label = createTokenText(`${value}px`, tokens, "label", "bold", tokens.colors.neutral["900"]);
    label.resize(64, label.height);
    row.appendChild(label);
    const bar = figma.createFrame();
    bar.name = `${value}px spacing bar`;
    bar.resize(Math.max(value * 6, 24), 18);
    bar.cornerRadius = tokens.radius.sm;
    bar.fills = [solid(tokens.colors.accent.ai)];
    row.appendChild(bar);
    return row;
}
function createCodePill(text, tokens) {
    const pill = figma.createFrame();
    pill.name = text;
    pill.layoutMode = "HORIZONTAL";
    pill.primaryAxisSizingMode = "AUTO";
    pill.counterAxisSizingMode = "AUTO";
    pill.paddingTop = spacing(tokens, 1);
    pill.paddingRight = spacing(tokens, 2);
    pill.paddingBottom = spacing(tokens, 1);
    pill.paddingLeft = spacing(tokens, 2);
    pill.cornerRadius = 999;
    pill.fills = [solid(tokens.colors.neutral["50"])];
    pill.strokes = [solid(tokens.colors.neutral["200"])];
    pill.strokeWeight = 1;
    pill.appendChild(createTokenText(text, tokens, "caption", "regular", tokens.colors.neutral["700"]));
    return pill;
}
function createRadiusExample(name, radius, tokens) {
    const example = createVisualTile(`${name} ${radius}`, 180, 96, tokens);
    const shape = figma.createFrame();
    shape.name = `${name} radius`;
    shape.resize(76, 40);
    shape.cornerRadius = radius;
    shape.fills = [solid(tokens.colors.neutral["50"])];
    shape.strokes = [solid(tokens.colors.semantic.info)];
    shape.strokeWeight = 1;
    example.appendChild(shape);
    example.appendChild(createTokenText(`${name} ${radius}`, tokens, "caption", "bold", tokens.colors.neutral["900"]));
    return example;
}
function createShadowExample(name, tokenName, tokens) {
    const example = createVisualTile(name, 220, 96, tokens);
    applyShadow(example, tokens, tokenName);
    example.appendChild(createTokenText(name, tokens, "caption", "bold", tokens.colors.neutral["900"]));
    return example;
}
function createComponentPlaceholder(name, tokens) {
    const tile = createVisualTile(name, 286, 104, tokens);
    tile.itemSpacing = spacing(tokens, 2);
    tile.appendChild(createTokenText(name, tokens, "label", "bold", tokens.colors.neutral["900"]));
    const preview = figma.createFrame();
    preview.name = `${name} preview`;
    preview.resize(220, 32);
    preview.cornerRadius = name.indexOf("Button") >= 0 ? tokens.radius.sm : tokens.radius.md;
    preview.fills = [solid(name.indexOf("Primary") >= 0 ? tokens.colors.brand.primary : tokens.colors.neutral["50"])];
    preview.strokes = [solid(tokens.colors.neutral["200"])];
    preview.strokeWeight = 1;
    tile.appendChild(preview);
    return tile;
}
function createStateCard(name, tokens) {
    const card = createVisualTile(name, 150, 74, tokens);
    const marker = figma.createEllipse();
    marker.name = `${name} marker`;
    marker.resize(14, 14);
    marker.fills = [solid(stateColor(name, tokens))];
    card.appendChild(marker);
    card.appendChild(createTokenText(name, tokens, "caption", "bold", tokens.colors.neutral["900"]));
    return card;
}
function createBulletRow(text, tokens) {
    const row = createRow("AI usage bullet", spacing(tokens, 2));
    const marker = figma.createEllipse();
    marker.resize(6, 6);
    marker.fills = [solid(tokens.colors.accent.ai)];
    row.appendChild(marker);
    const label = createTokenText(text, tokens, "label", "regular", tokens.colors.neutral["700"]);
    label.layoutGrow = 1;
    row.appendChild(label);
    return row;
}
function createVisualTile(name, width, height, tokens) {
    const tile = figma.createFrame();
    tile.name = name;
    tile.layoutMode = "VERTICAL";
    tile.primaryAxisSizingMode = "AUTO";
    tile.counterAxisSizingMode = "FIXED";
    tile.resize(width, height);
    setPadding(tile, spacing(tokens, 3));
    tile.itemSpacing = spacing(tokens, 1);
    tile.cornerRadius = tokens.radius.md;
    tile.fills = [solid("#FFFFFF")];
    tile.strokes = [solid(tokens.colors.neutral["200"])];
    tile.strokeWeight = 1;
    return tile;
}
function createHorizontalGroup(children, itemSpacing) {
    const group = createRow("Group", itemSpacing);
    group.layoutAlign = "STRETCH";
    for (const child of children) {
        group.appendChild(child);
    }
    return group;
}
function createRow(name, itemSpacing) {
    const row = figma.createFrame();
    row.name = name;
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.layoutAlign = "STRETCH";
    row.fills = [];
    row.itemSpacing = itemSpacing;
    row.counterAxisAlignItems = "CENTER";
    return row;
}
function createPrimaryButton(label, tokens) {
    const button = figma.createFrame();
    button.name = "Primary action";
    button.layoutMode = "HORIZONTAL";
    button.primaryAxisSizingMode = "AUTO";
    button.counterAxisSizingMode = "AUTO";
    button.paddingTop = spacing(tokens, 3);
    button.paddingRight = spacing(tokens, 4);
    button.paddingBottom = spacing(tokens, 3);
    button.paddingLeft = spacing(tokens, 4);
    button.cornerRadius = tokens.radius.md;
    button.fills = [solid(tokens.colors.semantic.info)];
    const buttonText = createTokenText(label, tokens, "body", "bold", "#FFFFFF");
    button.appendChild(buttonText);
    return button;
}
function createTokenText(characters, tokens, styleName, weightFallback, colorHex) {
    const style = textStyle(tokens, styleName);
    const weight = style.fontWeight ? style.fontWeight : weightFallback;
    return createText(characters, parseSize(style.fontSize, 16), fontForWeight(weight), colorHex);
}
function createText(characters, fontSize, fontName, colorHex) {
    const textNode = figma.createText();
    textNode.fontName = fontName;
    textNode.fontSize = fontSize;
    textNode.characters = characters;
    textNode.fills = [solid(colorHex)];
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
    const titleAndObjective = [job.briefTitle, job.objective]
        .filter(Boolean).join(" ").toLowerCase();
    const allText = [
        job.briefTitle,
        job.objective,
        job.figmaInstruction,
        job.requiredSections,
        job.acceptanceCriteria
    ].filter(Boolean).join(" ").toLowerCase();
    const strongIndicators = [
        "create design system",
        "build design system",
        "define design system",
        "design system foundation",
        "design system scaffold",
        "design foundation",
        "style guide",
        "component library foundation",
        "initial figma design system rules",
        "design system rules"
    ];
    const matchedIndicators = strongIndicators.filter(function (ind) {
        return titleAndObjective.indexOf(ind) >= 0;
    });
    const dsSectionGroups = [
        ["color system"],
        ["typography scale"],
        ["spacing system"],
        ["layout & grid rules", "layout and grid rules"],
        ["radius & shadow rules", "radius and shadow rules"],
        ["component foundation"],
        ["button rules"],
        ["input/form rules", "input form rules"],
        ["card/container rules", "card container rules"],
        ["state rules"],
        ["figma naming convention"],
        ["ai usage rules"],
        ["draft note"]
    ];
    const matchedSectionCount = dsSectionGroups.filter(function (group) {
        return group.some(function (variant) { return allText.indexOf(variant) >= 0; });
    }).length;
    const negativeIndicators = [
        "not a design system",
        "is not a design system",
        "not design system",
        "no design system",
        "not for design system",
        "screen draft",
        "product screen",
        "feature screen",
        "app screen",
        "mobile screen",
        "web screen",
        "ui screen",
        "create a screen",
        "create the screen",
        "design a screen",
        "build a screen",
        "create a page",
        "design a page",
        "landing page",
        "onboarding screen",
        "onboarding flow",
        "product page",
        "feature page"
    ];
    const matchedNegatives = negativeIndicators.filter(function (ind) {
        return titleAndObjective.indexOf(ind) >= 0;
    });
    const hasPositive = matchedIndicators.length > 0 || matchedSectionCount >= 4;
    const result = hasPositive && matchedNegatives.length === 0;
    console.log("[isDesignSystemJob]", {
        briefTitle: job.briefTitle,
        objective: (job.objective || "").substring(0, 80),
        matchedIndicators: matchedIndicators,
        matchedNegatives: matchedNegatives,
        matchedSectionCount: matchedSectionCount,
        mode: result ? "design-system" : "screen"
    });
    return result;
}
function normalizeTokens(tokens) {
    if (!tokens) {
        return fallbackTokens;
    }
    return {
        colors: {
            brand: {
                primary: stringValue(tokens.colors && tokens.colors.brand ? tokens.colors.brand.primary : "", fallbackTokens.colors.brand.primary)
            },
            neutral: {
                "900": stringValue(tokens.colors && tokens.colors.neutral ? tokens.colors.neutral["900"] : "", fallbackTokens.colors.neutral["900"]),
                "700": stringValue(tokens.colors && tokens.colors.neutral ? tokens.colors.neutral["700"] : "", fallbackTokens.colors.neutral["700"]),
                "500": stringValue(tokens.colors && tokens.colors.neutral ? tokens.colors.neutral["500"] : "", fallbackTokens.colors.neutral["500"]),
                "200": stringValue(tokens.colors && tokens.colors.neutral ? tokens.colors.neutral["200"] : "", fallbackTokens.colors.neutral["200"]),
                "50": stringValue(tokens.colors && tokens.colors.neutral ? tokens.colors.neutral["50"] : "", fallbackTokens.colors.neutral["50"])
            },
            accent: {
                ai: stringValue(tokens.colors && tokens.colors.accent ? tokens.colors.accent.ai : "", fallbackTokens.colors.accent.ai)
            },
            semantic: {
                success: stringValue(tokens.colors && tokens.colors.semantic ? tokens.colors.semantic.success : "", fallbackTokens.colors.semantic.success),
                warning: stringValue(tokens.colors && tokens.colors.semantic ? tokens.colors.semantic.warning : "", fallbackTokens.colors.semantic.warning),
                error: stringValue(tokens.colors && tokens.colors.semantic ? tokens.colors.semantic.error : "", fallbackTokens.colors.semantic.error),
                info: stringValue(tokens.colors && tokens.colors.semantic ? tokens.colors.semantic.info : "", fallbackTokens.colors.semantic.info)
            }
        },
        typography: tokens.typography ? tokens.typography : fallbackTokens.typography,
        spacing: Array.isArray(tokens.spacing) && tokens.spacing.length ? tokens.spacing : fallbackTokens.spacing,
        radius: {
            sm: numberValue(tokens.radius ? tokens.radius.sm : undefined, fallbackTokens.radius.sm),
            md: numberValue(tokens.radius ? tokens.radius.md : undefined, fallbackTokens.radius.md),
            lg: numberValue(tokens.radius ? tokens.radius.lg : undefined, fallbackTokens.radius.lg)
        },
        shadows: tokens.shadows ? tokens.shadows : fallbackTokens.shadows,
        components: tokens.components ? tokens.components : fallbackTokens.components,
        states: Array.isArray(tokens.states) && tokens.states.length ? tokens.states : fallbackTokens.states,
        figmaNaming: Array.isArray(tokens.figmaNaming) && tokens.figmaNaming.length ? tokens.figmaNaming : fallbackTokens.figmaNaming,
        aiUsageRules: Array.isArray(tokens.aiUsageRules) && tokens.aiUsageRules.length ? tokens.aiUsageRules : fallbackTokens.aiUsageRules
    };
}
function textStyle(tokens, name) {
    const style = tokens.typography[name];
    if (style && style.fontSize && style.fontWeight) {
        return style;
    }
    return fallbackTokens.typography[name] ? fallbackTokens.typography[name] : fallbackTokens.typography.body;
}
function colorSwatchTokens(tokens) {
    return [
        { name: "Brand / Primary", hex: tokens.colors.brand.primary },
        { name: "Neutral / 900", hex: tokens.colors.neutral["900"] },
        { name: "Neutral / 700", hex: tokens.colors.neutral["700"] },
        { name: "Neutral / 500", hex: tokens.colors.neutral["500"] },
        { name: "Neutral / 200", hex: tokens.colors.neutral["200"] },
        { name: "Neutral / 50", hex: tokens.colors.neutral["50"] },
        { name: "Accent / AI", hex: tokens.colors.accent.ai },
        { name: "Success", hex: tokens.colors.semantic.success },
        { name: "Warning", hex: tokens.colors.semantic.warning },
        { name: "Error", hex: tokens.colors.semantic.error },
        { name: "Info", hex: tokens.colors.semantic.info }
    ];
}
function spacing(tokens, index) {
    const value = tokens.spacing[index];
    const fallback = fallbackTokens.spacing[index] ? fallbackTokens.spacing[index] : 16;
    return numberValue(value, fallback);
}
function labelForTypography(key) {
    if (key === "h1")
        return "H1";
    if (key === "h2")
        return "H2";
    return key.charAt(0).toUpperCase() + key.slice(1);
}
function fontForWeight(weight) {
    return weight.toLowerCase() === "regular" ? regularFont : boldFont;
}
function parseSize(size, fallback) {
    const parsed = parseInt(size, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function stringValue(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
}
function numberValue(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function setPadding(frame, value) {
    frame.paddingTop = value;
    frame.paddingRight = value;
    frame.paddingBottom = value;
    frame.paddingLeft = value;
}
function frameLike(frame) {
    return frame;
}
function applyShadow(frame, tokens, tokenName) {
    const token = tokens.shadows[tokenName];
    if (!token || typeof token === "string") {
        return;
    }
    frame.effects = [{
            type: "DROP_SHADOW",
            color: parseRgba(token.color ? token.color : "rgba(17, 24, 39, 0.12)"),
            offset: { x: numberValue(token.x, 0), y: numberValue(token.y, 8) },
            radius: numberValue(token.blur, 20),
            spread: numberValue(token.spread, -8),
            visible: true,
            blendMode: "NORMAL"
        }];
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
function stateColor(name, tokens) {
    const normalized = name.toLowerCase();
    if (normalized === "error") {
        return tokens.colors.semantic.error;
    }
    if (normalized === "success") {
        return tokens.colors.semantic.success;
    }
    if (normalized === "disabled") {
        return tokens.colors.neutral["500"];
    }
    if (normalized === "loading") {
        return tokens.colors.accent.ai;
    }
    if (normalized === "focus") {
        return tokens.colors.semantic.info;
    }
    if (normalized === "empty") {
        return tokens.colors.semantic.warning;
    }
    return tokens.colors.brand.primary;
}
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatHex(hex) {
    return hex.indexOf("#") === 0 ? hex : `#${hex}`;
}
function solid(hex) {
    return { type: "SOLID", color: hexToRgb(hex) };
}
function parseRgba(value) {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) {
        return { r: 0.067, g: 0.094, b: 0.153, a: 0.12 };
    }
    const parts = match[1].split(",").map((part) => part.trim());
    const r = parseInt(parts[0], 10) / 255;
    const g = parseInt(parts[1], 10) / 255;
    const b = parseInt(parts[2], 10) / 255;
    const a = parts[3] ? parseFloat(parts[3]) : 1;
    return { r, g, b, a };
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
