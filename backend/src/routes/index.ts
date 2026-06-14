import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import customersRouter from "./customers.js";
import statsRouter from "./stats.js";
import segmentsRouter from "./segments.js";
import campaignsRouter from "./campaigns.js";
import receiptsRouter from "./receipts.js";
import aiRouter from "./ai.js";
import seedRouter from "./seed.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(statsRouter);
router.use(segmentsRouter);
router.use(campaignsRouter);
router.use(receiptsRouter);
router.use(aiRouter);
router.use(seedRouter);

export default router;
