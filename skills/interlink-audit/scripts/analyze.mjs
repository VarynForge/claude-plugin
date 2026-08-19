#!/usr/bin/env node
// VarynForge interlink-audit — internal-link graph analyzer.
//
// Vendored from the varyn-marketing repo (scripts/analyze-interlinks.mts).
// That repo is the source of truth for these algorithms: change them there
// first, then re-copy here. Do not fork the logic in this file.
//
// This file is deliberately self-contained: one file, node: stdlib imports
// only, zero dependencies, zero network primitives. It reads a local JSON
// file and prints a report — nothing else. CI greps this file to enforce
// that (see .github/workflows/validate.yml).
//
// Input (--input pages.json), built by the host agent from the user's content:
//   {
//     "pages": [
//       {
//         "id": "<slug or canonical URL>",
//         "title": "...",
//         "description": "...",          // optional
//         "keywords": ["...", "..."],    // optional
//         "links": ["<target id>", ...]  // internal links, by target id
//       }
//     ]
//   }
//
// Reports:
//   - Corpus stats: page/edge counts, density, weakly-connected components,
//     reciprocity, unresolved link targets
//   - In/out-degree distributions (min, p25, median, p75, max, mean)
//   - Outliers vs configurable thresholds:
//       * Orphans      — in-degree below --min-in   (default 1)
//       * Dead-ends    — out-degree below --min-out (default 2)
//       * Link bombs   — out-degree above --max-out (default 8)
//       * Unresolved targets — links pointing at ids not in the corpus
//         (out of audited scope, redirected, or genuinely broken — verify
//         before treating as debt)
//   - Per-outlier link suggestions ranked by Jaccard similarity over a
//     tokenized topic blob (title + description + keywords). Pages already
//     linked are excluded. Similarity is a structural hint, not a verdict.
//
// Run:
//   node analyze.mjs --input pages.json                  # text -> stdout
//   node analyze.mjs --input pages.json --json           # JSON -> stdout
//   node analyze.mjs --input pages.json --json --out report.json
//
// Flags:
//   --min-in <n>       default 1   (orphan threshold)
//   --min-out <n>      default 2   (dead-end threshold)
//   --max-out <n>      default 8   (link-bomb threshold)
//   --suggest-top <n>  default 3   (suggestions per outlier)
//   --json             emit the full JSON report instead of text
//   --out <path>       write JSON to a file instead of stdout

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    input: null,
    json: false,
    out: null,
    minIn: 1,
    minOut: 2,
    maxOut: 8,
    suggestTop: 3,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--min-in') out.minIn = Number(argv[++i]);
    else if (a === '--min-out') out.minOut = Number(argv[++i]);
    else if (a === '--max-out') out.maxOut = Number(argv[++i]);
    else if (a === '--suggest-top') out.suggestTop = Number(argv[++i]);
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.input) throw new Error('Missing required --input <pages.json>');
  for (const [k, v] of Object.entries({
    minIn: out.minIn,
    minOut: out.minOut,
    maxOut: out.maxOut,
    suggestTop: out.suggestTop,
  })) {
    if (!Number.isFinite(v) || v < 0)
      throw new Error(`Invalid --${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Corpus loading
// ---------------------------------------------------------------------------

function normalize(raw, index) {
  const id = String(raw.id ?? raw.slug ?? raw.url ?? '').trim();
  if (!id) throw new Error(`pages[${index}]: missing id/slug/url`);
  return {
    id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : id,
    description: typeof raw.description === 'string' ? raw.description : null,
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    links: Array.isArray(raw.links) ? raw.links.map(String) : [],
  };
}

function loadCorpus(path) {
  const parsed = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (!parsed || !Array.isArray(parsed.pages))
    throw new Error('Input must be a JSON object with a "pages" array.');
  const pages = parsed.pages.map(normalize);
  const seen = new Set();
  for (const p of pages) {
    if (seen.has(p.id)) throw new Error(`Duplicate page id: ${p.id}`);
    seen.add(p.id);
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

function buildGraph(pages) {
  const nodes = new Map();
  for (const p of pages) nodes.set(p.id, p);

  const outAdj = new Map();
  const inAdj = new Map();
  for (const id of nodes.keys()) {
    outAdj.set(id, new Set());
    inAdj.set(id, new Set());
  }

  let edgeCount = 0;
  const unresolvedEdges = [];

  for (const p of pages) {
    for (const target of p.links) {
      // Self-links (nav, breadcrumbs) carry no graph signal — drop silently.
      if (target === p.id) continue;
      if (!nodes.has(target)) {
        unresolvedEdges.push({ from: p.id, to: target });
        continue;
      }
      const out = outAdj.get(p.id);
      const inn = inAdj.get(target);
      if (!out.has(target)) {
        out.add(target);
        inn.add(p.id);
        edgeCount++;
      }
    }
  }

  return { nodes, outAdj, inAdj, edgeCount, unresolvedEdges };
}

function weaklyConnectedComponents(graph) {
  const undirected = new Map();
  for (const id of graph.nodes.keys()) undirected.set(id, new Set());
  for (const [id, targets] of graph.outAdj) {
    for (const t of targets) {
      undirected.get(id)?.add(t);
      undirected.get(t)?.add(id);
    }
  }

  const seen = new Set();
  const sizes = [];
  for (const start of undirected.keys()) {
    if (seen.has(start)) continue;
    let size = 0;
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      size++;
      for (const n of undirected.get(cur) ?? []) if (!seen.has(n)) stack.push(n);
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

function reciprocity(graph) {
  if (graph.edgeCount === 0) return 0;
  let mutual = 0;
  for (const [from, targets] of graph.outAdj) {
    for (const to of targets) if (graph.outAdj.get(to)?.has(from)) mutual++;
  }
  return mutual / graph.edgeCount;
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function degreeStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    min: sorted[0] ?? 0,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1] ?? 0,
    mean: sorted.length ? sum / sorted.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Similarity
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'you', 'are',
  'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should',
  'what', 'when', 'where', 'which', 'their', 'they', 'them', 'these', 'those',
  'than', 'then', 'into', 'about', 'over', 'under', 'some', 'more', 'most',
  'any', 'all', 'our', 'out', 'use', 'using', 'one', 'two', 'its', 'off',
  'per', 'via', 'too', 'also', 'just', 'like', 'make', 'made', 'get', 'gets',
  'got', 'can', 'cannot', 'do', 'does', 'did', 'done', 'not', 'but', 'yet',
  'because', 'while', 'how', 'why', 'who', 'whom', 'whose', 'here', 'there',
  'top', 'best', 'new', 'old', 'only', 'other', 'same', 'such', 'no', 'yes',
  'it', 'is', 'to', 'in', 'on', 'of', 'as', 'at', 'by', 'an', 'or', 'be',
  'if', 'so', 'we', 'i', 'my', 'me', 'am', 'up', 'vs',
]);

function tokenize(text) {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const out = new Set();
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    out.add(t);
  }
  return out;
}

function topicTokens(p) {
  const blob = [p.title, p.description ?? '', p.keywords.join(' ')].join(' ');
  return tokenize(blob);
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

function suggestForTarget(target, pages, graph, topicCache, topN, direction) {
  const targetTokens = topicCache.get(target.id);
  const excluded = new Set([target.id]);

  if (direction === 'outbound') {
    for (const id of graph.outAdj.get(target.id) ?? []) excluded.add(id);
  } else {
    for (const id of graph.inAdj.get(target.id) ?? []) excluded.add(id);
  }

  const ranked = [];
  for (const cand of pages) {
    if (excluded.has(cand.id)) continue;
    const sim = jaccard(targetTokens, topicCache.get(cand.id));
    if (sim <= 0) continue;
    ranked.push({
      id: cand.id,
      title: cand.title,
      description: cand.description,
      similarity: Number(sim.toFixed(3)),
    });
  }

  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked.slice(0, topN);
}

// ---------------------------------------------------------------------------
// Outliers + report
// ---------------------------------------------------------------------------

function buildReport(pages, graph, cli) {
  const topicCache = new Map();
  for (const p of pages) topicCache.set(p.id, topicTokens(p));

  const outDegrees = pages.map((p) => graph.outAdj.get(p.id)?.size ?? 0);
  const inDegrees = pages.map((p) => graph.inAdj.get(p.id)?.size ?? 0);

  const orphans = [];
  const deadEnds = [];
  const linkBombs = [];

  for (const p of pages) {
    const outDeg = graph.outAdj.get(p.id)?.size ?? 0;
    const inDeg = graph.inAdj.get(p.id)?.size ?? 0;
    const base = {
      id: p.id,
      title: p.title,
      inDegree: inDeg,
      outDegree: outDeg,
      description: p.description,
    };

    if (inDeg < cli.minIn) {
      orphans.push({ ...base, suggestions: suggestForTarget(p, pages, graph, topicCache, cli.suggestTop, 'inbound') });
    }
    if (outDeg < cli.minOut) {
      deadEnds.push({ ...base, suggestions: suggestForTarget(p, pages, graph, topicCache, cli.suggestTop, 'outbound') });
    }
    if (outDeg > cli.maxOut) {
      linkBombs.push({ ...base, suggestions: [] });
    }
  }

  const N = pages.length;
  const maxEdges = N > 1 ? N * (N - 1) : 0;

  return {
    thresholds: { minInDegree: cli.minIn, minOutDegree: cli.minOut, maxOutDegree: cli.maxOut },
    corpus: {
      totalPages: N,
      totalEdges: graph.edgeCount,
      density: maxEdges ? graph.edgeCount / maxEdges : 0,
      edgeTargetMin: N * cli.minOut,
      edgeTargetMax: N * cli.maxOut,
      components: weaklyConnectedComponents(graph),
      reciprocity: reciprocity(graph),
      unresolvedEdgeCount: graph.unresolvedEdges.length,
    },
    degree: { out: degreeStats(outDegrees), in: degreeStats(inDegrees) },
    outliers: {
      orphans: orphans.sort((a, b) => a.inDegree - b.inDegree || a.id.localeCompare(b.id)),
      deadEnds: deadEnds.sort((a, b) => a.outDegree - b.outDegree || a.id.localeCompare(b.id)),
      linkBombs: linkBombs.sort((a, b) => b.outDegree - a.outDegree),
      unresolvedEdges: graph.unresolvedEdges,
    },
    pages: Object.fromEntries(
      pages.map((p) => [p.id, { title: p.title, description: p.description, keywords: p.keywords }])
    ),
  };
}

// ---------------------------------------------------------------------------
// Text formatter
// ---------------------------------------------------------------------------

function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n, digits = 2) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(digits);
}

function fmtDegree(label, s) {
  return `  ${label.padEnd(8)} min=${fmtNum(s.min)}  p25=${fmtNum(s.p25)}  median=${fmtNum(s.median)}  p75=${fmtNum(s.p75)}  max=${fmtNum(s.max)}  mean=${fmtNum(s.mean)}`;
}

function fmtSuggestions(suggestions) {
  if (suggestions.length === 0) return '      (no suggestions — no other pages share topic tokens)';
  return suggestions
    .map(
      (s) =>
        `      ${s.similarity.toFixed(3)}  ${s.id}\n             ${s.title}\n             ${s.description ?? '(no description)'}`
    )
    .join('\n');
}

function fmtOutlier(label, e) {
  const desc = e.description ?? '(no description)';
  const head = `  ${e.id}  (in=${e.inDegree}, out=${e.outDegree})\n     ${e.title}\n     ${desc}`;
  if (label === 'linkbomb') return head;
  return `${head}\n    suggested ${label === 'orphan' ? 'inbound sources' : 'outbound targets'}:\n${fmtSuggestions(e.suggestions)}`;
}

function formatText(r) {
  const lines = [];
  lines.push('# Internal-link graph');
  lines.push('');
  lines.push('## Corpus');
  lines.push(`  pages:        ${r.corpus.totalPages}`);
  lines.push(
    `  edges:        ${r.corpus.totalEdges}  (target ${r.corpus.edgeTargetMin}–${r.corpus.edgeTargetMax} for ${r.corpus.totalPages} pages × out ${r.thresholds.minOutDegree}–${r.thresholds.maxOutDegree})`
  );
  lines.push(`  density:      ${fmtPct(r.corpus.density)}`);
  lines.push(`  components:   ${r.corpus.components.length}  (sizes: ${r.corpus.components.join(', ') || '—'})`);
  lines.push(`  reciprocity:  ${fmtPct(r.corpus.reciprocity)}`);
  lines.push(`  unresolved:   ${r.corpus.unresolvedEdgeCount}`);
  lines.push('');
  lines.push('## Degree distribution');
  lines.push(fmtDegree('out', r.degree.out));
  lines.push(fmtDegree('in', r.degree.in));
  lines.push('');
  lines.push(`## Orphans (in-degree < ${r.thresholds.minInDegree}) — ${r.outliers.orphans.length}`);
  if (r.outliers.orphans.length === 0) lines.push('  (none)');
  for (const o of r.outliers.orphans) lines.push(fmtOutlier('orphan', o));
  lines.push('');
  lines.push(`## Dead-ends (out-degree < ${r.thresholds.minOutDegree}) — ${r.outliers.deadEnds.length}`);
  if (r.outliers.deadEnds.length === 0) lines.push('  (none)');
  for (const o of r.outliers.deadEnds) lines.push(fmtOutlier('deadend', o));
  lines.push('');
  lines.push(`## Link bombs (out-degree > ${r.thresholds.maxOutDegree}) — ${r.outliers.linkBombs.length}`);
  if (r.outliers.linkBombs.length === 0) lines.push('  (none)');
  for (const o of r.outliers.linkBombs) lines.push(fmtOutlier('linkbomb', o));
  lines.push('');
  lines.push(`## Unresolved targets — ${r.outliers.unresolvedEdges.length}`);
  if (r.outliers.unresolvedEdges.length === 0) lines.push('  (none)');
  for (const b of r.outliers.unresolvedEdges) lines.push(`  ${b.from} → ${b.to}`);
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const pages = loadCorpus(cli.input);
  if (pages.length === 0) {
    console.error('No pages in corpus.');
    process.exit(2);
  }
  const graph = buildGraph(pages);
  const report = buildReport(pages, graph, cli);
  if (cli.json) {
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (cli.out) {
      const path = resolve(cli.out);
      writeFileSync(path, json);
      console.error(`wrote ${json.length} bytes to ${path}`);
    } else {
      process.stdout.write(json);
    }
  } else {
    console.log(formatText(report));
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
