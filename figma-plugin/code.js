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
// Strong, unambiguous DS intent — checked against combinedText
// Excluded (too ambiguous): design tokens, token registry, shared design tokens,
// styling tokens, token-based styling, visual/design source of truth, screen draft renderer
const designSystemExplicitKeywords = [
    "design system",
    "design foundation",
    "style guide",
    "visual language",
    "brand system"
];
// Section-level DS signals — individually weak, strong only in aggregate (≥4)
const designSystemSectionKeywords = [
    "color system",
    "color rules",
    "typography scale",
    "typography rules",
    "spacing scale",
    "spacing rules",
    "component foundation",
    "component rules",
    "state rules",
    "figma naming",
    "naming convention",
    "ai usage rules"
];
// Negative overrides — any match in full job text forces Screen Draft
const screenDraftNegativeKeywords = [
    "screen design",
    "screen layout",
    "screen scaffold",
    "product screen",
    "app screen",
    "ui screen",
    "page layout",
    "user flow",
    "onboarding screen",
    "login screen",
    "dashboard screen",
    "settings screen",
    "profile screen",
    "home screen",
    "feed screen",
    "detail screen",
    "list screen",
    "modal screen",
    "form screen"
];
const dashboardKeywords = [
    "dashboard",
    "analytics",
    "metrics",
    "kpi",
    "overview screen",
    "reporting screen",
    "stats screen",
    "insights screen",
    "admin panel",
    "control panel"
];
const conversationDashboardKeywords = [
    "conversation",
    "conversations",
    "dm",
    "direct message",
    "ai reply",
    "confidence",
    "handoff",
    "queue",
    "sync status"
];
const onboardingKeywords = [
    "onboarding",
    "getting started",
    "welcome screen",
    "setup flow",
    "activation flow",
    "first-time",
    "first time user",
    "sign-up flow",
    "registration flow",
    "setup wizard"
];
const designSystemPlaceholder = "Define this section based on the generated brief and product design foundation.";
const regularFont = { family: "Inter", style: "Regular" };
const boldFont = { family: "Inter", style: "Bold" };
figma.showUI(__html__, { width: 420, height: 640, themeColors: true });
console.log("PLUGIN VERSION: strict-detection-v3");
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
        const job = normalizeJob(message.job);
        const designPlan = job.designPlan;
        console.log(`[onmessage] jobId: ${job.jobId}`);
        console.log(`[onmessage] issueKey: ${job.issueKey || "none"}`);
        console.log(`[onmessage] using designPlan: ${!!designPlan}`);
        if (designPlan) {
            console.log(`[onmessage] layoutPattern: ${designPlan.layoutPattern || "none"}`);
            console.log(`[onmessage] contentBlocks count: ${Array.isArray(designPlan.contentBlocks) ? designPlan.contentBlocks.length : 0}`);
        }
        let frame;
        if (isDesignSystemJob(job)) {
            frame = createDesignSystemDraft(job, tokens);
        }
        else if (designPlan) {
            frame = renderDesignPlan(job, designPlan, tokens);
        }
        else {
            console.log(`[onmessage] fallback reason: no designPlan, using legacy renderer`);
            if (isDashboardJob(job)) {
                frame = createDashboardDraft(job, tokens);
            }
            else if (isOnboardingJob(job)) {
                frame = createOnboardingDraft(job, tokens);
            }
            else {
                frame = createDraftFrame(job, tokens);
            }
        }
        figma.currentPage.selection = [frame];
        figma.viewport.scrollAndZoomIntoView([frame]);
        const figmaFileKey = figma.fileKey ? figma.fileKey : "";
        const encodedFrameId = encodeURIComponent(frame.id);
        const figmaFileUrl = figmaFileKey ? `https://www.figma.com/file/${figmaFileKey}` : "";
        const figmaFrameUrl = figmaFileKey ? `${figmaFileUrl}?node-id=${encodedFrameId}` : "";
        figma.ui.postMessage({
            type: "frame-created",
            success: true,
            jobId: job.jobId,
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
// ─── Generic Design Plan Renderer ────────────────────────────────────────────
function renderDesignPlan(job, designPlan, tokens) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const planTitle = textOrFallback(designPlan.title || designPlan.briefTitle || job.briefTitle, "Untitled design job");
    const objective = textOrFallback(designPlan.objective || job.objective, "No objective provided.");
    const targetUser = textOrFallback(designPlan.targetUser || job.targetUser, "Not specified");
    const layoutPattern = designPlan.layoutPattern || "generic_screen_scaffold";
    const contentBlocks = Array.isArray(designPlan.contentBlocks) ? designPlan.contentBlocks : [];
    console.log(`[renderDesignPlan] jobId: ${job.jobId}`);
    console.log(`[renderDesignPlan] issueKey: ${issueKey}`);
    console.log(`[renderDesignPlan] layoutPattern: ${layoutPattern}`);
    console.log(`[renderDesignPlan] contentBlocks count: ${contentBlocks.length}`);
    const frame = figma.createFrame();
    frame.name = `AI Draft - ${issueKey} - ${planTitle}`;
    frame.fills = [solid(tokens.colors.neutral["50"])];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "FIXED";
    frame.resize(1440, 100);
    setPadding(frame, spacing(tokens, 7));
    frame.itemSpacing = spacing(tokens, 5);
    frame.appendChild(createDesignPlanHeader(issueKey, planTitle, objective, targetUser, layoutPattern, tokens));
    const blocksToRender = contentBlocks.length > 0
        ? contentBlocks
        : getDefaultBlocksForPattern(layoutPattern);
    if (contentBlocks.length === 0) {
        console.log(`[renderDesignPlan] no contentBlocks — generating defaults for layoutPattern: ${layoutPattern}`);
    }
    for (const block of blocksToRender) {
        frame.appendChild(renderContentBlock(block, tokens));
    }
    frame.appendChild(createNoteCard("AI-generated draft scaffold from design plan. A designer should review and refine.", tokens));
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function getDefaultBlocksForPattern(layoutPattern) {
    switch (layoutPattern) {
        case "dashboard_overview":
            return [
                { type: "pageHeader", title: "Dashboard", description: "Overview of key metrics and activity." },
                { type: "metricCards", title: "Key Metrics", items: [] },
                { type: "tableSection", title: "Recent Activity" }
            ];
        case "settings_page":
            return [
                { type: "pageHeader", title: "Settings", description: "Manage your account and preferences." },
                { type: "formSection", title: "General Settings", fields: ["Display Name", "Email", "Language"], cta: "Save Changes" },
                { type: "listSection", title: "Danger Zone", items: ["Reset preferences", "Delete account"] }
            ];
        case "list_table_page":
            return [
                { type: "pageHeader", title: "List", description: "Browse and manage items." },
                { type: "tableSection", title: "Items", columns: ["Name", "Status", "Date", "Actions"] }
            ];
        case "form_page":
            return [
                { type: "pageHeader", title: "Form", description: "Fill in the details below." },
                { type: "formSection", title: "Details", fields: ["Field 1", "Field 2", "Field 3"], cta: "Submit" }
            ];
        case "detail_page":
            return [
                { type: "pageHeader", title: "Details" },
                { type: "cardGrid", title: "Overview", items: [
                        { label: "Status", description: "Active" },
                        { label: "Created", description: "Today" },
                        { label: "Owner", description: "User" }
                    ] },
                { type: "listSection", title: "Related Items", items: ["Item 1", "Item 2", "Item 3"] }
            ];
        case "landing_page":
            return [
                { type: "heroSection", title: "Welcome", description: "A short value proposition.", cta: "Get Started" },
                { type: "cardGrid", title: "Features", items: [
                        { label: "Feature 1", description: "What it does." },
                        { label: "Feature 2", description: "What it does." },
                        { label: "Feature 3", description: "What it does." }
                    ] },
                { type: "formSection", title: "Sign Up", fields: ["Name", "Email"], cta: "Start Free Trial" }
            ];
        case "generic_screen_scaffold":
        default:
            return [
                { type: "pageHeader", title: "Screen", description: "Scaffold for a generic product screen." },
                { type: "genericContentBlock", title: "Primary Content", description: "Add your main content here." },
                { type: "emptyState", title: "No items yet", description: "Content will appear here." }
            ];
    }
}
function renderContentBlock(block, tokens) {
    const blockType = typeof block.type === "string" ? block.type : "genericContentBlock";
    switch (blockType) {
        case "pageHeader": return renderPageHeaderBlock(block, tokens);
        case "heroSection": return renderHeroSectionBlock(block, tokens);
        case "metricCards": return renderMetricCardsBlock(block, tokens);
        case "cardGrid": return renderCardGridBlock(block, tokens);
        case "tableSection": return renderTableSectionBlock(block, tokens);
        case "formSection": return renderFormSectionBlock(block, tokens);
        case "listSection": return renderListSectionBlock(block, tokens);
        case "emptyState": return renderEmptyStateBlock(block, tokens);
        case "loadingState": return renderLoadingStateBlock(block, tokens);
        case "errorState": return renderErrorStateBlock(block, tokens);
        case "successState": return renderSuccessStateBlock(block, tokens);
        default: return renderGenericContentBlock(block, tokens);
    }
}
function renderPageHeaderBlock(block, tokens) {
    const title = blockStr(block, "title");
    const description = blockStr(block, "description") || blockStr(block, "subtitle");
    const cta = blockStr(block, "cta") || blockStr(block, "action");
    const container = createBlockContainer("Page Header", tokens);
    const titleText = createTokenText(textOrFallback(title, "Page Title"), tokens, "h1", "bold", tokens.colors.neutral["900"]);
    titleText.layoutAlign = "STRETCH";
    container.appendChild(titleText);
    if (description) {
        const descText = createTokenText(truncateText(description, 160), tokens, "body", "regular", tokens.colors.neutral["500"]);
        descText.layoutAlign = "STRETCH";
        container.appendChild(descText);
    }
    if (cta) {
        container.appendChild(createPrimaryButton(cta, tokens));
    }
    return container;
}
function renderHeroSectionBlock(block, tokens) {
    const title = blockStr(block, "title") || blockStr(block, "heading");
    const description = blockStr(block, "description") || blockStr(block, "subtitle");
    const cta = blockStr(block, "cta") || blockStr(block, "action");
    const container = createBlockContainer("Hero Section", tokens);
    container.fills = [solid(tokens.colors.neutral["900"])];
    container.cornerRadius = tokens.radius.lg;
    container.paddingTop = spacing(tokens, 7);
    container.paddingBottom = spacing(tokens, 7);
    if (title) {
        const titleText = createTokenText(truncateText(title, 80), tokens, "display", "bold", "#FFFFFF");
        titleText.layoutAlign = "STRETCH";
        container.appendChild(titleText);
    }
    if (description) {
        const descText = createTokenText(truncateText(description, 160), tokens, "body", "regular", tokens.colors.neutral["200"]);
        descText.layoutAlign = "STRETCH";
        container.appendChild(descText);
    }
    if (cta) {
        const ctaBtn = createPrimaryButton(cta, tokens);
        ctaBtn.fills = [solid(tokens.colors.accent.ai)];
        container.appendChild(ctaBtn);
    }
    return container;
}
function renderMetricCardsBlock(block, tokens) {
    const title = blockStr(block, "title") || "Metrics";
    const items = blockArr(block, "items");
    const defaultItems = [
        { label: "Total", value: "—", description: "" },
        { label: "Active", value: "—", description: "" },
        { label: "Growth", value: "—", description: "" }
    ];
    const cardItems = items.length > 0 ? items.slice(0, 4) : defaultItems;
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    const cardRow = createRow("Metric cards", spacing(tokens, 3));
    cardRow.layoutAlign = "STRETCH";
    for (const item of cardItems) {
        const label = typeof item === "object" && item !== null ? String(item.label || "Metric") : "Metric";
        const value = typeof item === "object" && item !== null ? String(item.value || "—") : "—";
        const desc = typeof item === "object" && item !== null ? String(item.description || "") : "";
        cardRow.appendChild(createGenericMetricCard(label, value, desc, tokens));
    }
    container.appendChild(cardRow);
    return container;
}
function renderCardGridBlock(block, tokens) {
    const title = blockStr(block, "title") || "Cards";
    const items = blockArr(block, "items");
    const gridItems = items.length > 0 ? items.slice(0, 6) : [
        { label: "Card 1", description: "Placeholder card content" },
        { label: "Card 2", description: "Placeholder card content" },
        { label: "Card 3", description: "Placeholder card content" }
    ];
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    const rowSize = 3;
    for (let i = 0; i < gridItems.length; i += rowSize) {
        const rowItems = gridItems.slice(i, i + rowSize);
        const row = createRow(`Cards row ${Math.floor(i / rowSize) + 1}`, spacing(tokens, 3));
        row.layoutAlign = "STRETCH";
        for (const item of rowItems) {
            const label = typeof item === "string" ? item : String(item.label || "Card");
            const desc = typeof item === "object" && item !== null ? String(item.description || "") : "";
            const card = figma.createFrame();
            card.name = label;
            card.layoutMode = "VERTICAL";
            card.primaryAxisSizingMode = "AUTO";
            card.counterAxisSizingMode = "FIXED";
            card.resize(400, 100);
            card.paddingTop = spacing(tokens, 3);
            card.paddingBottom = spacing(tokens, 3);
            card.paddingLeft = spacing(tokens, 3);
            card.paddingRight = spacing(tokens, 3);
            card.itemSpacing = spacing(tokens, 1);
            card.cornerRadius = tokens.radius.md;
            card.fills = [solid("#FFFFFF")];
            card.strokes = [solid(tokens.colors.neutral["200"])];
            card.strokeWeight = 1;
            applyShadow(card, tokens, "cardSubtle");
            card.appendChild(createTokenText(truncateText(label, 40), tokens, "label", "bold", tokens.colors.neutral["900"]));
            if (desc) {
                const descText = createTokenText(truncateText(desc, 100), tokens, "caption", "regular", tokens.colors.neutral["700"]);
                descText.layoutAlign = "STRETCH";
                card.appendChild(descText);
            }
            row.appendChild(card);
        }
        container.appendChild(row);
    }
    return container;
}
function renderTableSectionBlock(block, tokens) {
    const title = blockStr(block, "title") || "Table";
    const columns = blockArr(block, "columns");
    const colNames = columns.length > 0
        ? columns.map(c => typeof c === "string" ? c : String(c.label || c.name || "—"))
        : ["Name", "Status", "Date", "Value"];
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    const headerRow = createRow("Table header", spacing(tokens, 3));
    headerRow.layoutAlign = "STRETCH";
    for (const col of colNames) {
        const cell = createTokenText(col, tokens, "caption", "bold", tokens.colors.neutral["500"]);
        cell.layoutGrow = 1;
        headerRow.appendChild(cell);
    }
    container.appendChild(headerRow);
    const divider = figma.createFrame();
    divider.name = "Table header divider";
    divider.primaryAxisSizingMode = "FIXED";
    divider.counterAxisSizingMode = "FIXED";
    divider.layoutAlign = "STRETCH";
    divider.resize(100, 1);
    divider.fills = [solid(tokens.colors.neutral["200"])];
    container.appendChild(divider);
    const rowCount = Math.min(5, Math.max(3, blockArr(block, "rows").length || 3));
    for (let r = 0; r < rowCount; r++) {
        const tableRow = createRow(`Row ${r + 1}`, spacing(tokens, 3));
        tableRow.layoutAlign = "STRETCH";
        tableRow.fills = r % 2 === 0 ? [] : [solid(tokens.colors.neutral["50"])];
        for (let ci = 0; ci < colNames.length; ci++) {
            const cell = createTokenText("—", tokens, "body", "regular", tokens.colors.neutral["700"]);
            cell.layoutGrow = 1;
            tableRow.appendChild(cell);
        }
        container.appendChild(tableRow);
    }
    return container;
}
function renderFormSectionBlock(block, tokens) {
    const title = blockStr(block, "title") || "Form";
    const fields = blockArr(block, "fields");
    const fieldNames = fields.length > 0
        ? fields.slice(0, 6).map(f => typeof f === "string" ? f : String(f.label || f.name || "Field"))
        : ["Field 1", "Field 2", "Field 3"];
    const cta = blockStr(block, "cta") || blockStr(block, "submitLabel") || "Submit";
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    const formFields = figma.createFrame();
    formFields.name = "Form fields";
    formFields.layoutMode = "VERTICAL";
    formFields.primaryAxisSizingMode = "AUTO";
    formFields.counterAxisSizingMode = "FIXED";
    formFields.layoutAlign = "STRETCH";
    formFields.fills = [];
    formFields.itemSpacing = spacing(tokens, 3);
    for (const fieldName of fieldNames) {
        const wrapper = figma.createFrame();
        wrapper.name = fieldName;
        wrapper.layoutMode = "VERTICAL";
        wrapper.primaryAxisSizingMode = "AUTO";
        wrapper.counterAxisSizingMode = "FIXED";
        wrapper.layoutAlign = "STRETCH";
        wrapper.fills = [];
        wrapper.itemSpacing = spacing(tokens, 1);
        wrapper.appendChild(createTokenText(fieldName, tokens, "label", "bold", tokens.colors.neutral["700"]));
        const input = figma.createFrame();
        input.name = `${fieldName} input`;
        input.layoutMode = "HORIZONTAL";
        input.primaryAxisSizingMode = "FIXED";
        input.counterAxisSizingMode = "FIXED";
        input.layoutAlign = "STRETCH";
        input.resize(800, 40);
        input.paddingTop = spacing(tokens, 2);
        input.paddingBottom = spacing(tokens, 2);
        input.paddingLeft = spacing(tokens, 3);
        input.paddingRight = spacing(tokens, 3);
        input.counterAxisAlignItems = "CENTER";
        input.cornerRadius = tokens.radius.sm;
        input.fills = [solid("#FFFFFF")];
        input.strokes = [solid(tokens.colors.neutral["200"])];
        input.strokeWeight = 1;
        input.appendChild(createTokenText(`Enter ${fieldName.toLowerCase()}...`, tokens, "body", "regular", tokens.colors.neutral["500"]));
        wrapper.appendChild(input);
        formFields.appendChild(wrapper);
    }
    container.appendChild(formFields);
    container.appendChild(createPrimaryButton(cta, tokens));
    return container;
}
function renderListSectionBlock(block, tokens) {
    const title = blockStr(block, "title") || "List";
    const items = blockArr(block, "items");
    const listItems = items.length > 0 ? items.slice(0, 8) : ["Placeholder item 1", "Placeholder item 2", "Placeholder item 3"];
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    for (const item of listItems) {
        const label = typeof item === "string" ? item : String(item.label || item.name || "—");
        const desc = typeof item === "object" && item !== null ? String(item.description || "") : "";
        const listRow = createRow("List item", spacing(tokens, 2));
        listRow.layoutAlign = "STRETCH";
        listRow.counterAxisAlignItems = "CENTER";
        const dot = figma.createEllipse();
        dot.resize(8, 8);
        dot.fills = [solid(tokens.colors.neutral["500"])];
        listRow.appendChild(dot);
        if (desc) {
            const textCol = figma.createFrame();
            textCol.name = "item text";
            textCol.layoutMode = "VERTICAL";
            textCol.primaryAxisSizingMode = "AUTO";
            textCol.counterAxisSizingMode = "FIXED";
            textCol.fills = [];
            textCol.itemSpacing = 2;
            textCol.layoutGrow = 1;
            textCol.appendChild(createTokenText(truncateText(label, 100), tokens, "body", "regular", tokens.colors.neutral["900"]));
            textCol.appendChild(createTokenText(truncateText(desc, 120), tokens, "caption", "regular", tokens.colors.neutral["500"]));
            listRow.appendChild(textCol);
        }
        else {
            const labelText = createTokenText(truncateText(label, 120), tokens, "body", "regular", tokens.colors.neutral["900"]);
            labelText.layoutGrow = 1;
            listRow.appendChild(labelText);
        }
        container.appendChild(listRow);
    }
    return container;
}
function renderEmptyStateBlock(block, tokens) {
    const title = blockStr(block, "title") || "Nothing here yet";
    const description = blockStr(block, "description") || "No items to display.";
    const action = blockStr(block, "action") || blockStr(block, "cta");
    const container = figma.createFrame();
    container.name = "Empty State";
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.layoutAlign = "STRETCH";
    setPadding(container, spacing(tokens, 6));
    container.itemSpacing = spacing(tokens, 3);
    container.primaryAxisAlignItems = "CENTER";
    container.counterAxisAlignItems = "CENTER";
    container.cornerRadius = tokens.radius.lg;
    container.fills = [solid(tokens.colors.neutral["50"])];
    container.strokes = [solid(tokens.colors.neutral["200"])];
    container.strokeWeight = 1;
    const iconCircle = figma.createFrame();
    iconCircle.name = "Icon placeholder";
    iconCircle.resize(48, 48);
    iconCircle.cornerRadius = 999;
    iconCircle.fills = [solid(tokens.colors.neutral["200"])];
    container.appendChild(iconCircle);
    container.appendChild(createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["700"]));
    container.appendChild(createTokenText(description, tokens, "body", "regular", tokens.colors.neutral["500"]));
    if (action) {
        container.appendChild(createPrimaryButton(action, tokens));
    }
    return container;
}
function renderLoadingStateBlock(block, tokens) {
    const title = blockStr(block, "title") || "Loading…";
    const container = figma.createFrame();
    container.name = "Loading State";
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.layoutAlign = "STRETCH";
    setPadding(container, spacing(tokens, 4));
    container.itemSpacing = spacing(tokens, 2);
    container.cornerRadius = tokens.radius.md;
    container.fills = [solid("#FFFFFF")];
    container.strokes = [solid(tokens.colors.neutral["200"])];
    container.strokeWeight = 1;
    container.appendChild(createTokenText(title, tokens, "label", "bold", tokens.colors.neutral["500"]));
    for (const w of [1100, 880, 990]) {
        const bar = figma.createFrame();
        bar.name = "skeleton bar";
        bar.resize(w, 12);
        bar.cornerRadius = 999;
        bar.fills = [solid(tokens.colors.neutral["200"])];
        container.appendChild(bar);
    }
    return container;
}
function renderErrorStateBlock(block, tokens) {
    const title = blockStr(block, "title") || "Something went wrong";
    const description = blockStr(block, "description") || "An error occurred. Please try again.";
    const retryLabel = blockStr(block, "retryLabel") || blockStr(block, "action") || "Retry";
    const container = figma.createFrame();
    container.name = "Error State";
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.layoutAlign = "STRETCH";
    setPadding(container, spacing(tokens, 5));
    container.itemSpacing = spacing(tokens, 3);
    container.primaryAxisAlignItems = "CENTER";
    container.counterAxisAlignItems = "CENTER";
    container.cornerRadius = tokens.radius.md;
    container.fills = [solid("#FFF5F5")];
    container.strokes = [solid(tokens.colors.semantic.error)];
    container.strokeWeight = 1;
    const iconCircle = figma.createFrame();
    iconCircle.name = "Error icon placeholder";
    iconCircle.resize(40, 40);
    iconCircle.cornerRadius = 999;
    iconCircle.fills = [solid("#FEE2E2")];
    container.appendChild(iconCircle);
    container.appendChild(createTokenText(title, tokens, "h2", "bold", tokens.colors.semantic.error));
    container.appendChild(createTokenText(description, tokens, "body", "regular", tokens.colors.neutral["500"]));
    const retryBtn = createPrimaryButton(retryLabel, tokens);
    retryBtn.fills = [solid(tokens.colors.semantic.error)];
    container.appendChild(retryBtn);
    return container;
}
function renderSuccessStateBlock(block, tokens) {
    const title = blockStr(block, "title") || "Done!";
    const description = blockStr(block, "description") || "Your action was completed successfully.";
    const action = blockStr(block, "action") || blockStr(block, "cta");
    const container = figma.createFrame();
    container.name = "Success State";
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.layoutAlign = "STRETCH";
    setPadding(container, spacing(tokens, 5));
    container.itemSpacing = spacing(tokens, 3);
    container.primaryAxisAlignItems = "CENTER";
    container.counterAxisAlignItems = "CENTER";
    container.cornerRadius = tokens.radius.md;
    container.fills = [solid("#F0FDF4")];
    container.strokes = [solid(tokens.colors.semantic.success)];
    container.strokeWeight = 1;
    const iconCircle = figma.createFrame();
    iconCircle.name = "Success icon placeholder";
    iconCircle.resize(40, 40);
    iconCircle.cornerRadius = 999;
    iconCircle.fills = [solid("#D1FAE5")];
    container.appendChild(iconCircle);
    container.appendChild(createTokenText(title, tokens, "h2", "bold", tokens.colors.semantic.success));
    container.appendChild(createTokenText(description, tokens, "body", "regular", tokens.colors.neutral["500"]));
    if (action) {
        const actionBtn = createPrimaryButton(action, tokens);
        actionBtn.fills = [solid(tokens.colors.semantic.success)];
        container.appendChild(actionBtn);
    }
    return container;
}
function renderGenericContentBlock(block, tokens) {
    const blockType = typeof block.type === "string" ? block.type : "";
    const title = blockStr(block, "title") || blockStr(block, "label") || (blockType ? blockType : "Content Block");
    const description = blockStr(block, "description") || blockStr(block, "content") || blockStr(block, "body");
    const container = createBlockContainer(title, tokens);
    const heading = createTokenText(title, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    container.appendChild(heading);
    if (description) {
        const text = createTokenText(truncateText(description, 300), tokens, "body", "regular", tokens.colors.neutral["700"]);
        text.layoutAlign = "STRETCH";
        text.lineHeight = { value: 28, unit: "PIXELS" };
        container.appendChild(text);
    }
    else {
        const placeholder = figma.createFrame();
        placeholder.name = "Content placeholder";
        placeholder.layoutAlign = "STRETCH";
        placeholder.primaryAxisSizingMode = "FIXED";
        placeholder.counterAxisSizingMode = "FIXED";
        placeholder.resize(1100, 48);
        placeholder.cornerRadius = tokens.radius.sm;
        placeholder.fills = [solid(tokens.colors.neutral["50"])];
        placeholder.strokes = [solid(tokens.colors.neutral["200"])];
        placeholder.strokeWeight = 1;
        container.appendChild(placeholder);
    }
    return container;
}
// ─── Design Plan layout helpers ───────────────────────────────────────────────
function createDesignPlanHeader(issueKey, title, objective, targetUser, layoutPattern, tokens) {
    const header = figma.createFrame();
    header.name = "Design Plan Header";
    header.layoutMode = "VERTICAL";
    header.primaryAxisSizingMode = "AUTO";
    header.counterAxisSizingMode = "FIXED";
    header.layoutAlign = "STRETCH";
    setPadding(header, spacing(tokens, 5));
    header.itemSpacing = spacing(tokens, 2);
    header.cornerRadius = tokens.radius.lg;
    header.fills = [solid("#FFFFFF")];
    header.strokes = [solid(tokens.colors.neutral["200"])];
    header.strokeWeight = 1;
    applyShadow(header, tokens, "cardSubtle");
    const badgeRow = createRow("Badges", spacing(tokens, 2));
    badgeRow.appendChild(createModeBadge("Screen Draft", tokens));
    badgeRow.appendChild(createModeBadge(layoutPattern.replace(/_/g, " "), tokens));
    header.appendChild(badgeRow);
    const titleText = createTokenText(title, tokens, "display", "bold", tokens.colors.neutral["900"]);
    titleText.layoutAlign = "STRETCH";
    header.appendChild(titleText);
    const meta = createTokenText(`Issue: ${issueKey} | Target user: ${targetUser}`, tokens, "body", "regular", tokens.colors.neutral["500"]);
    meta.layoutAlign = "STRETCH";
    header.appendChild(meta);
    const objectiveText = createTokenText(truncateText(objective, 200), tokens, "body", "regular", tokens.colors.neutral["700"]);
    objectiveText.layoutAlign = "STRETCH";
    objectiveText.lineHeight = { value: 28, unit: "PIXELS" };
    header.appendChild(objectiveText);
    return header;
}
function createBlockContainer(name, tokens) {
    const container = figma.createFrame();
    container.name = name;
    container.layoutMode = "VERTICAL";
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "FIXED";
    container.layoutAlign = "STRETCH";
    setPadding(container, spacing(tokens, 4));
    container.itemSpacing = spacing(tokens, 3);
    container.cornerRadius = tokens.radius.md;
    container.fills = [solid("#FFFFFF")];
    container.strokes = [solid(tokens.colors.neutral["200"])];
    container.strokeWeight = 1;
    applyShadow(container, tokens, "cardSubtle");
    return container;
}
function createGenericMetricCard(label, value, description, tokens) {
    const card = figma.createFrame();
    card.name = label;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(280, 100);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 1);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    card.appendChild(createTokenText(label, tokens, "caption", "regular", tokens.colors.neutral["500"]));
    card.appendChild(createTokenText(value, tokens, "h2", "bold", tokens.colors.neutral["900"]));
    if (description) {
        const descText = createTokenText(truncateText(description, 60), tokens, "caption", "regular", tokens.colors.neutral["500"]);
        descText.layoutAlign = "STRETCH";
        card.appendChild(descText);
    }
    return card;
}
function blockStr(block, key) {
    const v = block[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
}
function blockArr(block, key) {
    const v = block[key];
    return Array.isArray(v) ? v : [];
}
// ─────────────────────────────────────────────────────────────────────────────
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
function createDashboardDraft(job, tokens) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const briefTitle = textOrFallback(job.briefTitle, "Untitled dashboard job");
    const subtype = getConversationDashboardSubtype(job);
    const badgeLabel = subtype === "conversation" ? "Conversation Dashboard" : "Analytics Dashboard";
    const frameHeight = subtype === "conversation" ? 1136 : 900;
    const bodyHeight = frameHeight - 56;
    const frame = figma.createFrame();
    frame.name = `AI Dashboard - ${issueKey} - ${briefTitle}`;
    frame.resize(1440, frameHeight);
    frame.fills = [solid(tokens.colors.neutral["50"])];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.itemSpacing = 0;
    frame.paddingTop = 0;
    frame.paddingRight = 0;
    frame.paddingBottom = 0;
    frame.paddingLeft = 0;
    frame.appendChild(createDashboardNav(briefTitle, badgeLabel, tokens));
    const body = figma.createFrame();
    body.name = "Body";
    body.layoutMode = "HORIZONTAL";
    body.primaryAxisSizingMode = "FIXED";
    body.counterAxisSizingMode = "FIXED";
    body.resize(1440, bodyHeight);
    body.fills = [];
    body.itemSpacing = 0;
    body.paddingTop = 0;
    body.paddingRight = 0;
    body.paddingBottom = 0;
    body.paddingLeft = 0;
    body.layoutGrow = 1;
    frame.appendChild(body);
    if (subtype === "conversation") {
        body.appendChild(createConversationDashboardSidebar(bodyHeight, tokens));
        body.appendChild(createConversationDashboardMain(job, bodyHeight, tokens));
    }
    else {
        body.appendChild(createDashboardSidebar(tokens));
        body.appendChild(createDashboardMain(job, tokens));
    }
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createDashboardNav(title, badgeLabel, tokens) {
    const nav = figma.createFrame();
    nav.name = "Top Nav";
    nav.layoutMode = "HORIZONTAL";
    nav.primaryAxisSizingMode = "FIXED";
    nav.counterAxisSizingMode = "FIXED";
    nav.resize(1440, 56);
    nav.paddingTop = 0;
    nav.paddingBottom = 0;
    nav.paddingLeft = spacing(tokens, 4);
    nav.paddingRight = spacing(tokens, 4);
    nav.counterAxisAlignItems = "CENTER";
    nav.primaryAxisAlignItems = "SPACE_BETWEEN";
    nav.fills = [solid("#FFFFFF")];
    nav.strokes = [solid(tokens.colors.neutral["200"])];
    nav.strokeWeight = 1;
    const logo = createTokenText(title, tokens, "label", "bold", tokens.colors.neutral["900"]);
    nav.appendChild(logo);
    const badge = createModeBadge(badgeLabel, tokens);
    nav.appendChild(badge);
    const avatar = figma.createFrame();
    avatar.name = "User avatar";
    avatar.resize(32, 32);
    avatar.cornerRadius = 999;
    avatar.fills = [solid(tokens.colors.neutral["200"])];
    nav.appendChild(avatar);
    return nav;
}
function createDashboardSidebar(tokens) {
    const sidebar = figma.createFrame();
    sidebar.name = "Sidebar";
    sidebar.layoutMode = "VERTICAL";
    sidebar.primaryAxisSizingMode = "FIXED";
    sidebar.counterAxisSizingMode = "FIXED";
    sidebar.resize(220, 844);
    sidebar.paddingTop = spacing(tokens, 4);
    sidebar.paddingBottom = spacing(tokens, 4);
    sidebar.paddingLeft = spacing(tokens, 3);
    sidebar.paddingRight = spacing(tokens, 3);
    sidebar.itemSpacing = spacing(tokens, 1);
    sidebar.fills = [solid("#FFFFFF")];
    sidebar.strokes = [solid(tokens.colors.neutral["200"])];
    sidebar.strokeWeight = 1;
    const navItems = ["Overview", "Analytics", "Content", "Audience", "Settings"];
    for (let i = 0; i < navItems.length; i++) {
        const item = figma.createFrame();
        item.name = navItems[i];
        item.layoutMode = "HORIZONTAL";
        item.primaryAxisSizingMode = "FIXED";
        item.counterAxisSizingMode = "AUTO";
        item.resize(196, 36);
        item.paddingTop = spacing(tokens, 1);
        item.paddingBottom = spacing(tokens, 1);
        item.paddingLeft = spacing(tokens, 2);
        item.paddingRight = spacing(tokens, 2);
        item.counterAxisAlignItems = "CENTER";
        item.cornerRadius = tokens.radius.sm;
        item.fills = i === 0 ? [solid(tokens.colors.neutral["50"])] : [];
        item.strokes = i === 0 ? [solid(tokens.colors.neutral["200"])] : [];
        item.strokeWeight = 1;
        item.appendChild(createTokenText(navItems[i], tokens, "label", i === 0 ? "bold" : "regular", i === 0 ? tokens.colors.neutral["900"] : tokens.colors.neutral["700"]));
        sidebar.appendChild(item);
    }
    return sidebar;
}
function createDashboardMain(job, tokens) {
    const main = figma.createFrame();
    main.name = "Main Content";
    main.layoutMode = "VERTICAL";
    main.primaryAxisSizingMode = "FIXED";
    main.counterAxisSizingMode = "FIXED";
    main.resize(1220, 844);
    main.paddingTop = spacing(tokens, 5);
    main.paddingBottom = spacing(tokens, 5);
    main.paddingLeft = spacing(tokens, 5);
    main.paddingRight = spacing(tokens, 5);
    main.itemSpacing = spacing(tokens, 4);
    main.fills = [];
    const pageTitle = createTokenText(textOrFallback(job.briefTitle, "Dashboard Overview"), tokens, "h1", "bold", tokens.colors.neutral["900"]);
    pageTitle.layoutAlign = "STRETCH";
    main.appendChild(pageTitle);
    const subtitle = createTokenText(truncateText(textOrFallback(job.objective, "Monitor key metrics at a glance."), 120), tokens, "body", "regular", tokens.colors.neutral["500"]);
    subtitle.layoutAlign = "STRETCH";
    main.appendChild(subtitle);
    main.appendChild(createMetricCardsRow(tokens));
    main.appendChild(createChartsRow(tokens));
    main.appendChild(createDashboardTablePlaceholder(tokens));
    return main;
}
function createMetricCardsRow(tokens) {
    const labels = ["Total Followers", "Posts This Month", "Avg. Engagement", "Link Clicks"];
    const values = ["12,450", "38", "4.2%", "1,830"];
    const cards = labels.map((label, i) => createMetricCard(label, values[i], tokens));
    const row = createHorizontalGroup(cards, spacing(tokens, 3));
    row.name = "Metric Cards";
    return row;
}
function createMetricCard(label, value, tokens) {
    const card = figma.createFrame();
    card.name = label;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(264, 90);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 1);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    card.appendChild(createTokenText(label, tokens, "caption", "regular", tokens.colors.neutral["500"]));
    card.appendChild(createTokenText(value, tokens, "h2", "bold", tokens.colors.neutral["900"]));
    return card;
}
function createChartsRow(tokens) {
    const charts = [
        createChartPlaceholder("Follower Growth", 700, tokens),
        createChartPlaceholder("Engagement by Post", 460, tokens)
    ];
    const row = createHorizontalGroup(charts, spacing(tokens, 3));
    row.name = "Charts";
    return row;
}
function createChartPlaceholder(title, width, tokens) {
    const card = figma.createFrame();
    card.name = title;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(width, 220);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    card.appendChild(createTokenText(title, tokens, "label", "bold", tokens.colors.neutral["900"]));
    const chartArea = figma.createFrame();
    chartArea.name = "Chart area";
    chartArea.layoutAlign = "STRETCH";
    chartArea.primaryAxisSizingMode = "FIXED";
    chartArea.counterAxisSizingMode = "FIXED";
    chartArea.resize(width - spacing(tokens, 6), 150);
    chartArea.cornerRadius = tokens.radius.sm;
    chartArea.fills = [solid(tokens.colors.neutral["50"])];
    chartArea.strokes = [solid(tokens.colors.neutral["200"])];
    chartArea.strokeWeight = 1;
    card.appendChild(chartArea);
    return card;
}
function createDashboardTablePlaceholder(tokens) {
    const card = figma.createFrame();
    card.name = "Recent Posts Table";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(1180, 180);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    card.appendChild(createTokenText("Recent Posts", tokens, "label", "bold", tokens.colors.neutral["900"]));
    const headerRow = createRow("Table header", spacing(tokens, 3));
    headerRow.layoutAlign = "STRETCH";
    const cols = ["Post", "Date", "Likes", "Comments", "Reach"];
    for (const col of cols) {
        const cell = createTokenText(col, tokens, "caption", "bold", tokens.colors.neutral["500"]);
        cell.layoutGrow = col === "Post" ? 1 : 0;
        if (col !== "Post")
            cell.resize(100, cell.height);
        headerRow.appendChild(cell);
    }
    card.appendChild(headerRow);
    for (let r = 0; r < 2; r++) {
        const rowFrame = figma.createFrame();
        rowFrame.name = `Row ${r + 1}`;
        rowFrame.layoutMode = "HORIZONTAL";
        rowFrame.primaryAxisSizingMode = "AUTO";
        rowFrame.counterAxisSizingMode = "FIXED";
        rowFrame.layoutAlign = "STRETCH";
        rowFrame.resize(1180 - spacing(tokens, 6), 28);
        rowFrame.counterAxisAlignItems = "CENTER";
        rowFrame.fills = r % 2 === 0 ? [] : [solid(tokens.colors.neutral["50"])];
        rowFrame.itemSpacing = spacing(tokens, 3);
        rowFrame.paddingLeft = spacing(tokens, 1);
        rowFrame.paddingRight = spacing(tokens, 1);
        const cells = ["Post caption placeholder...", "Jun 2026", "1,200", "48", "9,400"];
        for (let c = 0; c < cells.length; c++) {
            const cell = createTokenText(cells[c], tokens, "caption", "regular", tokens.colors.neutral["700"]);
            cell.layoutGrow = c === 0 ? 1 : 0;
            if (c !== 0)
                cell.resize(100, cell.height);
            rowFrame.appendChild(cell);
        }
        card.appendChild(rowFrame);
    }
    return card;
}
function getConversationDashboardSubtype(job) {
    const text = [
        job.briefTitle,
        job.title,
        job.objective,
        job.figmaInstruction,
        job.requiredSections,
        job.acceptanceCriteria
    ].join(" ").toLowerCase();
    const matched = conversationDashboardKeywords.filter(k => text.indexOf(k) >= 0);
    console.log(`[Dashboard] subtype check for: "${job.briefTitle}"`);
    console.log(`[Dashboard] matched dashboard content keywords: ${JSON.stringify(matched)}`);
    const subtype = matched.length > 0 ? "conversation" : "analytics";
    console.log(`[Dashboard] selected dashboard subtype: ${subtype}-dashboard`);
    return subtype;
}
function createConversationDashboardSidebar(bodyHeight, tokens) {
    const sidebar = figma.createFrame();
    sidebar.name = "Sidebar";
    sidebar.layoutMode = "VERTICAL";
    sidebar.primaryAxisSizingMode = "FIXED";
    sidebar.counterAxisSizingMode = "FIXED";
    sidebar.resize(220, bodyHeight);
    sidebar.paddingTop = spacing(tokens, 4);
    sidebar.paddingBottom = spacing(tokens, 4);
    sidebar.paddingLeft = spacing(tokens, 3);
    sidebar.paddingRight = spacing(tokens, 3);
    sidebar.itemSpacing = spacing(tokens, 1);
    sidebar.fills = [solid("#FFFFFF")];
    sidebar.strokes = [solid(tokens.colors.neutral["200"])];
    sidebar.strokeWeight = 1;
    const navItems = ["Conversations", "AI Replies", "Handoff Queue", "Sync", "Settings"];
    for (let i = 0; i < navItems.length; i++) {
        const item = figma.createFrame();
        item.name = navItems[i];
        item.layoutMode = "HORIZONTAL";
        item.primaryAxisSizingMode = "FIXED";
        item.counterAxisSizingMode = "AUTO";
        item.resize(196, 36);
        item.paddingTop = spacing(tokens, 1);
        item.paddingBottom = spacing(tokens, 1);
        item.paddingLeft = spacing(tokens, 2);
        item.paddingRight = spacing(tokens, 2);
        item.counterAxisAlignItems = "CENTER";
        item.cornerRadius = tokens.radius.sm;
        item.fills = i === 0 ? [solid(tokens.colors.neutral["50"])] : [];
        item.strokes = i === 0 ? [solid(tokens.colors.neutral["200"])] : [];
        item.strokeWeight = 1;
        item.appendChild(createTokenText(navItems[i], tokens, "label", i === 0 ? "bold" : "regular", i === 0 ? tokens.colors.neutral["900"] : tokens.colors.neutral["700"]));
        sidebar.appendChild(item);
    }
    return sidebar;
}
function createConversationDashboardMain(job, bodyHeight, tokens) {
    // inner width = 1220 - 2*spacing[5] = 1220 - 64 = 1156px
    const main = figma.createFrame();
    main.name = "Main Content";
    main.layoutMode = "VERTICAL";
    main.primaryAxisSizingMode = "FIXED";
    main.counterAxisSizingMode = "FIXED";
    main.resize(1220, bodyHeight);
    main.paddingTop = spacing(tokens, 5);
    main.paddingBottom = spacing(tokens, 5);
    main.paddingLeft = spacing(tokens, 5);
    main.paddingRight = spacing(tokens, 5);
    main.itemSpacing = spacing(tokens, 4);
    main.fills = [];
    main.clipsContent = true;
    const pageTitle = createTokenText(textOrFallback(job.briefTitle, "Conversation Dashboard"), tokens, "h1", "bold", tokens.colors.neutral["900"]);
    pageTitle.layoutAlign = "STRETCH";
    main.appendChild(pageTitle);
    const subtitle = createTokenText(truncateText(textOrFallback(job.objective, "Monitor AI conversation performance and handoff queue."), 120), tokens, "body", "regular", tokens.colors.neutral["500"]);
    subtitle.layoutAlign = "STRETCH";
    main.appendChild(subtitle);
    main.appendChild(createConversationMetricsRow(tokens));
    main.appendChild(createConversationMiddleRow(tokens));
    main.appendChild(createConversationBottomRow(tokens));
    main.appendChild(createStatePreviewsRow(tokens));
    return main;
}
function createConversationMetricsRow(tokens) {
    // 4 × 277px + 3 × 16px gap = 1156px
    const metrics = [
        { label: "Total Conversations", value: "1,284", trend: "↑ 12% vs last week", up: true },
        { label: "AI Replied", value: "1,031", trend: "80% of total · ↑ 4%", up: true },
        { label: "Handed Off", value: "186", trend: "14% of total · ↓ 2%", up: false },
        { label: "Pending Review", value: "67", trend: "↓ 8% vs yesterday", up: true }
    ];
    const cards = metrics.map(m => createConversationMetricCard(m.label, m.value, m.trend, m.up, tokens));
    const row = createHorizontalGroup(cards, spacing(tokens, 3));
    row.name = "Conversation Metrics";
    return row;
}
function createConversationMetricCard(label, value, trend, trendPositive, tokens) {
    const card = figma.createFrame();
    card.name = label;
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(277, 100);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 1);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    const labelText = createTokenText(label, tokens, "caption", "regular", tokens.colors.neutral["500"]);
    labelText.layoutAlign = "STRETCH";
    card.appendChild(labelText);
    const valueText = createTokenText(value, tokens, "h2", "bold", tokens.colors.neutral["900"]);
    valueText.layoutAlign = "STRETCH";
    card.appendChild(valueText);
    const trendColor = trendPositive ? tokens.colors.semantic.success : tokens.colors.semantic.error;
    const trendText = createTokenText(trend, tokens, "caption", "regular", trendColor);
    trendText.layoutAlign = "STRETCH";
    card.appendChild(trendText);
    return card;
}
function createConversationMiddleRow(tokens) {
    // 700px + 16px gap + 440px = 1156px
    const row = createHorizontalGroup([
        createRecentConversationsSection(tokens),
        createAiQualitySection(tokens)
    ], spacing(tokens, 3));
    row.name = "Middle Row";
    return row;
}
function createRecentConversationsSection(tokens) {
    const card = figma.createFrame();
    card.name = "Recent Conversations";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(700, 232);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    card.clipsContent = true;
    applyShadow(card, tokens, "cardSubtle");
    const sectionHeader = createRow("section header", spacing(tokens, 2));
    sectionHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
    const heading = createTokenText("Recent Conversations", tokens, "label", "bold", tokens.colors.neutral["900"]);
    heading.layoutGrow = 1;
    sectionHeader.appendChild(heading);
    sectionHeader.appendChild(createTokenText("View all →", tokens, "caption", "regular", tokens.colors.semantic.info));
    card.appendChild(sectionHeader);
    const conversations = [
        { handle: "@maria_s", message: "Can I reschedule my order?", confidence: 94, status: "AI Replied", time: "2m ago" },
        { handle: "@john_b", message: "This is not what I ordered...", confidence: 61, status: "Handed Off", time: "4m ago" },
        { handle: "@studio.k", message: "Do you ship internationally?", confidence: 88, status: "AI Replied", time: "7m ago" },
        { handle: "@petra.r", message: "I need to speak to someone", confidence: 72, status: "In Queue", time: "12m ago" }
    ];
    const avatarBgs = [tokens.colors.semantic.info, tokens.colors.semantic.error, tokens.colors.accent.ai, tokens.colors.semantic.warning];
    for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        const row = createRow("conversation row", spacing(tokens, 2));
        row.counterAxisAlignItems = "CENTER";
        row.appendChild(createInitialsAvatar(conv.handle, avatarBgs[i % avatarBgs.length], tokens));
        const infoCol = figma.createFrame();
        infoCol.name = "info";
        infoCol.layoutMode = "VERTICAL";
        infoCol.primaryAxisSizingMode = "AUTO";
        infoCol.counterAxisSizingMode = "FIXED";
        infoCol.resize(180, 36);
        infoCol.fills = [];
        infoCol.itemSpacing = 2;
        infoCol.layoutGrow = 1;
        infoCol.appendChild(createTokenText(conv.handle, tokens, "caption", "bold", tokens.colors.neutral["900"]));
        infoCol.appendChild(createTokenText(truncateText(conv.message, 34), tokens, "caption", "regular", tokens.colors.neutral["500"]));
        row.appendChild(infoCol);
        const confBg = conv.confidence >= 90 ? "#D1FAE5" : (conv.confidence >= 70 ? "#FEF3C7" : "#FEE2E2");
        const confClr = conv.confidence >= 90 ? tokens.colors.semantic.success : (conv.confidence >= 70 ? tokens.colors.semantic.warning : tokens.colors.semantic.error);
        row.appendChild(createStatusPill(`${conv.confidence}%`, confBg, confClr, tokens));
        const statusBg = conv.status === "AI Replied" ? "#D1FAE5" : (conv.status === "In Queue" ? "#DBEAFE" : "#FEF3C7");
        const statusClr = conv.status === "AI Replied" ? tokens.colors.semantic.success : (conv.status === "In Queue" ? tokens.colors.semantic.info : tokens.colors.semantic.warning);
        row.appendChild(createStatusPill(conv.status, statusBg, statusClr, tokens));
        row.appendChild(createTokenText(conv.time, tokens, "caption", "regular", tokens.colors.neutral["500"]));
        card.appendChild(row);
    }
    return card;
}
function createAiQualitySection(tokens) {
    // 700 + 16 gap + 440 = 1156px
    const card = figma.createFrame();
    card.name = "AI Reply Quality";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(440, 232);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    card.clipsContent = true;
    applyShadow(card, tokens, "cardSubtle");
    const sectionHeader = createRow("section header", spacing(tokens, 2));
    sectionHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
    const heading = createTokenText("AI Reply Quality", tokens, "label", "bold", tokens.colors.neutral["900"]);
    heading.layoutGrow = 1;
    sectionHeader.appendChild(heading);
    sectionHeader.appendChild(createStatusPill("82% high", "#D1FAE5", tokens.colors.semantic.success, tokens));
    card.appendChild(sectionHeader);
    const summaryText = createTokenText("today · ↑ 6% vs yesterday", tokens, "caption", "regular", tokens.colors.neutral["500"]);
    summaryText.layoutAlign = "STRETCH";
    card.appendChild(summaryText);
    const bands = [
        { label: "High confidence ≥90%", count: "580", pct: 0.81, color: tokens.colors.semantic.success },
        { label: "Medium confidence 70–89%", count: "320", pct: 0.45, color: tokens.colors.semantic.warning },
        { label: "Low confidence <70%", count: "131", pct: 0.18, color: tokens.colors.semantic.error }
    ];
    for (const band of bands) {
        const bandRow = figma.createFrame();
        bandRow.name = band.label;
        bandRow.layoutMode = "VERTICAL";
        bandRow.primaryAxisSizingMode = "AUTO";
        bandRow.counterAxisSizingMode = "FIXED";
        bandRow.layoutAlign = "STRETCH";
        bandRow.fills = [];
        bandRow.itemSpacing = spacing(tokens, 1);
        const labelRow = createRow("label row", spacing(tokens, 2));
        const lbl = createTokenText(band.label, tokens, "caption", "regular", tokens.colors.neutral["700"]);
        lbl.layoutGrow = 1;
        labelRow.appendChild(lbl);
        labelRow.appendChild(createTokenText(band.count, tokens, "caption", "bold", tokens.colors.neutral["900"]));
        bandRow.appendChild(labelRow);
        const barTrack = figma.createFrame();
        barTrack.name = "bar track";
        barTrack.layoutMode = "HORIZONTAL";
        barTrack.primaryAxisSizingMode = "FIXED";
        barTrack.counterAxisSizingMode = "FIXED";
        barTrack.resize(392, 10);
        barTrack.cornerRadius = 999;
        barTrack.fills = [solid(tokens.colors.neutral["200"])];
        barTrack.clipsContent = true;
        const barFill = figma.createFrame();
        barFill.name = "fill";
        barFill.resize(Math.max(8, Math.round(392 * band.pct)), 10);
        barFill.fills = [solid(band.color)];
        barTrack.appendChild(barFill);
        bandRow.appendChild(barTrack);
        card.appendChild(bandRow);
    }
    return card;
}
function createConversationBottomRow(tokens) {
    // 560px + 16px gap + 580px = 1156px
    const row = createHorizontalGroup([
        createHandoffQueueSection(tokens),
        createSyncStatusSection(tokens)
    ], spacing(tokens, 3));
    row.name = "Bottom Row";
    return row;
}
function createHandoffQueueSection(tokens) {
    const card = figma.createFrame();
    card.name = "Handoff Queue";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(560, 190);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.semantic.warning)];
    card.strokeWeight = 1;
    card.clipsContent = true;
    applyShadow(card, tokens, "cardSubtle");
    const headerRow = createRow("header", spacing(tokens, 2));
    headerRow.counterAxisAlignItems = "CENTER";
    const heading = createTokenText("Handoff Queue", tokens, "label", "bold", tokens.colors.neutral["900"]);
    heading.layoutGrow = 1;
    headerRow.appendChild(heading);
    headerRow.appendChild(createStatusPill("3 waiting", "#FEF3C7", tokens.colors.semantic.warning, tokens));
    card.appendChild(headerRow);
    const queueItems = [
        { handle: "@john_b", reason: "Low confidence", wait: "4m", priority: "high" },
        { handle: "@petra.r", reason: "Human requested", wait: "12m", priority: "medium" },
        { handle: "@shop.daily", reason: "Unknown intent", wait: "28m", priority: "medium" }
    ];
    const avatarBgs = [tokens.colors.semantic.error, tokens.colors.semantic.warning, tokens.colors.semantic.info];
    for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        const row = createRow("queue item", spacing(tokens, 2));
        row.counterAxisAlignItems = "CENTER";
        const priorityDot = figma.createEllipse();
        priorityDot.resize(8, 8);
        priorityDot.fills = [solid(item.priority === "high" ? tokens.colors.semantic.error : tokens.colors.semantic.warning)];
        row.appendChild(priorityDot);
        row.appendChild(createInitialsAvatar(item.handle, avatarBgs[i % avatarBgs.length], tokens));
        const userText = createTokenText(item.handle, tokens, "caption", "bold", tokens.colors.neutral["900"]);
        userText.resize(90, userText.height);
        row.appendChild(userText);
        const reasonTag = createStatusPill(item.reason, tokens.colors.neutral["50"], tokens.colors.neutral["700"], tokens);
        reasonTag.strokes = [solid(tokens.colors.neutral["200"])];
        reasonTag.strokeWeight = 1;
        reasonTag.layoutGrow = 1;
        row.appendChild(reasonTag);
        row.appendChild(createTokenText(item.wait, tokens, "caption", "regular", tokens.colors.neutral["500"]));
        row.appendChild(createTokenText("Handle →", tokens, "caption", "regular", tokens.colors.semantic.info));
        card.appendChild(row);
    }
    return card;
}
function createSyncStatusSection(tokens) {
    const card = figma.createFrame();
    card.name = "Sync Status";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(580, 190);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    const headerRow = createRow("header", spacing(tokens, 2));
    headerRow.counterAxisAlignItems = "CENTER";
    const heading = createTokenText("Sync Status", tokens, "label", "bold", tokens.colors.neutral["900"]);
    heading.layoutGrow = 1;
    headerRow.appendChild(heading);
    headerRow.appendChild(createStatusPill("All systems operational", "#D1FAE5", tokens.colors.semantic.success, tokens));
    card.appendChild(headerRow);
    const statuses = [
        { label: "Instagram API", detail: "Webhooks active", value: "Connected · 99.9%", ok: true },
        { label: "n8n Webhook", detail: "Last event 2s ago", value: "Active", ok: true },
        { label: "AI Model", detail: "GPT-4o · avg 1.2s", value: "Operational", ok: true },
        { label: "Last Sync", detail: "All queues flushed", value: "Just now", ok: true }
    ];
    for (const s of statuses) {
        const row = createRow("status row", spacing(tokens, 2));
        row.counterAxisAlignItems = "CENTER";
        const dot = figma.createEllipse();
        dot.resize(10, 10);
        dot.fills = [solid(s.ok ? tokens.colors.semantic.success : tokens.colors.semantic.error)];
        row.appendChild(dot);
        const labelCol = figma.createFrame();
        labelCol.name = s.label;
        labelCol.layoutMode = "VERTICAL";
        labelCol.primaryAxisSizingMode = "AUTO";
        labelCol.counterAxisSizingMode = "FIXED";
        labelCol.resize(180, 32);
        labelCol.fills = [];
        labelCol.itemSpacing = 1;
        labelCol.layoutGrow = 1;
        labelCol.appendChild(createTokenText(s.label, tokens, "caption", "bold", tokens.colors.neutral["900"]));
        labelCol.appendChild(createTokenText(s.detail, tokens, "caption", "regular", tokens.colors.neutral["500"]));
        row.appendChild(labelCol);
        row.appendChild(createTokenText(s.value, tokens, "caption", "bold", s.ok ? tokens.colors.semantic.success : tokens.colors.semantic.error));
        card.appendChild(row);
    }
    return card;
}
function createStatePreviewsRow(tokens) {
    // 3 × 374px + 2 × 16px gap ≈ 1156px inner width
    const row = createHorizontalGroup([
        createLoadingStateCard(tokens),
        createEmptyStateCard(tokens),
        createErrorStateCard(tokens)
    ], spacing(tokens, 3));
    row.name = "State Variations";
    return row;
}
function createLoadingStateCard(tokens) {
    const card = figma.createFrame();
    card.name = "Loading State";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(374, 130);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "cardSubtle");
    card.appendChild(createTokenText("Loading…", tokens, "caption", "bold", tokens.colors.neutral["500"]));
    for (const w of [330, 260, 300]) {
        const bar = figma.createFrame();
        bar.name = "skeleton bar";
        bar.resize(w, 10);
        bar.cornerRadius = 999;
        bar.fills = [solid(tokens.colors.neutral["200"])];
        card.appendChild(bar);
    }
    return card;
}
function createEmptyStateCard(tokens) {
    const card = figma.createFrame();
    card.name = "Empty State";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(374, 130);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.primaryAxisAlignItems = "CENTER";
    card.counterAxisAlignItems = "CENTER";
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid(tokens.colors.neutral["50"])];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    const iconCircle = figma.createFrame();
    iconCircle.name = "icon placeholder";
    iconCircle.resize(32, 32);
    iconCircle.cornerRadius = 999;
    iconCircle.fills = [solid(tokens.colors.neutral["200"])];
    card.appendChild(iconCircle);
    card.appendChild(createTokenText("No conversations yet", tokens, "label", "bold", tokens.colors.neutral["700"]));
    card.appendChild(createTokenText("Start a campaign to see data here.", tokens, "caption", "regular", tokens.colors.neutral["500"]));
    return card;
}
function createErrorStateCard(tokens) {
    const card = figma.createFrame();
    card.name = "Error State";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "FIXED";
    card.counterAxisSizingMode = "FIXED";
    card.resize(374, 130);
    card.paddingTop = spacing(tokens, 3);
    card.paddingBottom = spacing(tokens, 3);
    card.paddingLeft = spacing(tokens, 3);
    card.paddingRight = spacing(tokens, 3);
    card.itemSpacing = spacing(tokens, 2);
    card.primaryAxisAlignItems = "CENTER";
    card.counterAxisAlignItems = "CENTER";
    card.cornerRadius = tokens.radius.md;
    card.fills = [solid("#FFF5F5")];
    card.strokes = [solid(tokens.colors.semantic.error)];
    card.strokeWeight = 1;
    const iconCircle = figma.createFrame();
    iconCircle.name = "error icon placeholder";
    iconCircle.resize(32, 32);
    iconCircle.cornerRadius = 999;
    iconCircle.fills = [solid("#FEE2E2")];
    card.appendChild(iconCircle);
    card.appendChild(createTokenText("Failed to load", tokens, "label", "bold", tokens.colors.semantic.error));
    card.appendChild(createTokenText("Check your connection and retry.", tokens, "caption", "regular", tokens.colors.neutral["500"]));
    card.appendChild(createTokenText("→ Retry", tokens, "caption", "regular", tokens.colors.semantic.info));
    return card;
}
function createStatusPill(text, bgHex, textHex, tokens) {
    const pill = figma.createFrame();
    pill.name = text;
    pill.layoutMode = "HORIZONTAL";
    pill.primaryAxisSizingMode = "AUTO";
    pill.counterAxisSizingMode = "AUTO";
    pill.paddingTop = 2;
    pill.paddingBottom = 2;
    pill.paddingLeft = spacing(tokens, 2);
    pill.paddingRight = spacing(tokens, 2);
    pill.cornerRadius = 999;
    pill.fills = [solid(bgHex)];
    pill.appendChild(createTokenText(text, tokens, "caption", "bold", textHex));
    return pill;
}
function createInitialsAvatar(handle, bgHex, tokens) {
    const avatar = figma.createFrame();
    avatar.name = "avatar";
    avatar.layoutMode = "HORIZONTAL";
    avatar.primaryAxisSizingMode = "FIXED";
    avatar.counterAxisSizingMode = "FIXED";
    avatar.resize(28, 28);
    avatar.cornerRadius = 999;
    avatar.fills = [solid(bgHex)];
    avatar.primaryAxisAlignItems = "CENTER";
    avatar.counterAxisAlignItems = "CENTER";
    avatar.appendChild(createTokenText(handle.replace("@", "").slice(0, 2).toUpperCase(), tokens, "caption", "bold", "#FFFFFF"));
    return avatar;
}
function createOnboardingDraft(job, tokens) {
    const issueKey = textOrFallback(job.issueKey, "No issue key");
    const briefTitle = textOrFallback(job.briefTitle, "Untitled onboarding job");
    const frame = figma.createFrame();
    frame.name = `AI Onboarding - ${issueKey} - ${briefTitle}`;
    frame.resize(1440, 900);
    frame.fills = [solid(tokens.colors.neutral["50"])];
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.itemSpacing = spacing(tokens, 4);
    frame.paddingTop = spacing(tokens, 6);
    frame.paddingBottom = spacing(tokens, 6);
    frame.paddingLeft = spacing(tokens, 6);
    frame.paddingRight = spacing(tokens, 6);
    frame.appendChild(createOnboardingStepper(tokens));
    frame.appendChild(createOnboardingCard(job, tokens));
    const position = findNextFramePosition();
    figma.currentPage.appendChild(frame);
    frame.x = position.x;
    frame.y = position.y;
    return frame;
}
function createOnboardingStepper(tokens) {
    const stepper = createRow("Progress stepper", spacing(tokens, 2));
    stepper.counterAxisAlignItems = "CENTER";
    const stepLabels = ["Account", "Profile", "Connect", "Done"];
    for (let i = 0; i < stepLabels.length; i++) {
        const dot = figma.createEllipse();
        dot.name = `Step ${i + 1}`;
        dot.resize(28, 28);
        dot.fills = [solid(i === 0 ? tokens.colors.semantic.info : (i < 1 ? tokens.colors.semantic.success : tokens.colors.neutral["200"]))];
        const stepGroup = createRow(`Step ${i + 1} group`, spacing(tokens, 1));
        stepGroup.counterAxisAlignItems = "CENTER";
        stepGroup.appendChild(dot);
        stepGroup.appendChild(createTokenText(stepLabels[i], tokens, "caption", i === 0 ? "bold" : "regular", i === 0 ? tokens.colors.neutral["900"] : tokens.colors.neutral["500"]));
        stepper.appendChild(stepGroup);
        if (i < stepLabels.length - 1) {
            const connector = figma.createFrame();
            connector.name = "Connector";
            connector.resize(48, 2);
            connector.fills = [solid(tokens.colors.neutral["200"])];
            stepper.appendChild(connector);
        }
    }
    return stepper;
}
function createOnboardingCard(job, tokens) {
    const card = figma.createFrame();
    card.name = "Onboarding card";
    card.layoutMode = "VERTICAL";
    card.primaryAxisSizingMode = "AUTO";
    card.counterAxisSizingMode = "FIXED";
    card.resize(560, 500);
    card.paddingTop = spacing(tokens, 6);
    card.paddingBottom = spacing(tokens, 6);
    card.paddingLeft = spacing(tokens, 6);
    card.paddingRight = spacing(tokens, 6);
    card.itemSpacing = spacing(tokens, 4);
    card.cornerRadius = tokens.radius.lg;
    card.fills = [solid("#FFFFFF")];
    card.strokes = [solid(tokens.colors.neutral["200"])];
    card.strokeWeight = 1;
    applyShadow(card, tokens, "overlaySubtle");
    const badge = createModeBadge("Onboarding", tokens);
    card.appendChild(badge);
    const heading = createTokenText(textOrFallback(job.briefTitle, "Welcome — let's get you set up"), tokens, "h1", "bold", tokens.colors.neutral["900"]);
    heading.layoutAlign = "STRETCH";
    card.appendChild(heading);
    const description = createTokenText(truncateText(textOrFallback(job.objective, "Complete a few quick steps to activate your account."), 160), tokens, "body", "regular", tokens.colors.neutral["700"]);
    description.layoutAlign = "STRETCH";
    description.lineHeight = { value: 28, unit: "PIXELS" };
    card.appendChild(description);
    card.appendChild(createOnboardingFields(tokens));
    card.appendChild(createPrimaryButton("Continue", tokens));
    const skip = createTokenText("Skip for now", tokens, "label", "regular", tokens.colors.neutral["500"]);
    skip.textAlignHorizontal = "CENTER";
    card.appendChild(skip);
    if (job.uxNotes || job.acceptanceCriteria) {
        card.appendChild(createNoteCard(truncateText(textOrFallback(job.uxNotes || job.acceptanceCriteria, ""), 200), tokens));
    }
    return card;
}
function createOnboardingFields(tokens) {
    const fields = figma.createFrame();
    fields.name = "Form fields";
    fields.layoutMode = "VERTICAL";
    fields.primaryAxisSizingMode = "AUTO";
    fields.counterAxisSizingMode = "FIXED";
    fields.layoutAlign = "STRETCH";
    fields.fills = [];
    fields.itemSpacing = spacing(tokens, 2);
    const fieldLabels = ["Business name", "Instagram handle"];
    for (const label of fieldLabels) {
        const wrapper = figma.createFrame();
        wrapper.name = label;
        wrapper.layoutMode = "VERTICAL";
        wrapper.primaryAxisSizingMode = "AUTO";
        wrapper.counterAxisSizingMode = "FIXED";
        wrapper.layoutAlign = "STRETCH";
        wrapper.fills = [];
        wrapper.itemSpacing = spacing(tokens, 1);
        wrapper.appendChild(createTokenText(label, tokens, "label", "bold", tokens.colors.neutral["700"]));
        const input = figma.createFrame();
        input.name = `${label} input`;
        input.layoutMode = "HORIZONTAL";
        input.primaryAxisSizingMode = "FIXED";
        input.counterAxisSizingMode = "FIXED";
        input.layoutAlign = "STRETCH";
        input.resize(464, 40);
        input.paddingTop = spacing(tokens, 2);
        input.paddingBottom = spacing(tokens, 2);
        input.paddingLeft = spacing(tokens, 3);
        input.paddingRight = spacing(tokens, 3);
        input.counterAxisAlignItems = "CENTER";
        input.cornerRadius = tokens.radius.sm;
        input.fills = [solid("#FFFFFF")];
        input.strokes = [solid(tokens.colors.neutral["200"])];
        input.strokeWeight = 1;
        input.appendChild(createTokenText(`Enter your ${label.toLowerCase()}`, tokens, "body", "regular", tokens.colors.neutral["500"]));
        wrapper.appendChild(input);
        fields.appendChild(wrapper);
    }
    return fields;
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
function jobSearchText(job) {
    return [
        job.briefTitle,
        job.objective,
        job.figmaInstruction,
        job.requiredSections,
        job.acceptanceCriteria
    ].join(" ").toLowerCase();
}
function matchesKeywords(text, keywords) {
    for (const keyword of keywords) {
        if (text.indexOf(keyword) >= 0) {
            return true;
        }
    }
    return false;
}
function isDesignSystemJob(job) {
    const titleText = String(job.briefTitle || job.title || "").toLowerCase();
    const objectiveText = String(job.objective || "").toLowerCase();
    const combinedText = [
        job.issueKey,
        job.briefTitle,
        job.title,
        job.objective,
        job.figmaInstruction,
        job.requiredSections,
        job.acceptanceCriteria,
        job.targetUser
    ].join(" ").toLowerCase();
    const hardScreenIndicators = [
        "screen draft",
        "screen scaffold",
        "product screen",
        "dashboard",
        "dashboard overview",
        "conversation dashboard",
        "onboarding screen",
        "settings screen",
        "pricing screen"
    ];
    const hardDesignSystemTitleIndicators = [
        "create design system",
        "build design system",
        "define design system",
        "design system foundation",
        "design system scaffold",
        "initial figma design system rules",
        "design system rules"
    ];
    const hardScreenMatches = hardScreenIndicators.filter(k => titleText.indexOf(k) >= 0);
    const hardDsTitleMatches = hardDesignSystemTitleIndicators.filter(k => titleText.indexOf(k) >= 0);
    console.log(`[DS] titleText: "${titleText}"`);
    console.log(`[DS] objectiveText: "${objectiveText}"`);
    console.log(`[DS] hardScreenMatches: ${JSON.stringify(hardScreenMatches)}`);
    console.log(`[DS] hardDesignSystemTitleMatches: ${JSON.stringify(hardDsTitleMatches)}`);
    if (hardScreenMatches.length > 0 && hardDsTitleMatches.length === 0) {
        console.log("[DS] final mode: Screen Draft (hard screen override matched)");
        return false;
    }
    if (objectiveText.indexOf("product screen draft") >= 0 ||
        objectiveText.indexOf("dashboard screen") >= 0 ||
        objectiveText.indexOf("dashboard overview") >= 0) {
        console.log("[DS] final mode: Screen Draft (objective screen override matched)");
        return false;
    }
    const explicitMatches = designSystemExplicitKeywords.filter(k => combinedText.indexOf(k) >= 0);
    const sectionMatches = designSystemSectionKeywords.filter(k => combinedText.indexOf(k) >= 0);
    const screenMatches = screenDraftNegativeKeywords.filter(k => combinedText.indexOf(k) >= 0);
    console.log(`[DS] positive DS indicators matched: ${JSON.stringify(explicitMatches)}`);
    console.log(`[DS] DS section count: ${sectionMatches.length} (${JSON.stringify(sectionMatches)})`);
    const hasExplicitIntent = explicitMatches.length > 0;
    const hasManySections = sectionMatches.length >= 4;
    const hasScreenSignal = screenMatches.length > 0;
    const result = (hasExplicitIntent || hasManySections) && !hasScreenSignal;
    console.log(`[DS] final mode: ${result ? "Design System" : "Screen Draft"}`);
    return result;
}
function isDashboardJob(job) {
    return matchesKeywords(jobSearchText(job), dashboardKeywords);
}
function isOnboardingJob(job) {
    return matchesKeywords(jobSearchText(job), onboardingKeywords);
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
function normalizeJob(job) {
    const dp = job.designPlan;
    if (!dp)
        return job;
    const str = (v) => {
        if (typeof v === "string" && v.trim().length > 0)
            return v.trim();
        return undefined;
    };
    const arrStr = (v) => {
        if (Array.isArray(v)) {
            const joined = v.filter((x) => typeof x === "string").join(", ");
            return joined.length > 0 ? joined : undefined;
        }
        return str(v);
    };
    return {
        ...job,
        briefTitle: job.briefTitle || str(dp.briefTitle),
        objective: job.objective || str(dp.objective),
        targetUser: job.targetUser || str(dp.targetUser),
        figmaInstruction: job.figmaInstruction || str(dp.figmaInstruction),
        requiredSections: job.requiredSections || arrStr(dp.requiredSections),
        requiredStates: job.requiredStates || arrStr(dp.requiredStates)
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
