import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { pool } from "@workspace/db";
import app from "../app";
import { accessStatus, authorizePrepared, consumeDecision, networkAddress, reserveDecision } from "./decisionAccess";

const namespace = `test-${randomUUID()}`;
const owners: string[] = [];
const networks: string[] = [];
const identity = (name: string, network = name) => {
  const owner = `${namespace}-${name}`;
  const net = `${namespace}-${network}`;
  owners.push(owner); networks.push(net);
  return { owner, network: net };
};
const prompt = { state: "Fixture context", question: { type: "noul", instructions: "Is this a test?" } };

after(async () => {
  for (const owner of owners) {
    await pool.query("DELETE FROM decision_tickets WHERE owner = $1", [owner]);
    await pool.query("DELETE FROM decision_usage WHERE bucket = $1", [`visitor:${owner}`]);
  }
  for (const network of networks) {
    await pool.query("DELETE FROM decision_usage WHERE bucket LIKE $1", [`network:${network}:%`]);
  }
  await pool.end();
});

test("three lifetime reservations are atomic across concurrent requests; BYOK does not spend allowance", async () => {
  const who = identity("concurrent");
  const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => reserveDecision(who)));
  assert.equal(attempts.filter(attempt => attempt.status === "fulfilled").length, 3);
  assert.equal(attempts.filter(attempt => attempt.status === "rejected").length, 9);
  assert.deepEqual(await accessStatus(who), { limit: 3, remaining: 0, networkLimited: false });
  assert.ok(await reserveDecision(who, "visitor-fixture-key"));
  assert.equal((await accessStatus(who)).remaining, 0);
});

test("network guard spans new visitors, rolls back denied reservations, and permits BYOK", async () => {
  for (let i = 0; i < 12; i++) await reserveDecision(identity(`network-person-${i}`, "shared-network"));
  const next = identity("network-denied", "shared-network");
  await assert.rejects(reserveDecision(next), /network/);
  assert.deepEqual(await accessStatus(next), { limit: 3, remaining: 3, networkLimited: true });
  assert.ok(await reserveDecision(next, "visitor-fixture-key"));
});

test("tickets bind to visitor, credential, exact prompt, expiry, and one atomic redemption", async () => {
  const who = identity("ticket");
  const key = "ticket-fixture-key";
  const ticket = await reserveDecision(who, key);
  await assert.rejects(consumeDecision(who, ticket, prompt, key), /expired/);
  await authorizePrepared(ticket, prompt);
  await assert.rejects(consumeDecision(identity("intruder"), ticket, prompt, key), /expired/);
  await assert.rejects(consumeDecision(who, ticket, prompt), /expired/);
  await assert.rejects(consumeDecision(who, ticket, prompt, "wrong-fixture-key"), /expired/);
  await assert.rejects(consumeDecision(who, ticket, { ...prompt, state: "tampered" }, key), /changed/);
  const attempts = await Promise.allSettled([
    consumeDecision(who, ticket, prompt, key), consumeDecision(who, ticket, prompt, key),
  ]);
  assert.equal(attempts.filter(attempt => attempt.status === "fulfilled").length, 1);
  const expired = await reserveDecision(who, key);
  await authorizePrepared(expired, prompt);
  await pool.query("UPDATE decision_tickets SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [expired]);
  await assert.rejects(consumeDecision(who, expired, prompt, key), /expired/);
});

test("IPv6 privacy addresses share a /64 and IPv4 mapped addresses normalize", () => {
  assert.equal(networkAddress("2001:db8:abcd:1234::1"), networkAddress("2001:db8:abcd:1234:aaaa:bbbb:cccc:dddd"));
  assert.equal(networkAddress("::ffff:192.0.2.1"), "192.0.2.1");
});

test("HTTP flow enforces quota, blocks replay and tampering, routes every BYOK stage, and redacts key echoes", async t => {
  // This suite must only run with fixture credentials, never real upstream services.
  assert.equal(process.env.API_KEY, "test-shared-key");
  assert.equal(process.env.SESSION_SECRET, "test-session-secret");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/decision`;
  const actualFetch = globalThis.fetch;
  const providerKeys: string[] = [];
  const logs: string[] = [];
  t.mock.method(console, "info", (entry: string) => { logs.push(entry); });
  t.mock.method(globalThis, "fetch", async (target: string | URL | Request, init?: RequestInit) => {
    if (!String(target).startsWith("https://ai.hackclub.com/")) return actualFetch(target, init);
    const key = new Headers(init?.headers).get("Authorization")!;
    providerKeys.push(key);
    if (key === "Bearer rejected-fixture-key") return Response.json({ error: "Rejected rejected-fixture-key" }, { status: 401 });
    if (String(target).endsWith("exa/search")) return Response.json({ results: [{ title: "Fixture", url: "https://example.com", text: "Fixture evidence" }] });
    if (String(target).endsWith("jev/systemone")) return Response.json({ answers: { decision: { noul: .7 } } });
    const body = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ message: { content: JSON.stringify(body.messages.length > 2
      ? prompt : { research: { queries: ["fixture query"], reason: "test" } }) } }] });
  });
  const ip = "198.51.100.219";
  const hash = (value: string) => createHmac("sha256", "test-session-secret").update(value).digest("hex");
  networks.push(hash(`network:${ip}`));
  const statusResponse = await fetch(`${url}/access`, { headers: { "X-Forwarded-For": ip } });
  assert.equal(statusResponse.status, 200);
  const cookie = statusResponse.headers.get("set-cookie")!.split(";")[0];
  const rawId = decodeURIComponent(cookie.split("=")[1]).slice(2).split(".")[0];
  owners.push(hash(`visitor:${rawId}`));
  const headers = { Cookie: cookie, "X-Forwarded-For": ip, "Content-Type": "application/json" };
  const request = (stage: string, data: unknown, key?: string) => fetch(`${url}/${stage}`, {
    method: "POST", headers: { ...headers, ...(key ? { "X-8ball-key": key } : {}) }, body: JSON.stringify(data),
  });
  for (let i = 0; i < 3; i++) {
    const prepared = await request("prepare", { input: "Fixture question" });
    assert.equal(prepared.status, 200);
    const body = await prepared.json() as Record<string, unknown>;
    if (i === 0) {
      const forged = await request("answer", { ...body, state: "changed" });
      assert.equal(forged.status, 409);
    }
    assert.equal((await request("answer", body)).status, 200);
    assert.equal((await request("answer", body)).status, 409);
  }
  const before = providerKeys.length;
  assert.equal((await request("prepare", { input: "Fourth question" })).status, 429);
  assert.equal(providerKeys.length, before);
  const own = await request("prepare", { input: "BYOK question" }, "visitor-fixture-key");
  assert.equal(own.status, 200);
  assert.equal((await request("answer", await own.json(), "visitor-fixture-key")).status, 200);
  assert.deepEqual(providerKeys.slice(before), Array(4).fill("Bearer visitor-fixture-key"));
  const rejected = await request("prepare", { input: "Invalid key question" }, "rejected-fixture-key");
  assert.equal(rejected.status, 401);
  assert.ok(!(await rejected.text()).includes("rejected-fixture-key"));
  assert.ok(!logs.join("\n").includes("rejected-fixture-key"));
  const final = await fetch(`${url}/access`, { headers });
  assert.equal((await final.json() as { remaining: number }).remaining, 0);
  assert.equal((await fetch(`${url}/answer`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prompt),
  })).status, 403);
});
