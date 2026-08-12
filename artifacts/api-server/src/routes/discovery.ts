import { Router, type IRouter } from "express";
import {
  GetCatalogSummaryResponse,
  ListChangelogQueryParams,
  ListChangelogResponse,
  ListGlossaryResponse,
} from "@workspace/api-zod";
import { changelogEntries, glossaryTerms, modelProfiles } from "../data/models";

const router: IRouter = Router();

router.get("/catalog-summary", (_req, res) => {
  const providers = new Set(modelProfiles.map((model) => model.provider.id));
  const benchmarks = new Set(modelProfiles.flatMap((model) => model.benchmarks.map((benchmark) => benchmark.benchmark)));
  const lastUpdated = modelProfiles
    .map((model) => model.lastVerifiedAt)
    .sort()
    .at(-1) ?? "2026-08-01";
  const capabilityLeaders = ["Reasoning", "Coding", "Summarization", "Translation", "Vision"].map((category) => {
    const leader = modelProfiles
      .map((model) => ({
        model: model.name,
        score: model.capabilities.find((capability) => capability.category === category)?.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score)[0];
    return { category, model: leader.model, score: leader.score };
  });

  res.json(
    GetCatalogSummaryResponse.parse({
      modelCount: modelProfiles.length,
      providerCount: providers.size,
      benchmarkCount: benchmarks.size,
      lastUpdated,
      medianVerificationAgeDays: 9,
      priceTrend: "−18% average input cost since 2024",
      capabilityLeaders,
    }),
  );
});

router.get("/glossary", (_req, res) => {
  res.json(ListGlossaryResponse.parse(glossaryTerms));
});

router.get("/changelog", (req, res) => {
  const parsed = ListChangelogQueryParams.safeParse(req.query);
  const limit = parsed.success ? Math.max(1, Math.min(parsed.data.limit, 50)) : 10;
  res.json(ListChangelogResponse.parse(changelogEntries.slice(0, limit)));
});

export default router;