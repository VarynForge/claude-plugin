---
name: wrap-up
description: End-of-task workflow - validate the plugin, commit, create PR, update PR description, and comment on out-of-scope changes. Adapted for this public repo.
---

# Wrap-Up Skill

Use this skill when a task is complete and ready to be shipped. It runs the full wrap-up workflow: validation, commit, PR creation, and documentation.

**This repo is public.** Commit messages, PR titles, PR bodies, and review comments are all customer-facing surface. No internal ticket economics, budget figures, ADR contents, or internal repo paths in any of them. Brand red lines apply everywhere: no "premium", no "powered by AI", no competitor names, no "unlimited".

## Workflow

Execute the following steps in order. Do NOT skip steps. If a step fails, fix the issue before proceeding.

### Graphite CLI

This project uses the Graphite CLI (`gt`) for all git operations. Key commands:

- `gt ls` — list branches in the current stack
- `gt log` — show the stack graph
- `gt modify -a -m "title" -m "body"` — canonical one-liner: stages all changes (`-a`) and either creates the first commit on the branch or amends the existing one automatically
- `gt submit` — push and create/update PRs for the entire stack

**NEVER use `gt create` in the wrap-up flow.** By the time this skill runs, the task branch has already been created and is checked out. `gt create` would start a new child branch, leaving the original empty and blocking `gt submit`. Always commit onto the current branch with `gt modify`.

**NEVER use raw `git add` + `git commit`.** It bypasses Graphite stack tracking. `gt modify -a -m ...` handles both the "fresh first commit" case and the "amend existing" case — no need to branch.

### Step 1: Update CLAUDE.md

Review all changed files (via `gt diff` against the base branch). If the changes alter the repo's structure, conventions, or the rules a future session must know, update the root `CLAUDE.md` to match. Skip for content-only skill edits that change no convention.

### Step 2: Repo Invariants Check

1. **Markdown-only sweep**: confirm the diff adds no scripts, binaries, or executable files anywhere — no `bin/`, `hooks/`, `monitors/`, `agents/` directories. Only `.md`, `.json`, and `.github/workflows/*.yml` belong in this repo (CI enforces the same guard).
2. **No network calls**: confirm no skill content instructs a fetch, API call, or third-party API key wiring.
3. **Generated file**: if `skills/draft-check/SKILL.md` changed, it must have been regenerated from the app repo's rule registry, never hand-edited. If the diff hand-edits it, stop and regenerate instead.
4. **String review**: scan every changed user-visible string against the brand red lines above.

### Step 3: Validate

Run `claude plugin validate --strict`. Fix any failures and re-run until clean. This mirrors CI — do not proceed until it passes.

### Step 4: Commit

Run `gt ls` to confirm you're on the task branch (not `main`). Then commit with:

```bash
gt modify -a -m "VAR-XX: Short title" -m "$(cat <<'EOF'
Multi-line body explaining the what and why, written for a public audience.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

`gt modify -a` handles both cases automatically:

- **Fresh branch (no prior commit):** creates the first commit.
- **Branch with existing commit:** amends the existing commit.

Default to a single cohesive commit per wrap-up.

### Step 5: Identify the Linear Ticket

Extract the Linear ticket ID from the branch name (format: `prefix/VAR-XX-description`). If the branch doesn't contain a ticket ID, ask the user. The ID may appear in commit/PR titles as a plain reference, but PR bodies must not quote internal ticket content.

### Step 6: Submit and Create PR

1. Run `gt submit` to push and create/update PRs for the stack.
2. After submit, update the PR title and description via `gh pr edit`:
   - PR title referencing the ticket ID (e.g., `VAR-XX: Short description`)
   - PR body including:
     - `## Summary` — bullet points of what changed, written for a public reader
     - `## Test plan` — checklist of manual verification steps (always includes `claude plugin validate --strict` passing)
     - Link to the Linear ticket (format: `[VAR-XX](https://linear.app/varyn-forge/issue/VAR-XX)`)
     - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`

### Step 7: Comment on Out-of-Scope Changes

Review the diff against the Linear ticket description (fetch it via `mcp__linear__get_issue` if available, or ask the user). If any changes go beyond what the ticket describes:

1. Add a PR comment (via `gh pr comment`) listing these changes and explaining why they were made — public-audience wording.
2. Format as a checklist so the reviewer can quickly assess each one.

If all changes are within scope, skip this step.

### Step 8: Final Verification

Run `gt ls` and `gh pr view` to confirm the stack and PR state. Return the **Graphite PR URL** (from `gt submit` output, format: `https://app.graphite.com/github/pr/...`) to the user, not the GitHub URL.

Then open the Graphite PR URL in the browser:

```bash
xdg-open "https://app.graphite.com/github/pr/..."
```
