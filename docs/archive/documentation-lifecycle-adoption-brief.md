---
id: documentation-lifecycle-adoption-brief
title: Documentation Lifecycle Adoption Brief
kind: historical
status: archived
implementation_state: complete
updated: 2026-11-14
related: []
supersedes: []
superseded_by:
  - docs-index
code_paths: []
verification:
  state: not-applicable
  evidence: []
---

> **Archived after adoption:** Start at the [documentation index](../README.md)
> and consult the [migration audit](../audits/documentation-inventory-2026-11-14.md).
> This brief is retained as process history, not an active instruction.

# Roam With Justin — Documentation Lifecycle Adoption & Repository Migration Brief

**Document type:** Implementation brief for a coding agent (Codex / VS Code)  
**Status:** Proposed workflow; **not evidence that any repository changes have been made**  
**Prepared:** 2026-11-14  
**Goal:** Make Markdown plans and architecture documents maintainable, discoverable, and trustworthy as the application evolves.

> **Primary instruction to coding agent:** Inspect the actual repository and existing documentation *before changing anything*. Adopt the smallest practical documentation lifecycle that fits the codebase. Distinguish what the code **currently does** from what planning documents **propose**. Do not invent implementation status, file paths, commits, or feature behavior. Preserve useful historical context and existing content.

---

## 1. Problem to solve

The project has accumulated multiple Markdown briefs covering overlapping aspects of Roam With Justin: canonical Media / Places / Journeys, asset ingestion and optimization, Lightroom publishing, EXIF and gear mapping, automated gear ingestion, monetization, AdSense and GA4, and travel content. These documents may have been written at different times. Some are visions, some are task instructions, and some may describe code that was subsequently implemented, changed, or removed.

An AI agent needs to answer quickly and reliably:

1. **What exists and works in the source code today?**
2. **What is actively being implemented?**
3. **What is approved but not yet implemented?**
4. **What was replaced, completed, or abandoned?**
5. **Which documents should be read for a specific change?**
6. **What evidence supports a document's implementation status?**

The solution should be documentation-as-code, not a separate CMS or manually maintained project-management application.

## 2. Nonnegotiable principles

- **Code and tests are the authority for implemented behavior.** Markdown cannot prove a feature exists.
- **Architecture documents describe the verified current state**, not an aspirational design.
- **Proposals describe desired future behavior.** They must never be treated as currently available features.
- **Implementation notes track work and verification**, including partial completion and known gaps.
- **Archive, do not silently delete**, historical plans that may provide context. Preserve Git history; use `git mv` when sensible.
- **One canonical document per active subsystem** where practical; avoid duplicating architectural assertions across briefs.
- **Keep the system lightweight.** Use plain Markdown, YAML frontmatter, relative links, an index, and a small validator only if useful.
- **Do not rearchitect application code merely to tidy documentation.** This task is primarily a documentation/process migration.
- **Be explicit about uncertainty.** If implementation cannot be verified, label it `unverified` rather than guessing.
- **Avoid destructive bulk changes.** Produce an audit and migration plan before major moves/rewrites.

## 3. First pass: inventory and verify the repository

Before edits, inspect:

- Existing `README.md`, `AGENTS.md`, `.github/` instructions, `docs/` directory, scripts, package scripts, and any other documentation conventions.
- Existing Markdown files anywhere relevant in the repository, including root-level planning briefs and docs embedded in subprojects.
- Actual application entry points and content registries/selectors (Media, Places, Journeys, Experiences, Gear, commerce), *if present*.
- Image optimization/tag-to-journey resolution, R2 handling, manifest ingestion, Lightroom integration, GA4, and AdSense code, *if present*.
- Tests, build commands, CI and release/deployment workflows.
- Git history where useful to establish whether a plan was implemented or superseded.

**Important:** The filenames and directory paths in this brief are suggested conventions, **not assertions about the current repository**. Detect existing equivalents and adapt. Do not reintroduce removed legacy files such as `trips.js` or `atlasData.js` simply because an older brief mentions them.

