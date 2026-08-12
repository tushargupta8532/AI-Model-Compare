# AI Model Comparison Platform — Product & Technical Plan

**Purpose:** help developers, researchers, and product managers compare AI models (GPT-, Claude-, Llama-, Gemini-, Mistral-family, etc.) across capability, cost, latency, safety, and compliance dimensions, so they can pick the right model for a task or budget instead of relying on marketing pages.

---

## 1. Goals & scope

| | |
|---|---|
| **Primary goal** | Let a user go from "I need a model for X" to a shortlist of 2–3 candidates with evidence, in under 5 minutes. |
| **Audience** | Developers (API integration decisions), researchers (capability/behavior analysis), PMs/decision-makers (cost, compliance, vendor risk). |
| **Core use cases** | (1) Side-by-side spec comparison, (2) cost estimation for a given traffic pattern, (3) "which model fits my constraints" filtering, (4) checking safety/compliance posture before adopting a vendor. |
| **Non-goals (v1)** | Running our own benchmark evaluations, hosting models, real-time leaderboard scraping of every provider on earth. We curate and cite; we don't re-run evals ourselves initially. |
| **Success metrics** | Time-to-shortlist, % of sessions that use the comparison table (not just read one card), data freshness (median age of "last verified" timestamp), returning-user rate. |

---

## 2. Comparison criteria

At least 6 are required; below are 11 with justification for what each buys the user and what data backs it. All 11 map directly to fields in the schema in Section 3.

| Criterion | Why it matters | Example data points |
|---|---|---|
| **Capabilities** (reasoning, coding, summarization, translation, vision, audio) | The single biggest driver of "will this even work for my task." Raw benchmark scores don't capture task fit as well as a task-oriented capability profile. | 1–5 editorial rating per category + supporting benchmark links |
| **Performance benchmarks** | Gives a quantifiable, checkable signal instead of vibes. Needed by researchers and by developers who want defensible numbers in a design doc. | MMLU, HumanEval/SWE-bench, GSM8K/MATH, MT-Bench or Chatbot Arena Elo, GPQA |
| **Latency & throughput** | Determines UX viability (chat vs. batch), and interacts with cost (streaming vs. non-streaming, rate limits at scale). | p50/p95 time-to-first-token, tokens/sec, requests-per-minute default tier |
| **Cost model** | Usually the deciding factor once two models are "good enough." Needs to be usable for back-of-envelope math, not just a headline number. | $/1M input tokens, $/1M output tokens, batch/cached-input discounts |
| **Availability & access** | A model that's technically superior but geo-restricted or waitlisted is not a real option for a given team. | Regions supported, access tier (public API / waitlist / enterprise-only), self-serve vs. sales-gated |
| **Safety & alignment** | Legal/brand risk and UX quality (over-refusal, jailbreak resistance) both depend on this; PMs need it for vendor risk review. | Published usage policy link, red-teaming disclosures, refusal-rate characterization, content filter configurability |
| **Customization** | Determines whether the model can be adapted to a domain instead of just prompted. | Fine-tuning availability, embeddings API, adapters/LoRA support, system-prompt/tool-use flexibility |
| **Data handling** | Increasingly a hard requirement (not a nice-to-have) for regulated industries and privacy-conscious teams. | Training-data opt-out availability, data retention window, zero-data-retention option, where data is processed |
| **Ecosystem** | Time-to-integrate and long-term maintainability depend on tooling quality, not just model quality. | Official SDKs (languages), LangChain/LlamaIndex support, plugin/tool-use standardization (e.g., function calling, MCP) |
| **Deployment options** | Some teams need on-prem/VPC or edge deployment, not just a hosted API. | API-only, VPC/private cloud, on-prem license, open-weights (self-hostable) |
| **Compliance** | Gatekeeping requirement for enterprise/regulated buyers — often filters the shortlist before capability even gets discussed. | SOC 2, HIPAA-eligibility, GDPR data-processing terms, data residency options |

Design principle: every criterion above should be **sourced and dated** on the model card (see Section 4), not presented as a bare number — comparison sites lose trust the moment a stat looks unsourced or stale.

---

## 3. Data model

Design intent: relational core (models/providers/scores/pricing change together and need joins for the comparison table) with a versioned "source of truth" so every number is traceable.

### Entity relationship

