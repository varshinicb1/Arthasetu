import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Initialize a persistent local Postgres database via WASM
const client = new PGlite("./arthasetu_local_db");
export const db = drizzle(client, { schema });

// Auto-migrate tables since it's a local embedded DB
client.exec(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR PRIMARY KEY,
    name VARCHAR,
    trust_score INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  -- Simplistic mock table setup for demo
`).catch(console.error);

export * from "./schema";
