---
name: composio-mcp
description: Use https://connect.composio.dev/mcp as an MCP server to give agents access to 1000+ tools via Composio Tool Router
metadata: { "openclaw": { "emoji": "🔌", "homepage": "https://docs.composio.dev/tool-router/overview" } }
---

# Composio MCP Server

The Composio MCP server at `https://connect.composio.dev/mcp` exposes 200+ external tools (Gmail, Slack, GitHub, Notion, Linear, Jira, etc.) via the Model Context Protocol.

## MCP Server URL

```
https://connect.composio.dev/mcp
```

## Authentication

Requests must include a `x-consumer-api-key` header with your **consumer API key**.

> ⚠️ This is **not** the same as your standard Composio API key (`ak_...`) used for the Tool Router SDK.
> Get your consumer API key from [dashboard.composio.dev/settings](https://dashboard.composio.dev/settings) — it starts with `ck_`.

Example header:
```
x-consumer-api-key: ck_your_consumer_key_here
```

## Setup Flow

1. Install the plugin: `openclaw plugins install @composio/openclaw-plugin`
2. Log in at [dashboard.composio.dev](https://dashboard.composio.dev)
3. Go to Settings and copy your consumer API key (starts with `ck_`)
4. Configure the key:
   ```bash
   openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"
   ```
5. Allow Composio tools (works with any tool profile):
   ```bash
   openclaw config set tools.alsoAllow '["composio"]'
   ```
6. Restart the gateway:
   ```bash
   openclaw gateway restart
   ```

## How it works

The plugin connects to the Composio MCP server during startup, fetches all available tools, and registers them directly into the agent. No manual MCP config is needed — the plugin handles the connection internally.

Once loaded, tools are callable by name. The agent does not need to search or discover tools at runtime.

## What the agent can do

Once connected, the agent can:

- Call any registered Composio tool directly by name
- Execute tools for connected accounts (OAuth or API key)
- If a tool returns an auth error, direct the user to connect that app at [dashboard.composio.dev](https://dashboard.composio.dev)

## References

- [Composio Docs](https://docs.composio.dev/docs/quickstart)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Composio Platform](https://platform.composio.dev)
- [Composio Dashboard](https://dashboard.composio.dev)
