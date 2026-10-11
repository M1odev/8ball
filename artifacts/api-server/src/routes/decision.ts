import { Router, type IRouter } from "express";
import { PrepareDecisionBody, PrepareDecisionResponse, AnswerDecisionResponse } from "@workspace/api-zod";
import { DecisionError, toJevPrompt, getJevResponse } from "../lib/sendPrompts";
import { formatTrace, type Trace } from "../lib/decisionTrace";

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
    const debugLog: string[] = [];
    const trace: Trace = (label, value) => {
      const entry = formatTrace(`${req.id} · ${label}`, value);
      debugLog.push(entry);
      console.info(entry);
    };
    trace(`${stage} input`, stage === "prepare" ? { input: req.body?.input } : {
      state: req.body?.state, question: req.body?.question,
    });
    try {
      res.setHeader("Cache-Control", "no-store");
      if (stage === "prepare") {
        const parsed = PrepareDecisionBody.safeParse(req.body);
        if (!parsed.success || !parsed.data.input.trim()) {
          const error = "Enter a question between 1 and 4,000 characters.";
          trace("Validation error", error);
          res.status(400).json({ error, debugLog });
          return;
        }
        const result = PrepareDecisionResponse.parse(await toJevPrompt(parsed.data.input.trim(), trace));
        trace("Prepared context and question", result);
        res.json({ ...result, debugLog });
      } else {
        const result = AnswerDecisionResponse.parse(await getJevResponse(req.body, trace));
        trace("Displayed decision", result);
        res.json({ ...result, debugLog });
      }
    } catch (error) {
      const known = error instanceof DecisionError;
      req.log.warn({ stage, status: known ? error.status : 500 }, "Decision request failed");
      trace("Decision error", known ? error.message : "The decision could not be completed. Please try again.");
      res.status(known ? error.status : 500).json({
        error: known ? error.message : "The decision could not be completed. Please try again.",
        debugLog,
      });
    } finally {
      active--;
    }
  });
}
export default router;
