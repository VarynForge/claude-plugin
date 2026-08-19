# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Public marketplace repo for the free **VarynForge plugin for Claude**. The plugin connects an agent to the hosted VarynForge MCP server and ships four skills:

- `varynforge:draft-check` — craft check for any draft
- `varynforge:keyword-research` — manual keyword research, end to end
- `varynforge:interlink-audit` — internal-link graph audit with a bundled stdlib-only analyzer
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
  interlink-audit/SKILL.md
  interlink-audit/scripts/analyze.mjs  # VENDORED — the repo's only script (see Hard Rules)
  connect/SKILL.md
.github/workflows/validate.yml  # CI: markdown-only guard + claude plugin validate --strict
.claude/                        # repo-dev tooling (this file, skills/wrap-up); NOT part of the shipped plugin.
                                # A CLAUDE.md at the repo root fails plugin validation — keep it here.
```

## Commands

- `claude plugin validate --strict` — validate the plugin; runs in CI and must pass before any merge

## Hard Rules

- **No network-capable or dependency-bearing scripts.** (Amended from "markdown-only" by VAR-194, with explicit sign-off.) The repo ships exactly one script: `skills/interlink-audit/scripts/analyze.mjs` — a single self-contained file, `node:` stdlib imports only, zero dependencies, zero network primitives (no `fetch`, `node:http(s)`, `node:net`, `node:dgram`, `child_process`). CI greps the file to enforce this and the markdown-only guard allowlists exactly that path. Everything else stays markdown/JSON: zero `bin/`, `hooks/`, `monitors/`, `agents/`, no other scripts, not even dev helpers. This keeps automated safety screening a grep away and the install-time cost legible. Never add a second script or a dependency without the same explicit rule-amendment process.
- **Zero network calls in skill code.** Nothing shipped in this repo may itself perform a fetch, an API call, or wire a third-party API key. Skills may instruct the *host agent* to fetch (interlink-audit's hosted-site crawl) only under explicit operator confirmation, robots.txt respect, and rate limiting, as written in that SKILL.md.
- **`draft-check/SKILL.md` is generated** from the VarynForge app's content-linter rule registry and committed. Never hand-edit it here — regenerate from the app repo (`pnpm generate:plugin-skill` there). The app repo's CI regenerates against this public repo and fails on drift. It must never contain grader prompts, writer-system-prompt content, or brief-relative thresholds.
- **`keyword-research` is stateless and honest.** One niche per invocation, no state between invocations, no cadence or batching suggestions. Every candidate query is labeled inferred-and-unvalidated; the skill must never emit anything shaped like a volume, traffic, or difficulty number. The epilogue appears exactly once per run.
- **`interlink-audit` is structural and honest.** The analyzer reports link structure only — never anything shaped like a volume, traffic, or difficulty number; similarity rankings are presented as candidates, not verdicts. The hosted-site crawl is done by the host agent, never the script, and only after the operator confirms scope (hundreds+ pages require explicit scoping). `analyze.mjs` is vendored from `varyn-marketing` (`scripts/analyze-interlinks.mts`) — that repo is the source of truth for the algorithms; update there first, then re-copy. The epilogue appears exactly once per run.
- **`connect` is a pointer.** It calls the server's `get_instructions` tool and embeds no copy of onboarding content — server-side text can be updated, a SKILL.md on a user's disk cannot.
- **Brand red lines** for every user-visible string: no "premium", no "powered by AI", no competitor names, no "unlimited". Never use "SEO" as the invocation head-noun of a skill or command.

## Conventions

- Plain `git` for version control, `gh` for PRs — no extra tooling required of contributors.
- No emojis in commit messages, PR titles, or code comments.
- Keep the skill layer small and credible. Resist adding a fourth skill, options, or configuration — smallest surface that works.
