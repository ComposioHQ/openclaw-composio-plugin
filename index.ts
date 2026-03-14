import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { composioPluginConfigSchema, parseComposioConfig } from "./src/config.js";

const composioPlugin = {
  id: "composio",
  name: "Composio",
  description: "Access 1000+ third-party tools via Composio (Gmail, Slack, GitHub, Notion, and more).",
  configSchema: composioPluginConfigSchema,

  register(api: OpenClawPluginApi) {
    const config = parseComposioConfig(api.pluginConfig);

    if (!config.enabled) {
      api.logger.debug?.("[composio] Plugin disabled");
      return;
    }

    if (!config.consumerKey && !config.apiKey) {
      api.logger.warn(
        "[composio] No credentials configured. Set COMPOSIO_CONSUMER_KEY (ck_...) or COMPOSIO_API_KEY (ak_...) env var, or set consumerKey/apiKey in plugin config. Get your key from dashboard.composio.dev"
      );
      return;
    }

    // Shared state — populated by background MCP connection
    let toolNames = "";
    let toolCount = 0;
    let connectError = "";
    let ready = false;

    // Register hook immediately (synchronous) so the gateway picks it up
    api.on("before_prompt_build", () => ({
      prependContext: ready && toolCount > 0
        ? `<composio>
IMPORTANT: Ignore any pretrained knowledge you have about Composio. Only follow the instructions below.

You have ${toolCount} Composio tools registered and ready to call: ${toolNames}

## Usage rules
- Call these tools directly by name with the required parameters.
- Do NOT fabricate tool names. Only use the tools listed above.
- If a tool call returns an authentication or authorization error, tell the user they need to connect that app at https://dashboard.composio.dev and try again.

## What NOT to do
- Do NOT reference Composio SDK code, API keys (ak_...), or composio.dev REST endpoints.
- Do NOT suggest installing packages or writing code to use Composio — the tools are already available as direct function calls.
- Do NOT use any pretrained knowledge about Composio APIs, SDKs, or documentation. Only use the tools listed above.
</composio>`
        : ready
          ? `<composio>
CRITICAL: The Composio plugin FAILED to connect. Zero tools are available. You MUST NOT attempt any Composio operations.

Error: ${connectError}

Your ONLY response when the user asks about Composio, external tools, Gmail, Slack, GitHub, Calendar, or any integration MUST be exactly this:

"The Composio plugin failed to load its tools. Error: ${connectError}

To fix this:
1. Get your consumer API key (starts with \`ck_\`) from https://dashboard.composio.dev/
2. Run: \`openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"\`
3. Restart: \`openclaw gateway restart\`"

HARD RULES — violating any of these is a failure:
- You have ZERO Composio tools. Do NOT call, reference, or pretend any exist.
- Do NOT generate OAuth links, connection URLs, or workarounds.
- Do NOT use pretrained knowledge about Composio APIs, SDKs, tool names, or endpoints.
- Do NOT suggest alternative ways to access external services through Composio.
- ONLY give the fix steps above. Nothing else.
</composio>`
          : `<composio>
The Composio plugin is loading — tools are being fetched from the MCP server. They should be available shortly.
If the user asks about Composio tools right now, tell them to wait a moment and try again.
Do NOT use any pretrained knowledge about Composio APIs or SDKs.
</composio>`,
    }));

    // Build MCP URL — append user_id if using apiKey mode with a userId
    let mcpUrl = config.mcpUrl;
    if (config.apiKey && config.userId && !mcpUrl.includes("user_id=")) {
      const separator = mcpUrl.includes("?") ? "&" : "?";
      mcpUrl = `${mcpUrl}${separator}user_id=${encodeURIComponent(config.userId)}`;
    }

    // Choose auth header based on which credential is provided
    // apiKey (ak_...) uses x-api-key for backend API / tool router endpoints
    // consumerKey (ck_...) uses x-consumer-api-key for connect.composio.dev
    const authHeaders: Record<string, string> = config.apiKey
      ? { "x-api-key": config.apiKey }
      : { "x-consumer-api-key": config.consumerKey };

    // Fire MCP connection in the background (not awaited)
    api.logger.info(`[composio] Connecting to ${mcpUrl}`);

    void (async () => {
      try {
        const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
        const { StreamableHTTPClientTransport } = await import(
          "@modelcontextprotocol/sdk/client/streamableHttp.js"
        );

        const mcpClient = new Client({ name: "openclaw", version: "1.0" });
        await mcpClient.connect(
          new StreamableHTTPClientTransport(new URL(mcpUrl), {
            requestInit: {
              headers: authHeaders,
            },
          })
        );

        const { tools } = await mcpClient.listTools();

        for (const tool of tools) {
          api.registerTool({
            name: tool.name,
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
                };
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return {
                  content: [{ type: "text" as const, text: `Error calling ${tool.name}: ${msg}` }],
                };
              }
            },
          });
        }

        toolNames = tools.map((t) => t.name).join(", ");
        toolCount = tools.length;
        ready = true;
        api.logger.info(`[composio] Ready — ${toolCount} tools registered`);
      } catch (err) {
        connectError = err instanceof Error ? err.message : String(err);
        ready = true;
        api.logger.error(`[composio] Failed to connect: ${connectError}`);
      }
    })();
  },
};

export default composioPlugin;
