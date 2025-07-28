import { toTableName } from "@livestore/sync-electric";
import postgres from "postgres";

export const makeDb = (storeId) => {
  const tableName = toTableName(storeId);

  const sql = postgres({
    database: process.env.DB_NAME || "default",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "administrator",
    password: process.env.DB_PASSWORD || "qixqug-boqjim-3zeqvE",
    host: process.env.DB_HOST || "localhost",
  });

  const migrate = () =>
    sql`
    CREATE TABLE IF NOT EXISTS ${sql(tableName)} (
			"seqNum" INTEGER PRIMARY KEY,
      "parentSeqNum" INTEGER,
			"name" TEXT NOT NULL,
			"args" JSONB NOT NULL,
      "clientId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL
    );
	`;
  // -- schema_hash INTEGER NOT NULL,
  // -- created_at TEXT NOT NULL

  const debug = async () => {
    const result = await sql`SELECT * FROM ${sql(tableName)}`;
    return result;
  };

  const createEvents = async (events) => {
    await sql`INSERT INTO ${sql(tableName)} ${sql(events)}`;
  };

  return {
    migrate,
    createEvents,
    debug,
    disconnect: () => sql.end(),
  };
};