```
Provider 1---* Model 1---* CapabilityRating
                      1---* BenchmarkScore
                      1---* PricingTier
```

### Schema (Prisma — swap for any ORM; the shapes are what matter)

```prisma
model Provider {
  id      String  @id @default(cuid())
  name    String  @unique          // "OpenAI", "Anthropic", "Meta", "Google", "Mistral AI"
  website String
  logoUrl String?
  models  Model[]
}

model Model {
  id                 String   @id @default(cuid())
  slug               String   @unique        // "gpt-4o", "claude-sonnet-5", "llama-4-scout"
  name               String
  providerId         String
  provider           Provider @relation(fields: [providerId], references: [id])
  family             String?                 // "GPT", "Claude", "Llama"
  releaseDate        DateTime?
  modalities         String[]                // ["text","image","audio"]
  contextWindow      Int?                    // tokens
  maxOutputTokens    Int?
  license            String?                 // "proprietary" | "Llama Community License" | "Apache-2.0"
  openWeights        Boolean  @default(false)
  deploymentOptions  String[]                // ["api","vpc","on-prem","self-hosted","edge"]
  regionsAvailable   String[]                // ISO region codes, or ["global"]
  dataRetentionDays  Int?                    // null = unspecified/unknown
  trainingOptOut     Boolean?
  zeroDataRetention  Boolean?
  safetyPolicyUrl    String?
  safetyNotes        String?                 // short editorial summary, not a marketing quote
  complianceCerts    String[]                // ["SOC2","HIPAA-eligible","GDPR-DPA","ISO27001"]
  sdkLanguages       String[]                // ["python","node","java","go"]
  functionCalling    Boolean?
  fineTuningSupport  Boolean?
  sourceUrl          String                  // primary official doc this record derives from
  lastVerifiedAt     DateTime
  capabilities       CapabilityRating[]
  benchmarkScores    BenchmarkScore[]
  pricingTiers       PricingTier[]
}

model CapabilityRating {
  id       String  @id @default(cuid())
  modelId  String
  model    Model   @relation(fields: [modelId], references: [id])
  category String  // "reasoning" | "coding" | "summarization" | "translation" | "vision"
  score    Int     // 1-5 editorial scale
  notes    String?
}

model BenchmarkScore {
  id         String   @id @default(cuid())
  modelId    String
  model      Model    @relation(fields: [modelId], references: [id])
  benchmark  String   // "MMLU" | "HumanEval" | "GPQA" | "MT-Bench" | "Chatbot Arena Elo"
  score      Float
  scoreUnit  String   // "%" | "elo" | "pass@1"
  sourceUrl  String
  measuredAt DateTime
}

model PricingTier {
  id              String   @id @default(cuid())
  modelId         String
  model           Model    @relation(fields: [modelId], references: [id])
  tierName        String   // "standard" | "batch" | "cached-input"
  inputPricePerM  Float?   // $ per 1M input tokens
  outputPricePerM Float?   // $ per 1M output tokens
  currency        String   @default("USD")
  effectiveDate   DateTime
  sourceUrl       String
}
```

### Validation layer (Zod — shared between ingestion scripts and API)

```ts
import { z } from "zod";

export const ModelSchema = z.object({
  slug: z.string(),
  name: z.string(),
  providerId: z.string(),
  modalities: z.array(z.enum(["text", "image", "audio", "video"])),
  contextWindow: z.number().int().positive().optional(),
  license: z.string().optional(),
  openWeights: z.boolean().default(false),
  sourceUrl: z.string().url(),
  lastVerifiedAt: z.coerce.date(),
});
```

Why Zod alongside Prisma: ingestion scripts pull from messy HTML/JSON; validating at the boundary means a malformed scrape fails loudly instead of writing garbage into the comparison table.

---

## 4. Data sourcing & update strategy

| Source type | Examples | Refresh cadence | Trust level | Notes |
|---|---|---|---|---|
| Official docs/model cards | Provider API docs, published model cards | Weekly check, on-demand on model launch | High (primary source) | Store `sourceUrl` per field so users can verify |
| Benchmark leaderboards | Published eval results, academic leaderboards | Monthly, or on new model release | High for methodology-disclosed evals | Prefer evals with public methodology over self-reported marketing numbers |
| Third-party/independent evaluators | Cross-provider benchmarking trackers, independent labs | Weekly | Medium-high | Useful precisely because they're not vendor-authored; disclose their methodology link |
| Pricing pages | Official pricing docs | Weekly (prices change often and silently) | High but volatile | Highest-priority field to keep fresh — users lose trust fastest over stale pricing |
| Community corrections | User-submitted "this is wrong" reports | Continuous intake, batched review | Low until verified | Never auto-publish; always routed through human review queue |

