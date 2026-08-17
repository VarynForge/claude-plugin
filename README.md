# VarynForge plugin for Claude

Keyword research and draft checking, done properly inside your agent — plus a live connection to the VarynForge MCP server for the parts inference alone cannot do.

## Install

```
/plugin marketplace add VarynForge/claude-plugin
/plugin install varynforge@varynforge
```

## What's inside

| Skill | What it does |
| --- | --- |
| `draft-check` | Craft check for any draft — reviews an article against a versioned publishing rubric (structure, headings, metadata, content depth, images, links, citations), entirely in the conversation. |
| `keyword-research` | Manual keyword research, end to end — coverage-first mapping of one niche into clustered, intent-labeled candidate queries, honestly labeled as inferred and unvalidated. |
| `connect` | Points your agent at the server-hosted setup instructions for the bundled MCP connection. |

The plugin also registers the `varynforge` MCP server (`app.varynforge.com`), which adds live research — validated keywords, competitor mapping, content briefs — when you choose to sign in. The skills work without it.

## Free means free

The `draft-check` and `keyword-research` skills run entirely on your agent's model: no account, no telemetry, no usage cap.

## Disclosures

- The bundled MCP server URL carries `?via=plugin`, a static marker that lets us tell plugin installs apart from other connections.
- When your agent host first uses the server it performs an anonymous handshake to enumerate available tools; that request appears in our server logs like any other — the skills themselves make no network calls.

## Issues

File anything — bugs, rough edges, missing pieces. Every issue lands on our weekly review scorecard; for this plugin, complaints are the signal we build from.
