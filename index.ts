import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { composioPluginConfigSchema, parseComposioConfig } from "./src/config.js";

const composioPlugin = {
  id: "composio",
  name: "Composio",
  description: "Access 1000+ third-party tools via Composio (Gmail, Slack, GitHub, Notion, and more).",
  configSchema: composioPluginConfigSchema,

  async register(api: OpenClawPluginApi) {
    const config = parseComposioConfig(api.pluginConfig);

    if (!config.enabled) {
      api.logger.debug?.("[composio] Plugin disabled");
      return;
    }

    if (!config.consumerKey) {
      api.logger.warn(
        "[composio] No consumer key configured. Set COMPOSIO_CONSUMER_KEY env var or plugins.composio.consumerKey in config. Get your key (ck_...) from dashboard.composio.dev/settings"
      );
      return;
    }

    api.logger.info(`[composio] Connecting to ${config.mcpUrl}`);

    try {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );

      const mcpClient = new Client({ name: "openclaw", version: "1.0" });
      await mcpClient.connect(
        new StreamableHTTPClientTransport(new URL(config.mcpUrl), {
          requestInit: {
            headers: { "x-consumer-api-key": config.consumerKey },
          },
        })
      );

      const { tools } = await mcpClient.listTools();

      for (const tool of tools) {
        api.registerTool({
          name: tool.name,
          label: tool.name,
          description: tool.description ?? "",
          parameters: (tool.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,

          async execute(_toolCallId: string, params: Record<string, unknown>) {
            try {
              const result = await mcpClient.callTool({ name: tool.name, arguments: params });

              const text = Array.isArray(result.content)
                ? result.content
                    .map((c: { type: string; text?: string }) =>
                      c.type === "text" ? (c.text ?? "") : JSON.stringify(c)
                    )
                    .join("\n")
                : JSON.stringify(result);

              return {
                content: [{ type: "text" as const, text }],
                details: result,
              };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                content: [{ type: "text" as const, text: `Error calling ${tool.name}: ${msg}` }],
                details: { error: msg },
              };
            }
          },
        });
      }

      api.on("before_agent_start", () => ({
        prependContext: `<composio-tools>
You have access to Composio, which provides 1000+ third-party integrations including Gmail, Slack, GitHub, Notion, Linear, Jira, HubSpot, Google Drive, and more.
The tools are already registered — call them directly by name.
If a tool returns an auth error, let the user know they need to connect that toolkit at dashboard.composio.dev.
</composio-tools>`,
      }));

      api.logger.info(`[composio] Ready — ${tools.length} tools registered`);
    } catch (err) {
      api.logger.error(
        `[composio] Failed to connect: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
};

export default composioPlugin;