**Automated vs. manual — recommended hybrid:**

1. **Automated fetch, not automated publish.** Scheduled jobs (see Section 8) fetch official pages and diff against current DB values. A diff never writes directly to the live table — it writes to a `pending_review` staging table.
2. **Human-in-the-loop review.** An editor approves/rejects each diff (a simple internal review UI, or even a GitHub PR bot that opens a PR per diff for a human to merge). This is the single highest-leverage trust mechanism for a comparison site — it's the difference between "a scraper" and "a source people cite."
3. **Every published fact carries `sourceUrl` + `lastVerifiedAt`.** Rendered visibly on the model card ("Verified against official docs, 3 days ago") — this is a differentiator, not decoration.
4. **Legal/ToS care:** only fetch from pages that permit it; prefer official structured data (pricing JSON, published spec sheets) over scraping HTML that a ToS prohibits. When in doubt, do it manually with a citation rather than automate it.
5. **Changelog page.** Every data change is public and diffable — this is what lets a returning developer trust that a number they saw last month didn't just silently shift.

---

## 5. Product: pages, components, features

| Page/component | Purpose | Key details |
|---|---|---|
| **Model directory / comparison table** | Primary tool. Sortable columns, sticky header, pin up to 4 models, toggle column groups (capability / cost / compliance) | Client-side sort for the visible page; server-side filter for the full dataset |
| **Model card (detail page)** | Deep dive on one model | All 11 criteria, sourced and dated; radar chart of capability profile; benchmark bar chart vs. same-tier peers |
| **Compare view (`/compare?ids=...`)** | Focused 2–4 model side-by-side | Shareable URL; highlights differences, not just raw values |
| **Filters & facets** | Narrow the field before comparing | Provider, modality, price band, context-window range, open-weights vs. proprietary, license type, region, deployment option |
| **Search** | Fast lookup by name/family/use-case tag | Client-side fuzzy search (Fuse.js) is enough at dozens-of-models scale |
| **Glossary** | Defines jargon (MMLU, pass@1, Elo, zero-data-retention, etc.) | Linked from every metric label/tooltip in the table — critical for the PM/decision-maker audience who won't know these terms |
| **Cost calculator** | "I send ~2M input / 500K output tokens/month" → ranked cost table | Pure client-side math off the `PricingTier` data — no backend needed |
| **Cost-vs-capability scatter plot** | Visual Pareto frontier: which models give the most capability per dollar | High-value differentiator for decision-makers — instantly shows "you're overpaying" or "there's a cheaper equivalent" |
| **Use-case recommender (wizard)** | "I need X for Y, with constraint Z" → ranked shortlist | Simple weighted-scoring function over the same schema; no ML needed for v1 |
| **Changelog** | Transparency on data updates | Builds trust; also useful for developers tracking pricing changes over time |
| **Sandbox / live prompt demo** (phase 2+) | Run the same prompt across models to see real output differences | Bring-your-own-API-key model to sidestep hosting cost/liability; rate-limit and never log the key server-side |

