import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePrompt, normalizeAnswer } from "./sendPrompts";

const noul = { state: "Some context", question: { type: "noul" as const, instructions: "Is it appropriate?" } };
const choice = { state: "Some context", question: { type: "choice" as const, instructions: "Which option?", criteria: { a: "Option A", b: "Option B" } } };

test("noul preserves probability of yes even when answer is no", () => {
  const result = normalizeAnswer(noul, { answers: { decision: { noul: 0.1 } } });
  assert.equal(result.answer, "NO");
  assert.equal(result.probability, 0.1);
  assert.deepEqual(result.options, []);
  assert.equal(normalizeAnswer(noul, { answers: { decision: { noul: 0.5 } } }).answer, "UNCERTAIN");
});
test("choice maps keys to labels without fabricating or renormalizing weights", () => {
  const result = normalizeAnswer(choice, { answers: { decision: { choice: "b", probabilities: { a: 0.2, b: 0.8 } } } });
  assert.equal(result.answer, "Option B");
  assert.deepEqual(result.options.map(o => o.weight), [0.2, 0.8]);
});
test("rejects unsupported score and insufficient options", () => {
  assert.throws(() => validatePrompt({ ...noul, question: { ...noul.question, type: "score" } }));
  assert.throws(() => validatePrompt({ ...choice, question: { ...choice.question, criteria: { a: "A" } } }));
  assert.throws(() => validatePrompt({ ...choice, state: " " }));
});
test("rejects absent, out-of-range and incomplete upstream results", () => {
  assert.throws(() => normalizeAnswer(noul, {}));
  assert.throws(() => normalizeAnswer(noul, { answers: { decision: { noul: 98 } } }));
  assert.throws(() => normalizeAnswer(choice, { answers: { decision: { choice: "a", probabilities: { a: 1 } } } }));
  assert.throws(() => normalizeAnswer(choice, { answers: { decision: { choice: "c", probabilities: { a: 0.5, b: 0.5 } } } }));
});
