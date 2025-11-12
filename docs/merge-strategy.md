# DocHealth Merge Strategy

DocHealth relies on semantic, AST-aware merges to preserve human-authored content when regenerated documentation replaces machine sections. The implementation follows the Strategy 3 guidance from the M3.4 mission brief: every generated block lives inside a `:::generated-section{#semantic-id}` directive, and merges operate on those semantic IDs rather than raw lines.

## Pipeline Overview

1. **Load documents** – The CLI parses three versions of the Markdown file:
   - **BASE**: The last accepted generator output stored under `.dochealth/base/<relative-path>.md`.
   - **LOCAL**: The current working copy that may include human edits.
   - **REMOTE**: The freshly generated Markdown that should be merged in.
2. **Build ASTs** – Each document is parsed with `remark-parse`, `remark-directive`, and `remark-frontmatter` to create mdast trees.
3. **Identify human content** – Any nodes that appear outside `generated-section` blocks but do *not* exist in the BASE file are treated as human-authored inserts. They are anchored to the semantic section they trail (or the document prelude) so they can survive reorders and renames.
4. **Section matching** – Sections are matched by semantic ID, not by order. Remote order drives the final layout, so renames and reorders follow the generator, while human notes are re-attached to their anchors.
5. **Conflict detection** – For every ID the merger compares BASE / LOCAL / REMOTE content:
   - `modify-modify`: LOCAL changed generated content (even if REMOTE did not).
   - `orphaned-content`: REMOTE deleted a section that still exists locally.
   - `user-deleted`: LOCAL removed a generator-owned section that REMOTE reintroduced.
6. **Apply resolutions** – Clean sections adopt REMOTE content, conflicts keep LOCAL content until resolved. Human inserts are added back after the semantic section they belong to.
7. **Persist state** – Successful merges write the REMOTE string to `.dochealth/base/...`. Conflicts are serialized to `.dochealth/conflicts/<relative>.json` for later resolution.

## CLI Commands

### `dochealth merge-docs`

```
dochealth merge-docs \
  --local docs/examples/api-reference-sample.md \
  --remote tmp/generated/api-reference-sample.md \
  [--auto-accept-theirs]
```

Options:
- `--local <path>` – target Markdown file to update (required).
- `--remote <path>` – freshly generated Markdown (required).
- `--base <path>` – optional override for the BASE snapshot.
- `--root <path>` – project root for `.dochealth` bookkeeping (defaults to `cwd`).
- `--auto-accept-theirs` – automatically choose REMOTE for every conflict (exit 0).

Behavior:
- The command writes non-conflicting merges directly to the local file.
- When conflicts remain, details are written to `.dochealth/conflicts/<relative>.json` and the exit code is `1`.
- On clean merges the BASE snapshot is updated to the REMOTE content.

### `dochealth resolve`

```
dochealth resolve --file docs/examples/api-reference-sample.md
```

The resolver reads the conflict record, displays each conflict, and offers:
1. **Keep generator** – accept REMOTE (or deletion for orphaned sections).
2. **Keep your version** – keep LOCAL content (or keep the deletion).
3. **Manual edit** – enter custom Markdown for that section; it is wrapped in the existing directive shell.

After all conflicts are resolved the local file is rewritten, the BASE snapshot is updated, and the conflict record is cleared.

## Conflict Types

| Type | Trigger | CLI Prompt |
| --- | --- | --- |
| `modify-modify` | LOCAL edited a generated block (even if REMOTE didn’t) | Keep generator / Keep your version / Manual edit |
| `orphaned-content` | REMOTE removed a section that still exists locally | Delete section / Keep as human-only / Manual edit |
| `user-deleted` | LOCAL deleted a generator-owned section | Restore generator / Keep deleted / Manual edit |

Each conflict keeps the LOCAL version in the working file until it is resolved, preventing silent data loss.

## Storage Layout

- `.dochealth/base/<relative-path>.md` – REMOTE snapshots used as BASE inputs.
- `.dochealth/conflicts/<relative-path>.md.json` – serialized conflict state (REMOTE + BASE strings, conflict metadata).
- Both trees mirror the project file structure, so multi-file merges stay organized.

## Edge Cases & Guarantees

- **Renames**: Semantic IDs stay stable, so when REMOTE renames headings the merge follows REMOTE automatically, and human content is re-attached under the new heading.
- **Reorders**: Sections can move freely; anchored human inserts travel with their semantic ID so commentary stays in context.
- **Deletions**: When the generator removes a section, docs keep the local copy and mark an `orphaned-content` conflict so authors can decide whether to keep a human-only section or delete it.
- **User edits inside generator blocks**: Any mutation within the directive body is flagged, preventing silent overwrites.
- **Base bootstrap**: If no BASE snapshot exists, the first merge seeds it using the LOCAL file to keep existing edits safe.

Use `dochealth merge-docs` immediately after running new generators, resolve conflicts via `dochealth resolve`, and re-run the merge command to confirm the document is current. This flow fulfills the mission requirement for a reliable, semantic AST merge with CLI tooling.