Produce an inventory table (in the migration report) with:

| Field | Description |
|---|---|
| Current path | Existing source document location |
| Document subject | Which subsystem or feature it concerns |
| Document role | Architecture / proposal / implementation / reference / historical |
| Proposed canonical destination | New path, if a move is warranted |
| Status | Proposed / approved / in-progress / implemented / superseded / archived / unverified |
| Overlap or replacement | IDs/paths of related and superseding documents |
| Evidence | Code, test, commit/MR, or precise reason status is unknown |
| Action | Keep, migrate, consolidate, archive, or defer |

Do **not** infer `implemented` from a claim in an old AI-generated document. Verify in code and tests.

## 4. Proposed documentation layout

Adopt the structure below **only if compatible with existing conventions**; avoid gratuitous renames or nesting. The directory names distinguish document **purpose**, not implementation completeness.

```text
repo/
├── README.md                       # Project introduction; links to docs/README.md
├── AGENTS.md                        # Brief rules for coding agents; adapt if one exists
├── docs/
│   ├── README.md                    # Authoritative index / navigation / status overview
│   ├── architecture/                # Verified as-built subsystem documentation
│   │   ├── content-model.md
│   │   ├── media-pipeline.md
│   │   ├── journeys-and-experiences.md
│   │   ├── gear-and-exif.md
│   │   └── monetization-and-analytics.md
│   ├── proposals/                   # Approved/pending or exploratory future work
│   │   ├── gear-ingestion.md
│   │   └── future-partner-reporting.md
│   ├── implementation/              # Active bounded features and migrations
│   │   └── journey-media-ingestion.md
│   ├── reference/                   # Stable schemas, content guidance, external integrations
│   ├── archive/                     # Superseded, abandoned and completed historical briefs
│   └── audits/                      # Dated inventory and migration evidence
└── scripts/
    └── docs-audit.mjs               # Optional structural validation, if justified
```

**Do not create placeholder documents for nonexistent features.** The sample filenames are illustrative; prefer durable subsystem names over dates, `UPDATED`, `(2)`, or AI conversation titles. Not every historical `.md` belongs in the public docs index.

### What belongs where?

| Location | Contract |
|---|---|
| `architecture/` | Current behavior confirmed by source/tests; include concrete entry points and limitations |
| `proposals/` | Unbuilt changes, alternatives, requirements, decisions needed |
| `implementation/` | Work plan, phases, checklist, progress, test evidence, blockers |
| `reference/` | Stable specifications, schemas, editorial guidance, APIs, conventions |
| `archive/` | Historical documents with clear pointer to replacements, where applicable |
| `audits/` | Inventory and migration reports; factual evidence, not claims of completed work |

An implemented feature's *current* design should live in `architecture/`. Its original proposal can be archived, while a short history/decision note can remain linked from architecture if useful. Do not automatically archive a partially implemented proposal whose remaining requirements still matter.

## 5. Metadata contract (YAML frontmatter)

Add consistent frontmatter to managed planning/architecture documents. Use a simple fixed schema, and don't add fields that no one can keep current.

```yaml
---
id: journey-media-ingestion
title: Journey Media Ingestion
kind: implementation
status: in-progress
implementation_state: partial
created: 2026-11-14
updated: 2026-11-14
related:
  - media-pipeline
  - journeys-and-experiences
supersedes: []
superseded_by: []
code_paths: []
verification:
  state: unverified
  evidence: []
---
```

**This is an example, not actual verified project metadata.** Fill real paths and evidence from the codebase; retain original creation dates only if known from metadata/history. Use today's date for migration/updated when appropriate; don't fabricate original authorship or dates.

### Controlled values

- `kind`: `architecture`, `proposal`, `implementation`, `reference`, `historical`
- `status`: `proposed`, `approved`, `in-progress`, `implemented`, `superseded`, `archived`, `unverified`
- `implementation_state`: `none`, `partial`, `complete`, `unknown` (optional for `reference`)
- `verification.state`: `verified`, `unverified`, `not-applicable`

