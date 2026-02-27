# Composio Plugin for OpenClaw

Access 1000+ third-party tools via Composio MCP — Gmail, Slack, GitHub, Notion, Linear, Jira, HubSpot, Salesforce, Google Drive, and more.

## Install

```bash
openclaw plugins install @composio/openclaw-plugin
```

## Setup

1. Log in at [dashboard.composio.dev](https://dashboard.composio.dev)
2. Choose your preferred client (OpenClaw, Claude Code, Cursor, etc.)
3. Copy your consumer key (`ck_...`)

### Option 1: Environment Variable

```bash
export COMPOSIO_CONSUMER_KEY=ck_your_key_here
```

### Option 2: OpenClaw Config

```bash
openclaw config set plugins.composio.consumerKey "ck_your_key_here"
```

## How It Works

The plugin connects to Composio's MCP server at `https://connect.composio.dev/mcp` and registers all available tools directly into the OpenClaw agent. Tools are called by name — no extra search or execute steps needed.

If a tool returns an auth error, the agent will prompt you to connect that toolkit at [dashboard.composio.dev](https://dashboard.composio.dev).

## Configuration

```json
{
  "plugins": {
    "entries": {
      "composio": {
        "enabled": true,
        "config": {
          "consumerKey": "ck_your_key_here"
        }
      }
    }
  }
}
```

| Option | Description | Default |
|---|---|---|
| `enabled` | Enable or disable the plugin | `true` |
| `consumerKey` | Your Composio consumer key (`ck_...`) | — |
| `mcpUrl` | MCP server URL (advanced) | `https://connect.composio.dev/mcp` |

## Links

- [Composio Documentation](https://docs.composio.dev)
- [Composio Dashboard](https://dashboard.composio.dev)
- [MCP Protocol](https://modelcontextprotocol.io)
