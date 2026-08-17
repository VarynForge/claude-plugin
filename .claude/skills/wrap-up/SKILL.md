---
name: wrap-up
description: End-of-task workflow - validate the plugin, commit, create PR, update PR description, and comment on out-of-scope changes. Adapted for this public repo.
---

# Wrap-Up Skill

Use this skill when a task is complete and ready to be shipped. It runs the full wrap-up workflow: validation, commit, PR creation, and documentation.

**This repo is public.** Commit messages, PR titles, PR bodies, and review comments are all customer-facing surface. No internal ticket economics, budget figures, ADR contents, or internal repo paths in any of them. Brand red lines apply everywhere: no "premium", no "powered by AI", no competitor names, no "unlimited".

Version control is plain `git` plus the `gh` CLI — no other tooling is assumed, so external contributors can follow the same flow.

## Workflow

Execute the following steps in order. Do NOT skip steps. If a step fails, fix the issue before proceeding.

### Step 1: Update CLAUDE.md

Review all changed files (via `git diff main...HEAD`). If the changes alter the repo's structure, conventions, or the rules a future session must know, update `.claude/CLAUDE.md` to match. Skip for content-only skill edits that change no convention. (Session instructions live at `.claude/CLAUDE.md`, not the repo root — a root CLAUDE.md fails plugin validation.)

### Step 2: Repo Invariants Check

1. **Markdown-only sweep**: confirm the diff adds no scripts, binaries, or executable files anywhere — no `bin/`, `hooks/`, `monitors/`, `agents/` directories. Only `.md`, `.json`, and `.github/workflows/*.yml` belong in this repo (CI enforces the same guard).
2. **No network calls**: confirm no skill content instructs a fetch, API call, or third-party API key wiring.
3. **Generated file**: if `skills/draft-check/SKILL.md` changed, it must have been regenerated from the app repo's rule registry, never hand-edited. If the diff hand-edits it, stop and regenerate instead.
4. **String review**: scan every changed user-visible string against the brand red lines above.

### Step 3: Validate

Run `claude plugin validate --strict .`. With `marketplace.json` present this checks only the marketplace manifest, so also validate plugin mode the way CI does: copy the repo to a temp dir, delete `.claude-plugin/marketplace.json` from the copy, and run `claude plugin validate --strict <copy>`. Fix any failures and re-run until both pass.

### Step 4: Commit

Confirm you are on a feature branch, not `main` (`git branch --show-current`); create one if needed. Then:

```bash
git add -A
git commit -m "VAR-XX: Short title" -m "Multi-line body explaining the what and why, written for a public audience."
```

Default to a single cohesive commit per wrap-up: if the branch already has an unreviewed commit for this task, amend it (`git commit --amend`) rather than stacking fixups. Once a PR has review activity, add follow-up commits instead — never rewrite history under a reviewer.

### Step 5: Identify the Linear Ticket

Extract the Linear ticket ID from the branch name (format: `var-XX-description` or `prefix/VAR-XX-description`). If the branch doesn't contain a ticket ID, ask the user. The ID may appear in commit/PR titles as a plain reference, but PR bodies must not quote internal ticket content.

### Step 6: Push and Create PR

1. Push: `git push -u origin <branch>` (add `--force-with-lease` only when amending a branch that has no review activity yet).
2. Create or update the PR via `gh pr create` / `gh pr edit`:
   - PR title referencing the ticket ID (e.g., `VAR-XX: Short description`)
   - PR body including:
     - `## Summary` — bullet points of what changed, written for a public reader
     - `## Test plan` — checklist of manual verification steps (always includes both validation modes from Step 3 passing)
     - Link to the Linear ticket (format: `[VAR-XX](https://linear.app/varyn-forge/issue/VAR-XX)`)
     - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`

### Step 7: Comment on Out-of-Scope Changes

Review the diff against the Linear ticket description (fetch it via `mcp__linear__get_issue` if available, or ask the user). If any changes go beyond what the ticket describes:

1. Add a PR comment (via `gh pr comment`) listing these changes and explaining why they were made — public-audience wording.
2. Format as a checklist so the reviewer can quickly assess each one.

If all changes are within scope, skip this step.

### Step 8: Final Verification

Run `gh pr view --json state,url` to confirm the PR state, return the PR URL to the user, and open it:

```bash
xdg-open "https://github.com/VarynForge/claude-plugin/pull/..."
```
