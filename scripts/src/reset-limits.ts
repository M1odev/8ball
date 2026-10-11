import { resetFreeLimits } from "./reset-limits-operation";

const args = process.argv.slice(2);
if (args.some(arg => !["--confirm", "--help"].includes(arg))) {
  console.error("Unknown argument. Run pnpm reset:limits --help.");
  process.exitCode = 1;
} else if (args.includes("--help")) {
  console.log(`Reset the three-question free allowance and daily network limits.

pnpm reset:limits             Preview the affected counter counts; no changes.
pnpm reset:limits --confirm   Reset free limits for ALL visitors.

Uses the database configured for this terminal environment. No API keys,
prompts, answers, or visitor cookies are changed. In-flight questions continue.
Short-term server traffic/concurrency limits are not reset.
Refresh the app afterward to see the renewed allowance.`);
} else {
  try {
    const { pool } = await import("@workspace/db");
    try {
      const connection = await pool.connect();
      try {
        const result = await resetFreeLimits(connection, args.includes("--confirm"));
        console.log(`${result.changed ? "Reset" : "Would reset"} ${result.count} free-usage counters.`);
        if (!result.changed) console.log("No changes made. Run pnpm reset:limits --confirm to restore free allowances for ALL visitors.");
        else console.log("Free allowances restored. Refresh the app to update the counter.");
      } finally { connection.release(); }
    } finally { await pool.end(); }
  } catch {
    // Database errors can include connection details; don't print them.
    console.error("Could not reset free limits. Check the database configuration and try again.");
    process.exitCode = 1;
  }
}
