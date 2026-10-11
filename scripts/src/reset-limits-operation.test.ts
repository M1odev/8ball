import { test } from "node:test";
import assert from "node:assert/strict";
import { resetFreeLimits } from "./reset-limits-operation";

test("preview is read-only", async () => {
  const calls: string[] = [];
  const result = await resetFreeLimits({ query: async sql => {
    calls.push(sql); return { rows: [{ count: "4" }], rowCount: 1 };
  } });
  assert.deepEqual(result, { changed: false, count: 4 });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^SELECT/);
});

test("confirmed reset transaction targets only visitor and network quota counters", async () => {
  const calls: string[] = [];
  const result = await resetFreeLimits({ query: async sql => {
    calls.push(sql); return { rows: [], rowCount: sql.startsWith("DELETE") ? 5 : 0 };
  } }, true);
  assert.deepEqual(result, { changed: true, count: 5 });
  assert.equal(calls[0], "BEGIN");
  assert.match(calls[1], /^DELETE FROM decision_usage WHERE bucket LIKE 'visitor:%' OR bucket LIKE 'network:%'$/);
  assert.equal(calls[2], "COMMIT");
});

test("failed reset rolls back rather than partially applying changes", async () => {
  const calls: string[] = [];
  await assert.rejects(resetFreeLimits({ query: async sql => {
    calls.push(sql);
    if (sql.startsWith("DELETE")) throw new Error("Fixture failure");
    return { rows: [], rowCount: 0 };
  } }, true), /Fixture failure/);
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.ok(!calls.includes("COMMIT"));
});
