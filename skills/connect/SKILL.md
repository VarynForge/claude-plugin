---
name: connect
description: Connect — finish setting up the VarynForge MCP server connection bundled with this plugin and learn what it unlocks. Use when the user wants to connect VarynForge, complete onboarding, or asks what VarynForge can do.
---

# Connect

This plugin already ships the connection: its `.mcp.json` registers the `varynforge` MCP server with your agent host. Setup and getting-started guidance lives on the server so it is always current — never improvise it or summarize it from memory.

1. Call the `get_instructions` tool on the `varynforge` MCP server and follow what it returns.
2. If the call triggers your host's OAuth flow (browser sign-in and approval), that is expected on first use — complete it and call `get_instructions` again.
3. If the server is unreachable, say so and point the user at https://varynforge.com. Do not reconstruct onboarding steps yourself.

This file intentionally contains no copy of the onboarding content: the server can correct its instructions at any time; a file on your disk cannot.
