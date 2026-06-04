import { readFile } from "fs/promises";
import path from "path";

const requiredTokenGroups = [
  "colors",
  "typography",
  "spacing",
  "radius",
  "shadows",
  "components",
  "states",
  "figmaNaming",
  "aiUsageRules"
];

export class TokenRegistryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenRegistryValidationError";
  }
}

export const getDesignTokens = async (): Promise<unknown> => {
  const tokenPath = path.join(process.cwd(), "design-system", "tokens.json");
  const rawTokens = await readFile(tokenPath, "utf8");
  const tokens = JSON.parse(rawTokens) as unknown;

  validateTokenRegistry(tokens);

  return tokens;
};

const validateTokenRegistry = (tokens: unknown): void => {
  if (!isObjectRecord(tokens)) {
    throw new TokenRegistryValidationError("Design token registry must be a JSON object.");
  }

  const missingGroups = requiredTokenGroups.filter((group) => !(group in tokens));

  if (missingGroups.length > 0) {
    throw new TokenRegistryValidationError(
      `Design token registry is missing required top-level group(s): ${missingGroups.join(", ")}.`
    );
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
