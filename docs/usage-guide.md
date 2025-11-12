---
title: DocHealth Generator Usage
description: How to run dochealth generate for API and Data Protocol manifests, plus sample outputs and helper notes.
---

# Generator Usage Guide

DocHealth ships with Stage&nbsp;1/Stage&nbsp;2 generators that convert protocol manifests into publishable Markdown. Use this guide whenever you need to run `dochealth generate` locally or wire it into CI/CD.

## Supported Targets

| Type | Command | Output | Notes |
| --- | --- | --- | --- |
| API | `dochealth generate api` | `<output>/<service-slug>/*.md` | One file per endpoint with YAML frontmatter + `:::generated-section` directive. |
| Data | `dochealth generate data` | `<output>/data/<dataset-slug>.md` | One file per dataset with semantic section IDs and lineage/governance blocks. |
| Workflow | `dochealth generate workflows` | `<output>/workflows/<workflow-slug>.md` | DAG validation + Mermaid diagram generation with ELK layout and semantic anchors. |
| All | `dochealth generate all` | All supported types | Runs API, Data, and Workflow generators sequentially and reports summaries per type. |

Future workflow/content generators will extend the same pattern—keep this doc updated as new types land.

## CLI Syntax

```bash
dochealth generate <type> \
  --path ./src \
  --output ./docs/generated \
  --format markdown \
  --merge \
  [--no-merge] \
  [--concurrency 200] \
  [--root /project] \
  [--state-dir .dochealth] \
  [--json]
```

**Arguments & options**

- `<type>`: `api`, `data`, `workflow(s)`, or `all`.
- `--path`: Directory that contains protocol modules (defaults to `./src`).
- `--output`: Destination directory. The CLI creates directories as needed.
- `--format`: Reserved for future formatter plugins; defaults to `markdown`.
- `--merge` / `--no-merge`: Merge regenerated Markdown with existing files (enabled by default). Disable when seeding a brand-new docs tree.
- `--concurrency`: Cap concurrent file writes (default 200) to avoid `EMFILE` errors.
- `--root`: Directory used to resolve `.dochealth` state; defaults to the current working directory.
- `--state-dir`: Override the `.dochealth` state folder if you need a custom location.
- `--json`: Echo a structured summary of generated services/datasets.

The command automatically:

1. Loads all protocols via `lib/loader.js`.
2. Filters by the requested generator type(s).
3. Runs Stage 1 (template literals) followed by Stage 2 (remark/unified) to inject YAML frontmatter and normalize directives.
4. Writes Markdown files in batches (200 concurrent by default) and logs performance benchmarks.
5. When `--merge` is active, stores base snapshots under `.dochealth/base/` and logs conflicts under `.dochealth/conflicts/`.

## Output Details

### API Generator

- Files land under `<output>/<service-slug>/`.
- Filenames follow `<endpoint-slug>.md` to keep routing stable.
- Each document includes:
  - YAML frontmatter (title, slug, tags, health metrics, semantic ID).
  - A `# <method> <path>` heading.
  - A single `:::generated-section{#semantic-id ...}` block containing Summary/Description/Metadata/Health/Parameters/Request/Responses/Errors/Pagination/Long-running sections.
- Reference sample: `docs/examples/api-reference-sample.md`.

### Data Generator

- Files land under `<output>/data/` with `<dataset-slug>.md` filenames.
- Each file provides overview, health, schema, keys, lineage, catalog, governance, operations, and data-quality sections—all wrapped in a generated-section directive with semantic anchors such as `dataset-<slug>-schema`.
- PII columns surface as `🔐` badges inside the schema table and the `data-pii` directive attribute switches to `"true"` when applicable.
- Reference sample: `docs/examples/data-catalog-sample.md`.

### Workflow Generator

- Each workflow document contains overview metadata, validation notes, and a Mermaid + ELK diagram wrapped in a generated-section.
- Cycle detection (Kahn’s Algorithm) runs before rendering. If a cycle or missing dependency is encountered, the generator emits a `:::danger` block instead of Mermaid output.
- Node styling is driven by step type (`service`, `human`, `event`, `decision`, etc.) and phases are rendered as Mermaid subgraphs for readability.
- Refer to the 60-node reference output in `docs/examples/workflow-diagram-sample.md` for large topology expectations.

#### Docusaurus Configuration for ELK

Install the required plugins:

```bash
npm install @docusaurus/theme-mermaid @mermaid-js/layout-elk
```

Enable Mermaid + ELK in `docusaurus.config.js`:

```js
export default {
  markdown: {
    mermaid: true,
  },
  themes: [
    ['@docusaurus/theme-mermaid', {
      options: {
        maxEdges: 5000,
        maxTextSize: 10000000,
      },
    }],
  ],
};
```

Every workflow diagram automatically prepends `%%{init: {"layout": "elk", "elk": {"nodePlacementStrategy": "NETWORK_SIMPLEX", "mergeEdges": true}}}%%`, so no extra per-file configuration is required once Mermaid is enabled.

### JSON Summaries

When `--json` is set, `dochealth generate` prints an object containing:

```json
{
  "type": "api",
  "types": ["api"],
  "format": "markdown",
  "output": "/abs/path/docs/generated",
  "merge": true,
  "summaries": {
    "api": {
      "documentsWritten": 12,
      "created": 12,
      "merged": 0,
      "conflicts": 0,
      "protocolSummaries": [
        {
          "name": "orders",
          "files": 12,
          "outputDir": "/abs/path/docs/generated/orders",
          "performance": { "durationMs": 87.5, "sampleSize": 100 }
        }
      ]
    }
  },
  "loadStats": {
    "total": 3,
    "successful": 3,
    "byType": { "api": 1, "data": 1, "workflow": 1 }
  },
  "loadErrors": []
}
```

This is helpful for CI steps that need to inspect benchmark timings or produced files.

### Merge & Conflict Flow

- Base snapshots live under `.dochealth/base/<relative-path>.md`. They represent the last accepted generator output.
- Conflicts are recorded under `.dochealth/conflicts/<relative-path>.md.json`. Each file captures the sections that require manual intervention.
- Regeneration always keeps human-authored content that lives outside `:::generated-section` blocks. If you make edits inside a generated block, `dochealth generate ... --merge` will log the conflict instead of overwriting your changes.
- After fixing conflicts, run `dochealth resolve --file <path>` (or accept generator output) to clear the conflict record and update the base snapshot.

## Helper Functions & Reuse Notes

- API and Data generators both live under `lib/generators/` and share helper utilities (`helpers.js`) plus a frontmatter remark plugin.
- Data-specific helpers—`formatDataFieldsTable`, `formatLineageList`, `formatCatalogMetadata`, and `formatGovernanceSummary`—keep Stage 1 templates terse and should be reused by workflow/content generators.
- All generated Markdown must remain wrapped in `:::generated-section` directives so downstream merge tooling can distinguish machine output from human edits.
- Performance stats come from a tight loop in each generator (100 synthetic renders). If you alter Stage 1 templates, rerun `npm test` to ensure benchmarks still meet the <200 ms target.

## Recommended Workflow

1. Ensure dependencies are installed (`npm install` in repo root).
2. Optionally link the CLI for ad-hoc usage: `npm link`.
3. Run the desired generator(s):
   ```bash
   dochealth generate all --path ./src --output ./docs/generated --merge
   ```
4. Make any human edits outside the generated sections.
5. Re-run the same command to regenerate + merge. Resolve conflicts via `dochealth resolve` if necessary.
6. Commit generated docs if they are part of the deliverable; otherwise, treat them as build artifacts.

Keep this document updated whenever new generator targets, options, or output conventions are introduced.
