import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decisionRouter from "./decision";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionRouter);

export default router;
