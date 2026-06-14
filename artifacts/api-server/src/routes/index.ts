import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import statsRouter from "./stats";
import segmentsRouter from "./segments";
import campaignsRouter from "./campaigns";
import receiptsRouter from "./receipts";
import aiRouter from "./ai";
import seedRouter from "./seed";

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
