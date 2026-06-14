import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import deliverRouter from "./routes/deliver.js";

const app: Express = express();
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(deliverRouter);

export default app;
