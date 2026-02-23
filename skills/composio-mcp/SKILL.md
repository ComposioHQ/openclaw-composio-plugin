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

Requests must include a `x-composio-api-key` header (or `COMPOSIO_API_KEY` env var).

## How to configure in OpenClaw

Add the Composio MCP server under `mcpServers` in your agent config:

```json
{
  "mcpServers": {
    "composio": {
      "url": "https://connect.composio.dev/mcp",
      "headers": {
        "x-composio-api-key": "<your-composio-api-key>"
      }
    }
  }
}
```

Get your API key from https://platform.composio.dev/settings.

## What the agent can do

Once connected, the agent can:

- Search for tools by describing a task (e.g. "send an email", "create a GitHub issue")
- Execute any tool for connected accounts (OAuth or API key)
- Manage connections to toolkits (connect, disconnect, check status)

## References

- [Composio Tool Router Docs](https://docs.composio.dev/tool-router/overview)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Composio Platform](https://platform.composio.dev)