---

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js (App Router) + TypeScript** | Server components for data-heavy pages (comparison table, model cards) keep the client bundle light; ISR fits a dataset that changes daily/weekly, not per-request |
| Styling | **Tailwind CSS** | Fast to build a dense data table + card UI without fighting a component library; pairs well with shadcn/ui for table/select/dialog primitives |
| Data fetching/API | **Next.js Route Handlers**, optionally **tRPC** if the team is TypeScript end-to-end | tRPC buys end-to-end type safety between API and frontend without hand-written client SDK code |
| Database | **PostgreSQL** (hosted on Neon or Supabase) | Relational joins (model → scores → pricing) are the platform's core query pattern; Postgres arrays cover `modalities`/`regionsAvailable` cleanly |
| ORM | **Prisma** | Type-safe schema, easy migrations, good fit with Next.js API routes |
| Charts | **Recharts** (bar/radar/scatter) | Good React ergonomics for the capability-radar and cost-vs-capability scatter without D3 boilerplate |
| Search | **Fuse.js** (client-side) at MVP scale; **Meilisearch** if the catalog grows past a few hundred models | No need for heavy search infra at 4–50 models |
| Scheduled jobs | **GitHub Actions (cron)** or **Vercel Cron Jobs** | Runs the fetch-and-diff scripts on a schedule; GitHub Actions doubles as the review-PR mechanism |
| Hosting | **Vercel** (frontend) + **Neon/Supabase** (Postgres) | Zero-config Next.js deploys, edge caching, generous free tier for an MVP |
| Analytics | **Plausible or PostHog** | Privacy-respecting usage analytics without a heavy cookie banner |
| Error tracking | **Sentry** | Standard, low-effort integration |
| Testing | **Vitest** (unit) + **Playwright** (e2e) | Covers the sort/filter logic and the comparison-table interaction flows |

**Caching strategy:** since the dataset changes on the order of hours-to-days (not per request), use Next.js **ISR** (`revalidate: 3600` or similar) on the model directory and card pages. This drops DB load to near zero for normal traffic and only re-queries on the schedule or on manual revalidation after an editor approves a data change.

---

## 7. API design

| Method | Path | Purpose | Query params |
|---|---|---|---|
| `GET` | `/api/models` | List/filter models | `modality`, `provider`, `minContext`, `openWeights`, `sort` |
| `GET` | `/api/models/:slug` | Full model detail | — |
| `GET` | `/api/compare` | Payload for N models side-by-side | `ids=gpt-4o,claude-sonnet-5,llama-4-scout` |
| `GET` | `/api/providers/:id` | Provider info + its models | — |
| `GET` | `/api/benchmarks` | Benchmark metadata (name, description, methodology link) | — |
| `GET` | `/api/changelog` | Recent data changes | `since` |
| `POST` | `/api/feedback` | User-submitted correction | body: `{ modelSlug, field, note }` → writes to `pending_review`, never live |

### Example route handler

```ts
// app/api/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const modality = searchParams.get("modality");
  const provider = searchParams.get("provider");
  const sort = searchParams.get("sort") ?? "name";

  const models = await db.model.findMany({
    where: {
      ...(modality && { modalities: { has: modality } }),
      ...(provider && { provider: { name: provider } }),
    },
    include: { provider: true, benchmarkScores: true, pricingTiers: true },
    orderBy: { [sort]: "asc" },
  });

  return NextResponse.json(models);
}
```

```ts
// app/api/compare/route.ts
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids")?.split(",") ?? [];
  const models = await db.model.findMany({
    where: { slug: { in: ids } },
    include: { provider: true, capabilities: true, benchmarkScores: true, pricingTiers: true },
  });
  return NextResponse.json(models);
}
```

---

## 8. Starter project structure

```
/app
  /(marketing)/page.tsx           # landing page
  /models
    page.tsx                      # directory + comparison table
    /[slug]/page.tsx               # model card
  /compare/page.tsx                # side-by-side view (?ids=...)
  /glossary/page.tsx
  /api
    /models/route.ts
    /compare/route.ts
    /providers/[id]/route.ts
    /feedback/route.ts
/components
  ModelCard.tsx
  ComparisonTable.tsx
  FilterPanel.tsx
  CapabilityRadar.tsx
  CostScatter.tsx
  GlossaryTooltip.tsx
/lib
  db.ts                            # Prisma client singleton
  schema.ts                        # Zod schemas
  fetchers.ts                      # shared data-fetching helpers
/data
  seed/models.json                 # seed data for local dev
/scripts
  update-pricing.ts                # scheduled fetch-and-diff
  update-benchmarks.ts
/prisma
  schema.prisma
```

### Comparison table skeleton (accessible, sortable)

