import { z } from "zod";
import type { ComposioConfig } from "./types.js";

export const ComposioConfigSchema = z.object({
  enabled: z.boolean().default(true),
  consumerKey: z.string().default(""),
  apiKey: z.string().default(""),
  mcpUrl: z.string().default("https://connect.composio.dev/mcp"),
  userId: z.string().default(""),
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

  const apiKey =
    (typeof configObj?.apiKey === "string" && configObj.apiKey.trim()) ||
    (typeof raw.apiKey === "string" && raw.apiKey.trim()) ||
    process.env.COMPOSIO_API_KEY ||
    "";

  const mcpUrl =
    (typeof configObj?.mcpUrl === "string" && configObj.mcpUrl.trim()) ||
    (typeof raw.mcpUrl === "string" && raw.mcpUrl.trim()) ||
    process.env.COMPOSIO_MCP_URL ||
    "https://connect.composio.dev/mcp";

  const userId =
    (typeof configObj?.userId === "string" && configObj.userId.trim()) ||
    (typeof raw.userId === "string" && raw.userId.trim()) ||
    process.env.COMPOSIO_USER_ID ||
    "";

  return ComposioConfigSchema.parse({ ...raw, consumerKey, apiKey, mcpUrl, userId });
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
      help: "Your Composio consumer key (ck_...) from dashboard.composio.dev/settings. Used with the default connect.composio.dev endpoint.",
      sensitive: true,
    },
    apiKey: {
      label: "API Key",
      help: "Your Composio API key (ak_...) for the backend API. Use this instead of consumerKey for per-user tool router sessions.",
      sensitive: true,
    },
    mcpUrl: {
      label: "MCP Server URL",
      help: "Composio MCP server URL. For per-user: use a tool router URL like https://backend.composio.dev/tool_router/trs_XXX/mcp",
      advanced: true,
    },
    userId: {
      label: "User ID",
      help: "Per-user identifier for scoping connected accounts. Appended as ?user_id= when using the backend API with apiKey.",
      advanced: true,
    },
  },
};
