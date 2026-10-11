import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { DecisionError } from "./sendPrompts";

const FREE_LIMIT = 3;
const NETWORK_DAILY_LIMIT = 12;
const cookieName = "eightball_visitor";
type Identity = { owner: string; network: string };

function hash(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new DecisionError("Visitor access is not configured.", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function networkAddress(ip: string) {
  const address = ip.replace(/^::ffff:/i, "");
  if (isIP(address) === 4) return address;
  if (isIP(address) !== 6) throw new DecisionError("Could not identify your network. Please try again.", 503);
  // One IPv6 /64 shares a guard, rather than granting fresh trials for each address.
  const [left, right = ""] = address.split("::");
  const a = left ? left.split(":") : [];
  const b = right ? right.split(":") : [];
  return [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b]
    .slice(0, 4).map(part => parseInt(part, 16).toString(16)).join(":");
}

export function visitor(req: Request, res: Response, create = false): Identity {
  // Fail closed if signing is unavailable. Never accept unsigned visitor IDs.
  hash("configuration-check");
  let id = req.signedCookies?.[cookieName];
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) {
    if (!create) throw new DecisionError("Please enable cookies and refresh before asking a question.", 403);
    id = randomUUID();
    res.cookie(cookieName, id, {
      // Partitioned HTTPS cookies also work inside the embedded app preview.
      signed: true, httpOnly: true, sameSite: req.secure ? "none" : "lax", secure: req.secure,
      partitioned: req.secure,
      maxAge: 400 * 24 * 60 * 60 * 1000, path: "/",
    });
  }
  return { owner: hash(`visitor:${id}`), network: hash(`network:${networkAddress(req.ip ?? "")}`) };
}

export function visitorKey(req: Request): string | undefined {
  const key = req.get("X-8ball-key");
  if (key === undefined) return undefined;
  if (!/^[A-Za-z0-9._~-]{8,512}$/.test(key)) {
    throw new DecisionError("Enter a valid Hack Club AI key (8–512 characters, without spaces).", 400);
  }
  return key;
}

function buckets(identity: Identity) {
  return [`visitor:${identity.owner}`, `network:${identity.network}:${new Date().toISOString().slice(0, 10)}`];
}
const credential = (key?: string) => key === undefined ? "shared" : hash(`key:${key}`);

export async function accessStatus(identity: Identity) {
  const [browser, network] = buckets(identity);
  const { rows } = await pool.query<{ bucket: string; used: number }>(
    "SELECT bucket, used FROM decision_usage WHERE bucket = ANY($1::text[])", [[browser, network]],
  );
  return {
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - (rows.find(row => row.bucket === browser)?.used ?? 0)),
    networkLimited: (rows.find(row => row.bucket === network)?.used ?? 0) >= NETWORK_DAILY_LIMIT,
  };
}

export async function reserveDecision(identity: Identity, key?: string) {
  if (key === undefined && !process.env.API_KEY) throw new DecisionError("Free access is unavailable. Please use your own Hack Club key.", 503);
  const connection = await pool.connect();
  const ticket = randomUUID();
  try {
    await connection.query("BEGIN");
    if (key === undefined) {
      const names = buckets(identity);
      for (let i = 0; i < names.length; i++) {
        const cap = i === 0 ? FREE_LIMIT : NETWORK_DAILY_LIMIT;
        const expires = i === 0 ? null : new Date(Date.now() + 2 * 86400000);
        // The conditional UPSERT is atomic across tabs, processes, and deployments.
        const result = await connection.query(
          `INSERT INTO decision_usage (bucket, used, expires_at) VALUES ($1, 1, $2)
           ON CONFLICT (bucket) DO UPDATE SET used = decision_usage.used + 1
           WHERE decision_usage.used < $3 RETURNING used`, [names[i], expires, cap],
        );
        if (!result.rowCount) throw new DecisionError(i === 0
          ? "You've used your three free questions. Add your own Hack Club key to continue."
          : "Free access from this network is temporarily limited. Use your own key or try tomorrow.", 429);
      }
    }
    await connection.query(
      "INSERT INTO decision_tickets (id, owner, credential, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '20 minutes')",
      [ticket, identity.owner, credential(key)],
    );
    await connection.query("COMMIT");
    return ticket;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

export async function authorizePrepared(ticket: string, prompt: unknown) {
  const result = await pool.query(
    "UPDATE decision_tickets SET prompt_hash = $2, expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $1 RETURNING id",
    [ticket, hash(JSON.stringify(prompt))],
  );
  if (!result.rowCount) throw new DecisionError("This question expired. Please submit it again.", 409);
}

export async function consumeDecision(identity: Identity, ticket: unknown, prompt: unknown, key?: string) {
  if (typeof ticket !== "string" || !/^[0-9a-f-]{36}$/.test(ticket)) {
    throw new DecisionError("Prepare a question before requesting an answer.", 400);
  }
  const result = await pool.query(
    `DELETE FROM decision_tickets WHERE id = $1 AND owner = $2 AND credential = $3
     AND prompt_hash = $4 AND expires_at > NOW() RETURNING id`,
    [ticket, identity.owner, credential(key), hash(JSON.stringify(prompt))],
  );
  if (!result.rowCount) throw new DecisionError("This question expired, changed, or was already answered. Please submit it again.", 409);
}

export async function discardTicket(ticket: string) {
  await pool.query("DELETE FROM decision_tickets WHERE id = $1", [ticket]);
}

export async function cleanExpiredAccess() {
  await pool.query("DELETE FROM decision_tickets WHERE expires_at < NOW()");
  await pool.query("DELETE FROM decision_usage WHERE expires_at < NOW()");
}