**Status vs verification:** A document can describe a feature that *appears* complete but is still `unverified`; don't mark it `implemented` until evidence supports that. A `kind: architecture` document should describe only verified behavior and clearly flag any sections requiring revalidation.

### Stable IDs and links

- `id` remains stable when a document is moved or renamed.
- `related`, `supersedes`, and `superseded_by` use document IDs. Verify all targets exist.
- Use relative Markdown links for human navigation.
- Never make filename equal identity: a rename should not break logical references.
- Keep metadata minimal enough for humans to edit; avoid excessive status permutations.

## 6. Single authoritative entry point: `docs/README.md`

Create or update the docs index so agents and humans can navigate without reading every Markdown file.

It should contain:

1. **How to use these docs** — code authority vs plans, status definitions, and where to start.
2. **System map** — canonical architecture documents (verified) with short descriptions.
3. **Active work** — links to current implementation briefs, current status, blockers.
4. **Backlog** — approved/proposed features with links.
5. **Reference guidance** — relevant schemas/editorial conventions.
6. **Archive policy** — where historical plans live and how supersession works.
7. **Last audit date** and any **known unknowns**.

Example entry format (not verified project state):

| Subsystem | As-built doc | Active proposal/work | Status | Evidence |
|---|---|---|---|---|
| Media pipeline | `architecture/media-pipeline.md` | `implementation/journey-media-ingestion.md` | Partial / requires verification | Code/test links |
| Gear | `architecture/gear-and-exif.md` (if warranted) | `proposals/gear-ingestion.md` | Proposed | No verified importer yet |

If the index is automatically generated, make sure the generation is deterministic and the workflow is documented. A manually curated small index is acceptable initially.

## 7. Repository agent rules (`AGENTS.md`)

Add a **short, durable** documentation lifecycle section to the existing `AGENTS.md`, or create one if absent and appropriate. Do not replace unrelated agent instructions.

Suggested text to adapt:

```markdown
## Documentation lifecycle

Before implementing a feature:
1. Read `docs/README.md` and the relevant canonical architecture and active proposal/implementation documents.
2. Inspect source code and tests to determine actual behavior; older planning files are not implementation evidence.
3. Check for superseding documents; do not use archived plans as instructions.

When implementing a feature:
1. Keep the scope bounded and preserve existing architecture unless explicitly asked otherwise.
2. Update the implementation document's checklist and evidence as work is performed.
3. If behavior changes, update the canonical architecture document and relevant references.
4. Update the docs index and mark older proposals superseded/archived only when their remaining work is genuinely resolved.
5. Record actual code paths, tests, and commit/MR references when available. Do not invent verification.

In handoff summaries distinguish: implemented, tested, partially complete, blocked, and owner action required.
```

Keep this instruction lightweight and compatible with the project's coding conventions.

## 8. Migration process: audit first, then carefully reorganize

### Stage A — Discovery (no moves)

- Scan current Markdown files and relevant code.
- Identify duplicates, overlapping plans, stale paths, and conflicting claims.
- Identify exact canonical architecture docs already present; avoid creating duplicate authorities.
- Produce `docs/audits/documentation-inventory-YYYY-MM-DD.md` (or equivalent) showing status, evidence, risk, and proposed actions.
- Flag ambiguous documents for owner review rather than silently overwriting their intent.

### Stage B — Migration plan

Propose a minimal file-by-file mapping. For each file, say `keep`, `move`, `consolidate`, `archive`, or `defer` and why.

**Prefer a preview before large-scale reorganizations.** If the owner has explicitly authorized applying this brief, proceed with safe, high-confidence moves after creating the report; leave ambiguous merges/deletions as review items.

### Stage C — Apply safe changes

