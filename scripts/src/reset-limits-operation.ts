type Connection = {
  query: (sql: string) => Promise<{ rows: Array<{ count?: string }>; rowCount: number | null }>;
};

// Only quota counters are reset. Authorization tickets and unrelated data survive.
const filter = "bucket LIKE 'visitor:%' OR bucket LIKE 'network:%'";
export async function resetFreeLimits(connection: Connection, confirm = false) {
  if (!confirm) {
    const result = await connection.query(`SELECT COUNT(*) AS count FROM decision_usage WHERE ${filter}`);
    return { changed: false, count: Number(result.rows[0]?.count ?? 0) };
  }
  await connection.query("BEGIN");
  try {
    const result = await connection.query(`DELETE FROM decision_usage WHERE ${filter}`);
    await connection.query("COMMIT");
    return { changed: true, count: result.rowCount ?? 0 };
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  }
}
