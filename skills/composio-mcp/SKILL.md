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

1. Install the plugin via npm (`@composio/openclaw-plugin`)
2. Log in at [dashboard.composio.dev](https://dashboard.composio.dev)
3. Go to Settings and copy your consumer API key (starts with `ck_`)
4. Add it to your OpenClaw config (see below)

## How to configure in OpenClaw

Add the Composio MCP server under `mcpServers` in your agent config:

```json
{
  "mcpServers": {
    "composio": {
      "url": "https://connect.composio.dev/mcp",
      "headers": {
        "x-consumer-api-key": "ck_your_consumer_key_here"
      }
    }
  }
}
```

## What the agent can do

Once connected, the agent can:

- Search for tools by describing a task (e.g. "send an email", "create a GitHub issue")
- Execute any tool for connected accounts (OAuth or API key)
- Manage connections to toolkits (connect, disconnect, check status)

## References

- [Composio Tool Router Docs](https://docs.composio.dev/tool-router/overview)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Composio Platform](https://platform.composio.dev)
- [Composio Dashboard](https://dashboard.composio.dev)
