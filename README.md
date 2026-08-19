# VarynForge plugin for Claude

Keyword research, draft checking, and internal-link auditing, done properly inside your agent — plus a live connection to the VarynForge MCP server for the parts inference alone cannot do.

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
| `interlink-audit` | Internal-link graph audit for any site or content repo — orphans, dead-ends, link bombs, unresolved links, and similarity-ranked fix suggestions, computed by a bundled dependency-free analyzer. Hosted sites are crawled by your agent only after you confirm the scope; auth-walled and heavily JS-rendered sites are documented limitations, not worked around. |
| `connect` | Points your agent at the server-hosted setup instructions for the bundled MCP connection. |

The plugin also registers the `varynforge` MCP server (`app.varynforge.com`), which adds live research — validated keywords, competitor mapping, content briefs — when you choose to sign in. The skills work without it.

## Free means free

The `draft-check`, `keyword-research`, and `interlink-audit` skills run entirely on your agent's model: no account, no telemetry, no usage cap.

## The one script

This repo is markdown and JSON, with exactly one deliberate exception: `skills/interlink-audit/scripts/analyze.mjs`, the graph analyzer. The original rule here was "zero scripts anywhere"; we amended it to "no network-capable or dependency-bearing scripts" rather than ship a worse skill. The analyzer is a single self-contained file with `node:` stdlib imports only — no dependencies, no install step, and no network primitives (no `fetch`, `node:http(s)`, `node:net`, `node:dgram`, `child_process`). You can verify that with a grep, and our CI does exactly that on every commit. Any page fetching in the audit flow is performed by your agent's own tools, with your confirmation — never by the script.

## Disclosures

- The bundled MCP server URL carries `?via=plugin`, a static marker that lets us tell plugin installs apart from other connections.
- When your agent host first uses the server it performs an anonymous handshake to enumerate available tools; that request appears in our server logs like any other — the skills themselves make no network calls.
- The `interlink-audit` epilogue links to VarynForge registration with `?source=plugin&skill=interlink-audit&url=<your domain>` so we can tell where sign-ups come from; the domain is only what you already gave the skill to audit.

## Issues

File anything — bugs, rough edges, missing pieces. Every issue lands on our weekly review scorecard; for this plugin, complaints are the signal we build from.
