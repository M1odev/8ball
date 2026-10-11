import { Router, type IRouter } from "express";
import { PrepareDecisionBody, PrepareDecisionResponse, AnswerDecisionResponse } from "@workspace/api-zod";
import { DecisionError, toJevPrompt, getJevResponse, validatePrompt } from "../lib/sendPrompts";
import { formatTrace, type Trace } from "../lib/decisionTrace";
import { accessStatus, authorizePrepared, cleanExpiredAccess, consumeDecision, discardTicket, reserveDecision, visitor, visitorKey } from "../lib/decisionAccess";

const router: IRouter = Router();
// No accounts in this MVP: cap total provider traffic and concurrent work.
let active = 0;
let windowStart = Date.now();
let count = 0;
router.use("/decision", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    res.status(403).json({ error: "Open 8Ball directly to ask a question." });
    return;
  }
  if (req.method !== "POST") { next(); return; }
  if (Date.now() - windowStart > 60000) { count = 0; windowStart = Date.now(); }
  if (active >= 4 || count >= 30) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "8ball is busy. Please try again in a minute." });
    return;
  }
  count++;
  next();
});

router.get("/decision/access", async (req, res) => {
  try {
    res.json(await accessStatus(visitor(req, res, true)));
  } catch (error) {
    res.status(error instanceof DecisionError ? error.status : 503).json({
      error: error instanceof DecisionError ? error.message : "Could not load your free allowance. Please try again.",
    });
  }
});

// Cleanup contains no prompts or keys; lifetime visitor counters are never expired.
const cleanup = setInterval(() => {
  void cleanExpiredAccess().catch(() => console.warn("[8ball] Access cleanup failed."));
}, 60 * 60 * 1000);
cleanup.unref();

for (const stage of ["prepare", "answer"] as const) {
  router.post(`/decision/${stage}`, async (req, res): Promise<void> => {
    active++;
    let apiKey: string | undefined;
    let pendingTicket: string | undefined;
    const debugLog: string[] = [];
    const trace: Trace = (label, value) => {
      const entry = formatTrace(`${req.id} · ${label}`, value, apiKey ? [apiKey] : []);
      debugLog.push(entry);
      console.info(entry);
    };
    try {
      apiKey = visitorKey(req);
      const identity = visitor(req, res);
      trace(`${stage} input`, stage === "prepare" ? { input: req.body?.input } : {
        state: req.body?.state, question: req.body?.question,
      });
      if (stage === "prepare") {
        const parsed = PrepareDecisionBody.safeParse(req.body);
        if (!parsed.success || !parsed.data.input.trim()) {
          const error = "Enter a question between 1 and 4,000 characters.";
          trace("Validation error", error);
          res.status(400).json({ error, debugLog });
          return;
        }
        pendingTicket = await reserveDecision(identity, apiKey);
        const prompt = validatePrompt(await toJevPrompt(parsed.data.input.trim(), trace, apiKey));
        await authorizePrepared(pendingTicket, prompt);
        const result = PrepareDecisionResponse.parse({ ...prompt, ticket: pendingTicket });
        trace("Prepared context and question", result);
        res.json({ ...result, debugLog });
        pendingTicket = undefined;
      } else {
        const prompt = validatePrompt(req.body);
        await consumeDecision(identity, req.body?.ticket, prompt, apiKey);
        const result = AnswerDecisionResponse.parse(await getJevResponse(prompt, trace, apiKey));
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
      if (pendingTicket) await discardTicket(pendingTicket).catch(() => {});
      active--;
    }
  });
}
export default router;
