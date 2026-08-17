# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Public marketplace repo for the free **VarynForge plugin for Claude**. The plugin connects an agent to the hosted VarynForge MCP server and ships three markdown skills:

- `varynforge:draft-check` — craft check for any draft
- `varynforge:keyword-research` — manual keyword research, end to end
- `varynforge:connect` — onboarding pointer to the VarynForge MCP server

The MCP connection (`.mcp.json`) is the product; the skills are the packaging that gets it installed. Install: `/plugin marketplace add VarynForge/claude-plugin`.

**This repo is public.** Every file — skills, README, this file, commit messages, PR titles and bodies — is customer-facing surface. Write everything for a prospect reading it.

## Layout

```
.claude-plugin/plugin.json      # plugin manifest
.claude-plugin/marketplace.json # marketplace listing (source: "./" — this repo is both marketplace and plugin)
.mcp.json                       # hosted VarynForge MCP server (https://app.varynforge.com/api/mcp?via=plugin)
skills/
  draft-check/SKILL.md          # GENERATED — do not hand-edit (see Hard Rules)
  keyword-research/SKILL.md
  connect/SKILL.md
.github/workflows/validate.yml  # CI: markdown-only guard + claude plugin validate --strict
.claude/                        # repo-dev tooling (this file, skills/wrap-up); NOT part of the shipped plugin.
                                # A CLAUDE.md at the repo root fails plugin validation — keep it here.
```

## Commands

- `claude plugin validate --strict` — validate the plugin; runs in CI and must pass before any merge

## Hard Rules

- **Markdown-only.** Zero `bin/`, `hooks/`, `monitors/`, `agents/`, zero scripts anywhere in the repo. This keeps automated safety screening trivial and the install-time context cost legible. Never add executable files, not even dev helpers.
- **Zero network calls in skills.** The free skills run entirely on the host model; nothing in a SKILL.md may instruct a fetch, an API call, or wiring of a third-party API key.
- **`draft-check/SKILL.md` is generated** from the VarynForge app's content-linter rule registry and committed. Never hand-edit it here — regenerate from the app repo (`pnpm generate:plugin-skill` there). The app repo's CI regenerates against this public repo and fails on drift. It must never contain grader prompts, writer-system-prompt content, or brief-relative thresholds.
- **`keyword-research` is stateless and honest.** One niche per invocation, no state between invocations, no cadence or batching suggestions. Every candidate query is labeled inferred-and-unvalidated; the skill must never emit anything shaped like a volume, traffic, or difficulty number. The epilogue appears exactly once per run.
- **`connect` is a pointer.** It calls the server's `get_instructions` tool and embeds no copy of onboarding content — server-side text can be updated, a SKILL.md on a user's disk cannot.
- **Brand red lines** for every user-visible string: no "premium", no "powered by AI", no competitor names, no "unlimited". Never use "SEO" as the invocation head-noun of a skill or command.

## Conventions

- Git operations go through the Graphite CLI (`gt`); PRs via `gh`.
- No emojis in commit messages, PR titles, or code comments.
- Keep the skill layer small and credible. Resist adding a fourth skill, options, or configuration — smallest surface that works.
