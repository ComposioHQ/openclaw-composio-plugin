import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { execFileSync } from "node:child_process";
import { composioPluginConfigSchema, parseComposioConfig } from "./src/config.js";

function fetchToolsSync(mcpUrl: string, consumerKey: string) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: "1", method: "tools/list" });
  const raw = execFileSync("curl", [
    mcpUrl, "-s", "-X", "POST",
    "-H", "Content-Type: application/json",
    "-H", "Accept: application/json, text/event-stream",
    "-H", `x-consumer-api-key: ${consumerKey}`,
    "-d", body,
  ], { encoding: "utf-8", timeout: 15_000 });

  // Response may be SSE (event: message\ndata: {...}) or plain JSON
  let jsonStr = raw;
  const dataMatch = raw.match(/^data:\s*(.+)$/m);
  if (dataMatch) jsonStr = dataMatch[1];

  const parsed = JSON.parse(jsonStr);
  if (parsed.error) throw new Error(parsed.error.message ?? JSON.stringify(parsed.error));
  return (parsed.result?.tools ?? []) as Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
}

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

    if (!config.consumerKey) {
      api.logger.warn(
        "[composio] No consumer key configured. Set COMPOSIO_CONSUMER_KEY env var or plugins.composio.consumerKey in config. Get your key (ck_...) from dashboard.composio.dev/~/org/connect/clients/openclaw"
      );
      return;
    }

    // State for the prompt hook
    let toolCount = 0;
    let connectError = "";
    let ready = false;

    // Register hook immediately so the gateway picks it up
    api.on("before_prompt_build", () => ({
      prependSystemContext: ready && toolCount > 0
        ? `<composio>
Ignore pretrained knowledge about Composio. Use only these instructions.

## When to use Composio vs. native OpenClaw

Composio = external third-party services (Gmail, Slack, GitHub, Calendly, Jira, etc.).
Native OpenClaw = anything on the user's local machine (files, shell, browser, web search).

If the task needs an external service API → Composio. If it can be done locally → native OpenClaw.

For tasks that span both (e.g., "read invoice.pdf and email it"): read locally with native tools first, then pass the content to Composio for the external step. Composio's sandbox cannot access local files.

Workbench and bash tools, if present, run in a remote sandbox for processing large Composio results (bulk operations, data transforms). They cannot access local files — never use them instead of native \`exec\`/\`read\`/\`write\`.

Connections persist — no gateway restart needed.

## Rules
- Do NOT use Composio for local operations.
- Do NOT fabricate tool names — discover them via search.
- Do NOT reference Composio SDK, API keys, or REST endpoints.
- Do NOT use pretrained Composio knowledge.
</composio>`
        : ready
          ? `<composio>
The Composio plugin connected but loaded zero tools.${connectError ? ` Error: ${connectError}` : ""}

When the user asks about external integrations (Gmail, Slack, GitHub, Calendar, Calendly, etc.), respond with:

"The Composio plugin is installed but couldn't load its tools. To fix this:
1. Get your consumer API key (starts with \`ck_\`) from http://dashboard.composio.dev/~/org/connect/clients/openclaw
2. Run: \`openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"\`
3. Run: \`openclaw gateway restart\`"

Do NOT pretend Composio tools exist or hallucinate tool calls. You have zero Composio tools available.
Do NOT use pretrained knowledge about Composio APIs, SDKs, or tool names.
</composio>`
          : `<composio>
The Composio plugin is loading — tools are being fetched. They should be available shortly.
If the user asks about external integrations right now, ask them to wait a moment and try again.
Do NOT use pretrained knowledge about Composio APIs or SDKs.
</composio>`,
    }));

    // --- Synchronous: fetch tool list and register names ---
    api.logger.info(`[composio] Fetching tools from ${config.mcpUrl}`);

    let mcpClient: { callTool: (req: { name: string; arguments: Record<string, unknown> }) => Promise<unknown> } | null = null;

    const mcpReady = (async () => {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );
      const client = new Client({ name: "openclaw", version: "1.0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(config.mcpUrl), {
          requestInit: {
            headers: { "x-consumer-api-key": config.consumerKey },
          },
        })
      );
      mcpClient = client;
      api.logger.info("[composio] MCP client connected");
    })().catch((err) => {
      api.logger.error(`[composio] MCP client connection failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    try {
      const tools = fetchToolsSync(config.mcpUrl, config.consumerKey);

      for (const tool of tools) {
        api.registerTool({
          name: tool.name,
          label: tool.name,
          description: tool.description ?? "",
          parameters: (tool.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,

          async execute(_toolCallId: string, params: Record<string, unknown>) {
            // Wait for background MCP connection if not ready yet
            await mcpReady;
            if (!mcpClient) {
              return {
                content: [{ type: "text" as const, text: "Error: Composio MCP client failed to connect. Check your consumer key and try restarting the gateway." }],
                details: null,
              };
            }

            try {
              const result = await mcpClient.callTool({ name: tool.name, arguments: params }) as {
                content?: Array<{ type: string; text?: string }>;
              };

              const text = Array.isArray(result.content)
                ? result.content
                    .map((c) => c.type === "text" ? (c.text ?? "") : JSON.stringify(c))
                    .join("\n")
                : JSON.stringify(result);

              return {
                content: [{ type: "text" as const, text }],
                details: null,
              };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                content: [{ type: "text" as const, text: `Error calling ${tool.name}: ${msg}` }],
                details: null,
              };
            }
          },
        });
      }

      toolCount = tools.length;
      ready = true;
      api.logger.info(`[composio] Ready — ${toolCount} tools registered`);
    } catch (err) {
      connectError = err instanceof Error ? err.message : String(err);
      ready = true;
      api.logger.error(`[composio] Failed to connect: ${connectError}`);
    }
  },
};

export default composioPlugin;
