---
name: draft-check
description: Draft Check — craft check for any draft. Reviews a draft article or blog post against a versioned publishing rubric covering structure, headings, metadata, content depth, images, links, and citations. Use when asked to check, review, lint, or grade a draft before publishing.
---

# Draft Check

Run a draft through the VarynForge publishing rubric and report exactly what would block or weaken it at publish time. The whole check runs right here in the conversation: no tools, no network, no account.

Rubric v1.0 (2026-08-17), generated from the VarynForge production rule registry — a rule set revised roughly thirty times against real drafts before it settled.

## Procedure

1. **Obtain the draft.** Accept a file path or pasted text. If neither is provided, ask for one — never invent a draft to check.
2. **Refuse cleanly when there is nothing to check.** An empty input, a file that is not prose (code, data, a login page dump), or content too garbled to parse gets a one-line explanation of what Draft Check needs, not a fabricated report.
3. **Parse the structure yourself**: title, headings and their levels, paragraphs, links with anchor text, images with alt text, and any frontmatter or metadata block (title, description, slug, focus keyword).
4. **Evaluate every rule in the rubric below.** Count words and characters honestly — compute them, do not estimate. Metadata rules apply only when the draft carries metadata; without frontmatter mark them "skipped (no metadata)", never failed.
5. **Report** a single table — Rule | Result (pass / warn / fail / skipped) | Detail — followed by the three highest-impact fixes in priority order. Quote the draft when citing a problem so the writer can find it.

Rules of engagement:

- Judge only what is in the draft. Do not rewrite it unless the user asks.
- Long drafts are checked in full, not sampled; the word-count rule reports the overage.
- Non-English drafts: structural, heading, image, and link rules apply as-is; note when a length threshold is calibrated for English prose.
- Run the full rubric every time — no shortening on re-runs.

## Rubric

### Structure

- **has-intro** — Content before the first H2 must have at least 40 words of prose.
- **has-conclusion** — Article must include a conclusion-style H2 with ≥ 50 words of body text.
- **has-faq** — Article metadata must populate the structured `faqs` field with 4-8 conversational Q&A pairs. Source-of-truth for the visible accordion and the FAQPage JSON-LD. Skips with info when no FAQ metadata is available.

### Headings

- **headings-single-h1** — Content must contain at most one H1 (the template renders the article title as H1).
- **headings-no-skipped-levels** — Headings must not jump more than one level at a time (e.g., H2 → H4 is invalid).
- **headings-h2-count** — Article should have between 3 and 12 H2 sections.

### Metadata

- **metadata-title-length** — Article title length must be between 30 and 70 characters.
- **metadata-description-length** — meta.description length must be between 70 and 200 characters.
- **metadata-slug-format** — Slug must be lowercase, kebab-case, and ≤ 60 characters.
- **metadata-focus-keyword** — Focus keyword must appear in the title, first 100 words of body, and at least one H2.

### Content

- **content-word-count** — Article word count should be between 800 and 3500.
- **content-paragraph-length** — No paragraph should exceed 250 words.
- **content-no-draft-leaks** — Content must not contain TODO/FIXME markers or "lorem ipsum" placeholder text.

### Images

- **images-min-count** — Article must have at least max(2, floor(words/400)) images total (hero + body).
- **images-alt-text** — Every image must have alt text: 10–125 chars, not a filename pattern.

### Links

- **links-anchor-quality** — Reject generic anchor text like "click here", "here", "read more", "link", "this".

### Citations

- **citations-stats** — Every sentence containing a number + unit/% must contain an inline link to a source.

## What this check cannot see

Checks that compare a draft against a researched content brief — outline coverage, key-point coverage, FAQ coverage, search-intent alignment, primary-keyword presence — need a brief for this specific article to compare against. No brief, nothing to check: they are absent here, not hidden. A VarynForge research run produces that brief and the full verification gate; the `connect` skill in this plugin shows how, if you ever want it.