1. Create/update `docs/README.md` and the small `AGENTS.md` rule.
2. Move only high-confidence documents; preserve contents unless correcting verified factual drift.
3. Add frontmatter; link related, superseded, and replacing documents bidirectionally when useful.
4. For consolidated documents, carry over unique requirements and open questions; do not silently discard them.
5. Mark archived files with a top-of-file warning and replacement link. Keep archive out of normal agent reading paths.
6. Repair internal links and references in repo scripts or instructions that previously used old document paths.
7. Keep the project README navigational, not another huge architecture monolith.

### Stage D — Verify

- Confirm every linked document exists and every ID is unique.
- Check that no active doc references a nonexistent file without a warning.
- Check that any `implemented` claims have a code/test evidence link and meaningful verification.
- Check `supersedes` / `superseded_by` consistency.
- Check Git diff for unintended deletion of unique requirements.
- Run available test/build/lint/docs validation commands as appropriate.
- Summarize changes and all unresolved classification questions.

## 9. Structural docs audit script (optional MVP)

If the repository already uses Node, consider a small `scripts/docs-audit.mjs` and a package command, e.g.:

```bash
npm run docs:audit
```

**Do not impose dependencies solely to build this script.** Use existing packages or a lightweight parser; avoid a complex framework.

Its responsibility is **structural consistency only**:

- Find managed `.md` files under `docs/`.
- Validate required frontmatter and enum values.
- Detect duplicate IDs.
- Resolve related/supersedes/superseded_by IDs.
- Detect broken relative Markdown links (where practical).
- Warn about missing `code_paths` and evidence targets.
- Flag contradictory metadata, e.g. `status: implemented` with `verification.state: unverified`.
- Print actionable errors with paths and exit nonzero on material errors; warnings for unverified status and unresolved decisions.

**It must NOT claim features work based on file existence, infer status from filenames, or automatically modify application architecture.** An agent or reviewer verifies semantic correctness against code and tests.

## 10. Workflow for every future feature

```text
Idea / request
   ↓
Check docs index and current code
   ↓
New or updated proposal (only if needed)
   ↓
Approve scope / create bounded implementation checklist
   ↓
Implement code + tests
   ↓
Verify actual behavior
   ↓
Update canonical as-built architecture
   ↓
Update index + metadata
   ↓
Archive/supersede historical proposal when fully resolved
```

**Definition of done for a code change:** Documentation changed if and only if the relevant architecture, workflows, interfaces, or project status changed. Include documentation verification in the PR/MR checklist. Tiny unrelated changes do not require broad documentation rewrites.

### Handling partially implemented plans

Do **not** mark a large feature `implemented` because phase 1 shipped. Record:

```markdown
## Progress
- [x] Image optimization produces journey-organized output (verified: file/test link)
- [ ] Publication manifest validated against R2
- [ ] Auto-population of journey media gallery
- [ ] Gear/EXIF enrichment

## Known gaps
- ...
```

That progress sample is illustrative and must be replaced with verified facts.

## 11. Roam With Justin-specific review areas

The agent should check whether the following overlap across existing documentation (not assume any are implemented):

1. **Content model:** Canonical Media, Places, Journeys, Visits, Experiences; existing selectors, stable IDs and link semantics.
2. **Media ingest:** Tag matching, optimizer naming/numbering, journey folder output, publication manifests, Cloudflare R2 verification, registries, republishing and gallery fallback.
3. **Lightroom publishing:** Publisher vs optimizer responsibilities and shared ingest contract.
4. **Gear:** EXIF-derived capture gear vs manually tagged visible gear vs journey packing/usage gear; canonical registry and optional affiliate links.
5. **Monetization:** AdSense placement policy, existing loader, GA4 one-event-per-interaction-type tracking, automatic partner IDs, affiliate disclosures.
6. **Travel writing/content:** Journey-specific source facts vs reusable editorial standards; keep trip-specific notes in an appropriate content/reference location instead of global architecture.

Suggested conceptual mapping (verify actual available documents first):

