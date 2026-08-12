import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { SubmitFeedbackBody, SubmitFeedbackResponse } from "@workspace/api-zod";
import { db, feedbackTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Include a model, field, and correction note." });
    return;
  }

  const id = randomUUID();
  await db.insert(feedbackTable).values({
    id,
    modelSlug: parsed.data.modelSlug,
    field: parsed.data.field,
    note: parsed.data.note,
  });

  req.log.info({ id, modelSlug: parsed.data.modelSlug }, "Model correction received");
  res.status(201).json(
    SubmitFeedbackResponse.parse({
      id,
      message: "Thanks — your correction is queued for editorial review.",
    }),
  );
});

export default router;