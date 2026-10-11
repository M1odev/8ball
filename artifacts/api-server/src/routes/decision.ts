import { Router, type IRouter } from "express";
import { PrepareDecisionBody, PrepareDecisionResponse, AnswerDecisionResponse } from "@workspace/api-zod";
import { DecisionError, toJevPrompt, getJevResponse } from "../lib/sendPrompts";

const router: IRouter = Router();
// No accounts in this MVP: cap total provider traffic and concurrent work.
let active = 0;
let windowStart = Date.now();
let count = 0;
router.use("/decision", (_req, res, next) => {
  if (Date.now() - windowStart > 60000) { count = 0; windowStart = Date.now(); }
  if (active >= 4 || count >= 30) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "8ball is busy. Please try again in a minute." });
    return;
  }
  count++;
  next();
});

for (const stage of ["prepare", "answer"] as const) {
  router.post(`/decision/${stage}`, async (req, res): Promise<void> => {
    active++;
    try {
      res.setHeader("Cache-Control", "no-store");
      if (stage === "prepare") {
        const parsed = PrepareDecisionBody.safeParse(req.body);
        if (!parsed.success || !parsed.data.input.trim()) {
          res.status(400).json({ error: "Enter a question between 1 and 4,000 characters." });
          return;
        }
        res.json(PrepareDecisionResponse.parse(await toJevPrompt(parsed.data.input.trim())));
      } else {
        res.json(AnswerDecisionResponse.parse(await getJevResponse(req.body)));
      }
    } catch (error) {
      const known = error instanceof DecisionError;
      req.log.warn({ stage, status: known ? error.status : 500 }, "Decision request failed");
      res.status(known ? error.status : 500).json({
        error: known ? error.message : "The decision could not be completed. Please try again.",
      });
    } finally {
      active--;
    }
  });
}
export default router;
