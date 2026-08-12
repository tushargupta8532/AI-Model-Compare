import { Router, type IRouter } from "express";
import healthRouter from "./health";
import modelsRouter from "./models";
import discoveryRouter from "./discovery";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(modelsRouter);
router.use(discoveryRouter);
router.use(feedbackRouter);

export default router;
