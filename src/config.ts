import { z } from "zod";
import type { ComposioConfig } from "./types.js";

export const ComposioConfigSchema = z.object({
  enabled: z.boolean().default(true),
  consumerKey: z.string().default(""),
  mcpUrl: z.string().default("https://connect.composio.dev/mcp"),
});

export function parseComposioConfig(value: unknown): ComposioConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const configObj = raw.config as Record<string, unknown> | undefined;

  const consumerKey =
    (typeof configObj?.consumerKey === "string" && configObj.consumerKey.trim()) ||
    (typeof raw.consumerKey === "string" && raw.consumerKey.trim()) ||
    process.env.COMPOSIO_CONSUMER_KEY ||
    "";

  const mcpUrl =
    (typeof configObj?.mcpUrl === "string" && configObj.mcpUrl.trim()) ||
    (typeof raw.mcpUrl === "string" && raw.mcpUrl.trim()) ||
    "https://connect.composio.dev/mcp";

  return ComposioConfigSchema.parse({ ...raw, consumerKey, mcpUrl });
}

export const composioPluginConfigSchema = {
  parse: parseComposioConfig,
  uiHints: {
    enabled: {
      label: "Enable Composio",
      help: "Enable or disable the Composio integration",
    },
    consumerKey: {
      label: "Consumer Key",
      help: "Your Composio consumer key (ck_...) from dashboard.composio.dev/settings",
      sensitive: true,
    },
    mcpUrl: {
      label: "MCP Server URL",
      help: "Composio MCP server URL (default: https://connect.composio.dev/mcp)",
      advanced: true,
    },
  },
};
