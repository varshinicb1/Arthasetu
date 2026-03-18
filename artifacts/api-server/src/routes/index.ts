import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import fraudRouter from "./fraud";
import syncRouter from "./sync";
import logsRouter from "./logs";
import networkRouter from "./network";
import demoRouter from "./demo";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/transactions", transactionsRouter);
router.use("/fraud", fraudRouter);
router.use("/sync", syncRouter);
router.use("/logs", logsRouter);
router.use("/network", networkRouter);
router.use("/demo", demoRouter);
router.use("/profiles", profilesRouter);

export default router;
