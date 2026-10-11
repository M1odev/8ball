import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePrompt, normalizeAnswer, toJevPrompt, getJevResponse } from "./sendPrompts";
import { formatTrace } from "./decisionTrace";

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

test("traces preserve long content while redacting credential fields", () => {
  const content = "Full context.\n".repeat(2000);
  const entry = formatTrace("response", { content, nested: { api_key: "test-only-credential" } });
  assert.equal(JSON.parse(entry.slice(entry.indexOf("\n") + 1)).content, content);
  assert.ok(!entry.includes("test-only-credential"));
  assert.ok(entry.includes("[REDACTED]"));
});

test("both provider stages emit full request and raw response traces", async t => {
  const claude = { choices: [{ message: { content: JSON.stringify(noul) } }], usage: { total_tokens: 123 } };
  const jev = { answers: { decision: { noul: 0.7 } }, metadata: { fixture: true } };
  t.mock.method(globalThis, "fetch", async (url: string) =>
    new Response(JSON.stringify(url.endsWith("chat/completions") ? claude : jev), { status: 200 }));
  const entries: Array<{ label: string; value: any }> = [];
  const trace = (label: string, value: unknown) => {
    if (label.includes("attempt")) entries.push({ label, value });
  };
  const prepared = await toJevPrompt("Fixture question", trace);
  await getJevResponse(prepared, trace);
  assert.equal(entries.length, 4);
  assert.equal(entries[0].value.messages[1].content, "Fixture question");
  assert.ok(entries[0].value.messages[0].content.includes("You prepare one decision"));
  assert.deepEqual(entries[1].value, claude);
  assert.equal(entries[2].value.state, prepared.state);
  assert.deepEqual(entries[3].value, jev);
});

const completion = (value: unknown) => ({ choices: [{ message: { content: JSON.stringify(value) } }] });
const researchRequest = { research: { queries: ["official product pricing"], reason: "Current prices needed" } };

test("research runs Exa then rebuilds context, preserving evidence and choice labels", async t => {
  const calls: Array<{ url: string; body: any }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(init.body as string) });
    const response = calls.length === 1 ? completion(researchRequest)
      : url.endsWith("exa/search") ? { results: [{
        title: "Official pricing", url: "https://example.com/pricing",
        publishedDate: "2026-10-01", text: "Product A costs $5. Product B costs $10.",
      }] } : completion(choice);
    return new Response(JSON.stringify(response));
  });
  const prepared = await toJevPrompt("Compare current prices for Option A and Option B");
  assert.equal(calls.length, 3);
  assert.ok(calls[1].url.endsWith("exa/search"));
  assert.equal(calls[1].body.numResults, 3);
  assert.equal(calls[1].body.contents.text.maxCharacters, 2000);
  assert.ok(calls[2].body.messages[3].content.includes("Product A costs $5"));
  assert.ok(calls[2].body.messages[3].content.includes("untrusted web evidence"));
  assert.ok(prepared.state.includes("https://example.com/pricing"));
  assert.deepEqual(prepared.question.criteria, choice.question.criteria);
});

test("empty results are explicit evidence gaps, not fabricated research", async t => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(
    ++call === 1 ? completion(researchRequest) : call === 2 ? { results: [] } : completion(noul),
  )));
  const prepared = await toJevPrompt("Research a topic with no results");
  assert.equal(call, 3);
  assert.ok(prepared.state.includes("No usable sources returned"));
});

test("invalid research queries never call Exa", async t => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => {
    call++;
    return new Response(JSON.stringify(completion({ research: { queries: ["a", "b", "c"], reason: "too many" } })));
  });
  await assert.rejects(toJevPrompt("Research"), /invalid research request/);
  assert.equal(call, 1);
});

test("a second research request is rejected instead of looping", async t => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(
    ++call === 2 ? { results: [] } : completion(researchRequest),
  )));
  await assert.rejects(toJevPrompt("Research"), /more research than allowed/);
  assert.equal(call, 3);
});

test("Exa failure is explicit and does not silently prepare unresearched context", async t => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => ++call === 1
    ? new Response(JSON.stringify(completion(researchRequest)))
    : new Response(JSON.stringify({ error: "fixture unavailable" }), { status: 403 }));
  await assert.rejects(toJevPrompt("Research"), /Web research failed/);
  assert.equal(call, 2);
});