```tsx
// components/ComparisonTable.tsx
"use client";
import { useState } from "react";

type Column = { key: string; label: string };

export function ComparisonTable({ models, columns }: { models: any[]; columns: Column[] }) {
  const [sortKey, setSortKey] = useState(columns[0].key);
  const [asc, setAsc] = useState(true);

  const sorted = [...models].sort((a, b) => {
    const dir = asc ? 1 : -1;
    return a[sortKey] > b[sortKey] ? dir : -dir;
  });

  return (
    <table aria-label="Model comparison">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} scope="col">
              <button
                onClick={() => {
                  setAsc(sortKey === col.key ? !asc : true);
                  setSortKey(col.key);
                }}
                aria-sort={sortKey === col.key ? (asc ? "ascending" : "descending") : "none"}
              >
                {col.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((m) => (
          <tr key={m.id}>
            {columns.map((col) => <td key={col.key}>{m[col.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Scheduled update job (pseudocode — provider-specific parsing is the part you fill in)

```ts
// scripts/update-pricing.ts
// Runs on a schedule (GitHub Actions / Vercel Cron)
// 1. Fetch official pricing pages from an allowlist of provider URLs
// 2. Parse with a provider-specific adapter (HTML/JSON -> structured fields)
// 3. Diff parsed values against current PricingTier rows
// 4. On diff: write to `pending_review`, open a PR (or Slack alert) for a human editor
// 5. On approval: promote to the live table, stamp `lastVerifiedAt`, log to changelog
// NOTE: verify each provider's ToS permits automated fetching before enabling this per-source.
```

---

## 9. Accessibility, responsiveness, i18n

- **Accessibility:** semantic `<table>` markup with `scope="col"`, `aria-sort` on sortable headers (as in the snippet above); keyboard-navigable filters and comparison-pin controls; never encode status (e.g., "restricted region") by color alone — pair with an icon or text label; maintain WCAG AA contrast on badges/pills.
- **Responsive:** the wide comparison table doesn't survive mobile as-is — collapse to a stacked "accordion card per model" layout below ~768px, with the pinned-comparison view becoming a swipeable carousel of 1 model at a time.
- **Internationalization:** externalize UI strings via `next-intl`; format currency/numbers with `Intl.NumberFormat` per locale (pricing especially — don't hardcode `$`); glossary/benchmark names can stay in English initially since they're technical terms, but UI chrome (buttons, labels, nav) should be translatable from day one so it's not a rewrite later.

---

## 10. MVP scope & roadmap

**Phase 0 — MVP (aim: 3–4 weeks, 1–2 developers)**
- 4–6 models across 2–3 providers (e.g., one from each of OpenAI/Anthropic/Meta/Google families), manually curated and reviewed — no scraper yet.
- Core fields only: capabilities (editorial 1–5), 3–4 benchmark scores, pricing, context window, license/open-weights, one-line safety note.
- Static comparison table + model cards. No auth, no user accounts, no sandbox.
- Seed data as a reviewed JSON file (`/data/seed/models.json`), not a live pipeline yet.

**Phase 1 — breadth & polish**
- Filters, search, glossary, changelog.
- Capability radar chart + benchmark bar chart + cost-vs-capability scatter.
- First automated fetch-and-diff job (pricing only, since it's the highest-value freshness target), still gated by human review.

**Phase 2 — trust & scale**
- Expand to 15–30 models; community correction submissions with review queue.
- Compliance/region/deployment-option filtering (the enterprise-buyer features).
- Use-case recommender wizard.

**Phase 3 — engagement features**
- Bring-your-own-key sandbox for live prompt comparisons (rate-limited, key never persisted server-side).
- Public API for third parties to query the dataset.
- Historical trend charts (price/benchmark movement over time) — this becomes possible once the changelog has enough history.

---

## 11. Risks & governance notes

- **Landscape churn:** this space moves fast; design the schema and pipeline for frequent updates from day one rather than treating the model list as static seed data.
- **Benchmark non-comparability:** self-reported provider benchmarks aren't apples-to-apples (different prompting, different subsets). Always disclose the source/methodology link next to a score, and prefer independently-run evals where available.
- **Legal/ToS exposure:** don't scrape pages whose terms prohibit it — prefer official pricing feeds or manual entry with citation.
- **Perceived bias:** publish the methodology page and correction process publicly; a comparison site's entire value is trust, so any appearance of vendor favoritism (e.g., unexplained ranking order) is disproportionately damaging.

---

### Quick-reference: what to build first

If you only build one thing this week: the **Prisma schema + seed JSON for 4–6 models + a static sortable comparison table**. Everything else (filters, charts, pipeline automation) is additive on top of that core loop, and it's the fastest path to something a developer can actually use to make a decision.
