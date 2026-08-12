import { Router, type IRouter } from "express";
import {
  CompareModelsQueryParams,
  CompareModelsResponse,
  GetModelParams,
  GetModelResponse,
  ListModelsQueryParams,
  ListModelsResponse,
} from "@workspace/api-zod";
import { modelProfiles } from "../data/models";

const router: IRouter = Router();

function toSummary(model: (typeof modelProfiles)[number]) {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    provider: model.provider,
    family: model.family,
    modalities: [...model.modalities],
    contextWindow: model.contextWindow,
    openWeights: model.openWeights,
    license: model.license,
    capabilityScore: model.capabilityScore,
    inputPricePerM: model.inputPricePerM,
    outputPricePerM: model.outputPricePerM,
    complianceCerts: [...model.complianceCerts],
    deploymentOptions: [...model.deploymentOptions],
    lastVerifiedAt: model.lastVerifiedAt,
  };
}

function toProfile(model: (typeof modelProfiles)[number]) {
  return {
    ...toSummary(model),
    maxOutputTokens: model.maxOutputTokens,
    regionsAvailable: [...model.regionsAvailable],
    dataRetentionDays: model.dataRetentionDays,
    trainingOptOut: model.trainingOptOut,
    zeroDataRetention: model.zeroDataRetention,
    safetyPolicyUrl: model.safetyPolicyUrl,
    safetyNotes: model.safetyNotes,
    sdkLanguages: [...model.sdkLanguages],
    functionCalling: model.functionCalling,
    fineTuningSupport: model.fineTuningSupport,
    sourceUrl: model.sourceUrl,
    capabilities: model.capabilities.map((capability) => ({ ...capability })),
    benchmarks: model.benchmarks.map((benchmark) => ({ ...benchmark })),
    pricing: model.pricing.map((tier) => ({ ...tier })),
  };
}

router.get("/models", (req, res) => {
  const parsed = ListModelsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid model filters." });
    return;
  }

  const filters = parsed.data;
  const search = filters.search?.toLowerCase();
  const filtered = modelProfiles.filter((model) => {
    if (filters.provider && model.provider.name.toLowerCase() !== filters.provider.toLowerCase()) {
      return false;
    }
    if (filters.modality && !model.modalities.some((modality) => modality === filters.modality)) {
      return false;
    }
    if (filters.openWeights !== undefined && model.openWeights !== filters.openWeights) {
      return false;
    }
    if (filters.maxInputPrice !== undefined && model.inputPricePerM > filters.maxInputPrice) {
      return false;
    }
    if (filters.minContext !== undefined && model.contextWindow < filters.minContext) {
      return false;
    }
    if (filters.deployment && !model.deploymentOptions.some((deployment) => deployment === filters.deployment)) {
      return false;
    }
    if (
      search &&
      ![model.name, model.provider.name, model.family, model.slug]
        .join(" ")
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "price":
        return a.inputPricePerM - b.inputPricePerM;
      case "context":
        return b.contextWindow - a.contextWindow;
      case "capability":
      default:
        return b.capabilityScore - a.capabilityScore;
    }
  });

  res.json(ListModelsResponse.parse(filtered.map(toSummary)));
});

router.get("/models/:slug", (req, res) => {
  const params = GetModelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid model identifier." });
    return;
  }

  const model = modelProfiles.find((candidate) => candidate.slug === params.data.slug);
  if (!model) {
    res.status(404).json({ error: "Model not found." });
    return;
  }

  res.json(GetModelResponse.parse(toProfile(model)));
});

router.get("/compare", (req, res) => {
  const parsed = CompareModelsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose between two and four models to compare." });
    return;
  }

  const ids = [...new Set(parsed.data.ids.split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.length < 2 || ids.length > 4) {
    res.status(400).json({ error: "Choose between two and four models to compare." });
    return;
  }

  const selected = ids
    .map((id) => modelProfiles.find((model) => model.slug === id))
    .filter((model): model is (typeof modelProfiles)[number] => Boolean(model));

  if (selected.length !== ids.length) {
    res.status(404).json({ error: "One or more selected models could not be found." });
    return;
  }

  res.json(CompareModelsResponse.parse(selected.map(toProfile)));
});

export default router;