import { Router, type IRouter } from "express";
import healthRouter from "./health";
import terrainRouter from "./terrain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(terrainRouter);

export default router;
