# SEO Doctrine Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Encode Spearlance SEO Doctrine v2 into armadillo's rule system and update 5 SEO skills with doctrine-specific processes — zero duplication.

**Architecture:** One rule file holds all prescriptive governance (operating stance, meta title/description templates, URL patterns, content thresholds, interlinking rules, page context protection, escalation criteria, agent behavioral rules). Skills get surgical updates adding only NEW processes the doctrine introduces (expansion sequences, monitoring triggers, competitive response logic). Rule auto-loads on every SEO skill invocation — skills never repeat rule content.

**Tech Stack:** Markdown (rules + skills)

---

### Task 1: Create SEO Doctrine Rule File

**Files:**
- Create: `.claude/rules/seo-doctrine.md`

**What it contains (from doctrine sections):**
- S0: Operating stance (medium-aggressive), core beliefs (9 ranked), permitted/not-permitted actions
- S1: Meta title rules — structure template, CTR modifiers, context safeguard, decision tree
- S2: Meta description rules — construction template, constraints
- S3: Heading & banner structure — H1 tag rules, H2 billboard test, subtitle, H2/H3 hierarchy
- S4: URL structure — /{service-slug}/{city-state} pattern, slug formatting rules
- S6: Content quality thresholds — word count minimums/targets/rewrite triggers, publishing cadence, approved content types, pillar page model with linking rules
- S7: Interlinking rules — link density (5 min, 10+ target), anchor text distribution (exact 30-40%, partial 30-40%, branded 20-30%), linking pattern decision logic
- S13: Page context protection — intent preservation (CRITICAL safety rule), intent violation escalation, decision logic
- S14: Error handling — conflicting signals, failed optimization rollback (CTR drop >20% in 14 days = revert), escalation criteria to Garrett
- S16: Operating cycle — weekly sequence (Monitor → Fix → Optimize → Create → Build → Report), priority rule
- S18: Agent behavioral rules — always do list, never do list, when in doubt defaults

**What it does NOT contain (already in skills):**
- Schema templates (schema-markup skill)
- Citation directory lists (local-seo-audit skill)
- Backlink opportunity types (link-analysis skill)
- Review generation flows (review-management skill)
- AI citation checking process (ai-visibility skill)
- GSC query syntax (google-search-console-api skill)

**Verify:** After writing, confirm no content duplicates what's already in existing rules (nap-enforcement, security, testing, etc.)

---

### Task 2: Update `local-growth` — Add 5-Phase Expansion Sequence (S15)

**Files:**
- Modify: `.claude/skills/local-growth/SKILL.md`

**What to add (after Phase 3: Local Content, before Phase 4: Local Authority):**

New section: "Local Domination Expansion Sequence" from doctrine S15 — the 5-phase geographic expansion model:
1. Core (home city, pillar pages, 3-5 blog posts per pillar)
2. Adjacent (5-10 mile radius towns, interlink city pages, build citations)
3. Subservice Expansion (subservice pages under each service pillar)
4. Extended Reach (10-25 mile radius towns, prioritize by volume + competition)
5. Saturation (remaining viable towns, long-tail, optimize existing before creating new)

Also add "When to Stop Expanding" rule from S15.2:
- < 10 impressions/month after 60 days AND town < 5,000 population AND no commercial search volume → stop expanding in that direction

**What NOT to add:** Title rules, content thresholds, URL patterns — those are in the rule file.

---

### Task 3: Update `seo-pulse` — Add GSC Monitoring Triggers (S12)

**Files:**
- Modify: `.claude/skills/seo-pulse/SKILL.md`

**What to add (in Phase 3: Rankings Check):**

New subsection: "GSC Monitoring Triggers" from doctrine S12.1:
- Impressions > 500/month AND CTR < 2% → title/description rewrite needed
- Impressions > 1,000/month AND CTR < 3% → HIGH-PRIORITY title rewrite
- Position 8-20 AND impressions rising → content expansion opportunity
- Queries triggering a page that don't match page intent → evaluate new page creation

New subsection: "Title/Description Rewrite Protocol" from doctrine S12.2:
1. Record current title and description
2. Write new title following Section 1 rules (reference seo-doctrine rule)
3. Write new description following Section 2 rules (reference seo-doctrine rule)
4. Deploy change
5. Monitor for 14 days
6. Rollback rule: CTR drops > 20% within 14 days → revert + flag for Garrett review

New subsection: "Keyword Expansion from Query Data" from doctrine S12.3:
- If query generates impressions but no dedicated page exists AND commercial/informational intent AND estimated monthly volume > 50 → recommend new page creation
- If query generates impressions on a page with mismatched intent → recommend NEW page, do NOT modify existing page's intent