| Historical brief/topic | Likely long-term home |
|---|---|
| Original asset architecture | `architecture/content-model.md` and/or `architecture/media-pipeline.md` after validation |
| Journey media ingestion | `implementation/` until verified, then current behavior summarized in `architecture/media-pipeline.md` |
| Lightroom-to-Atlas publishing | `proposals/` or `implementation/` unless implemented; then `architecture/media-pipeline.md` |
| Gear ingestion and journey linking | `proposals/` until real implementation is verified |
| AdSense + GA4 monetization plan | Split verified integration details into `architecture/` and future work into `proposals/` / `implementation/` |
| USVI trip ingestion/content facts | Journey editorial source/reference, **not** global application architecture |

**Do not force a split if a single well-scoped document serves multiple roles clearly.** Prefer navigation and accuracy over taxonomy purity.

## 12. What NOT to do

- Do not mark the entire system implemented based on a previous AI response or generated file.
- Do not add new `src/content` registries, alter journey data, or rewrite the image optimizer as part of a documentation migration.
- Do not delete original proposals without ensuring their unique requirements survive or are deliberately archived.
- Do not rename dozens of files without fixing incoming Markdown links, agent instructions and any code/scripts referencing paths.
- Do not create both a `docs/README.md` and another unrelated "master" document that each claim to be the only authority.
- Do not encode a fragile workflow requiring humans to edit multiple status tables for every small feature; use the index as a navigation summary and metadata/documents as detailed records.
- Do not claim Git similarity/rename detection is guaranteed; preserve content/history and review diffs.
- Do not fabricate timestamps, feature completion evidence, repository paths or test results.

## 13. Requested deliverables from coding agent

### Required

1. **Repository audit:** Inventory of current documentation and verified code entry points; duplicates/conflicts identified.
2. **Migration plan:** Mapping of each affected Markdown file to a new home/action, with confidence and rationale.
3. **Documentation structure:** `docs/README.md` authoritative index and minimal consistent frontmatter for managed documents.
4. **Agent instructions:** A compact addition to `AGENTS.md` or existing equivalent.
5. **Safe migration:** Move/consolidate/archive high-confidence files while preserving unique content; fix affected links.
6. **Verification report:** Actual commands run, broken links/metadata findings, ambiguities still needing approval, and git diff summary.

### Optional (if low effort / already supported)

7. `npm run docs:audit` structural validator and CI integration.
8. PR/MR checklist line requiring documentation updates when behavior changes.

### Acceptance criteria

- A new coding agent can start at **one** `docs/README.md` and locate current authoritative architecture and active work.
- A plan cannot be confused with a completed implementation without ignoring explicit metadata/status warnings.
- Every active subsystem has at most one clear authoritative as-built reference (or a deliberately linked set, if needed).
- Archived documents visibly link to replacements where replacements exist.
- Existing code behavior is unchanged by the documentation migration.
- No unique planning requirements are silently lost.
- Referenced paths and doc IDs resolve; status claims are grounded in inspected source/tests or marked unverified.
- The final handoff clearly states **what changed**, **what was verified**, and **what still needs owner decisions**.

## 14. Copy/paste implementation command

> Inspect this repository, its Markdown plans, code, tests and existing agent instructions. Implement a lightweight documentation lifecycle that distinguishes verified as-built architecture from proposals, active implementation and archived history. Start by producing a document inventory and evidence-backed migration plan. Use `docs/README.md` as the authoritative navigation index, minimal YAML frontmatter with stable IDs/status/verification, and a short `AGENTS.md` rule requiring agents to read relevant docs and update them when features are shipped. Safely move or consolidate only high-confidence documents, preserve unique historical requirements, clearly mark superseded plans, and repair references. Add a small structural `docs:audit` command only if justified by the existing stack. **Do not refactor application code, invent implementation status, discard ambiguous plans, or declare features complete without source/test evidence.** Report changed paths, verification results and unresolved decisions.