**What NOT to add:** The actual title/description templates — those are in the rule file.

---

### Task 4: Update `local-seo-audit` — Add City Page Checklist (S5)

**Files:**
- Modify: `.claude/skills/local-seo-audit/SKILL.md`

**What to add (in Section 2: Location Page Uniqueness):**

Replace/enhance the existing uniqueness checklist with the doctrine S5.1 mandatory elements checklist:

Mandatory Elements (for each `[Service] in [City]` page):
- [ ] Primary keyword with city in H1
- [ ] City name in meta title (embedded in keyword phrase)
- [ ] City name in meta description (minimum 2 mentions)
- [ ] 2-3 nearby landmarks or local references
- [ ] Local market characteristics (1-2 sentences)
- [ ] 3-5 surrounding towns with links to their pages (if they exist)
- [ ] Minimum 3 locally relevant FAQs with FAQ schema
- [ ] City name in alt text of at least 1 image
- [ ] Structured internal links to related city pages and service pillar page
- [ ] Tone implies local familiarity — not generic "we serve [city]"

Quality Gate: Page must read as if written by someone who operates in that city. Find-and-replace of another city page = FAIL. Minimum 30% unique content beyond boilerplate service descriptions.

**What NOT to add:** The expansion priority algorithm (that's in local-growth). URL patterns (that's in the rule file).

---

### Task 5: Update `link-analysis` — Add Competitive Response Logic (S11)

**Files:**
- Modify: `.claude/skills/link-analysis/SKILL.md`

**What to add (new section after Phase 1: Discovery, before Phase 2: Opportunity Mapping):**

New section: "Competitive Response Logic" from doctrine S11:

**Trigger:** Before creating or optimizing any service or city page, audit top 5 ranking competitors.

**Record for each competitor:**
- Word count
- Number of H2/H3 headings
- Internal link count
- Schema types present
- FAQ count
- Unique content elements (tools, calculators, videos, etc.)

**Decision logic:**
- Competitor word count > our page by 500+ words → flag for content expansion
- Competitor has FAQ schema and we don't → add FAQ schema immediately
- Competitor covers subtopics we don't → add those subtopics or create supporting articles
- Competitor has more internal links → run interlinking audit on our page
- We already outperform on all metrics → monitor quarterly, no immediate action needed

**What NOT to add:** The interlinking density targets (those are in the rule file).

---

### Task 6: Update `content-strategy` — Add Content Thresholds (S6)

**Files:**
- Modify: `.claude/skills/content-strategy/SKILL.md`

**What to add (in Phase 5: Content Quality Checklist, replace/enhance the word count section):**

New table: "Minimum Quality Thresholds" from doctrine S6.1:

| Metric | Minimum | Target | Rewrite Trigger |
|--------|---------|--------|-----------------|
| Word count (service page) | 1,500 | 2,000-2,500 | Below 1,200 |
| Word count (blog post) | 1,000 | 1,500-2,000 | Below 800 |
| Word count (city page) | 1,200 | 1,500-2,000 | Below 1,000 |
| Internal links per page | 5 | 10+ | Below 3 |
| H2 headings per page | 4 | 6-8 | Below 3 |
| FAQ items (local pages) | 3 | 5-7 | Below 3 |
| Unique content per city page | 30% | 50%+ | Below 20% |

New subsection: "Publishing Cadence" from doctrine S6.2:
- Target: minimum 3 posts per week. Daily if capacity allows.
- Never below 2 per week.
- Approved content types (ranked by priority):
  1. High-intent informational content (targets search queries with commercial/transactional intent)
  2. Legal or regulatory guides relevant to client's industry
  3. Strategic breakdowns (how-to guides with genuine expertise)
  4. Industry updates (algorithm changes, market shifts)
  5. Authoritative listicles (only if backed by real data or expertise)
- NEVER publish: magazine-style filler, seasonal fluff with no ranking intent, content rehashing existing pages, AI-generated content without human review

**What NOT to add:** Title/description templates (rule file), interlinking patterns (rule file), pillar page linking rules (rule file).

---

### Task 7: Update CLAUDE.md Rules Table

**Files:**
- Modify: `.claude/CLAUDE.md`

**What to add:** New row in the Rules table:
```
| **seo-doctrine** | Spearlance SEO operating stance, on-page rules, content thresholds, page context protection, escalation |
```

---

## Execution Notes

- Tasks 1-6 are independent (no file overlap)
- Task 7 depends on Task 1 (rule must exist before documenting it)
- All tasks are markdown-only — no code, no tests
- Parallel execution is ideal for Tasks 2-6
