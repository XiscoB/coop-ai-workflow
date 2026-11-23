import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

let cached: Db | null = null;

function isNeonUrl(url: string): boolean {
  return url.includes(".neon.tech") || process.env.DATABASE_DRIVER === "neon";
}

function createClient(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env.local y configura la base de datos.",
    );
  }
  // Neon (producción/Vercel): driver serverless por HTTP, sin conexiones
  // persistentes. Cualquier otro Postgres (local, Docker): driver TCP clásico.
  if (isNeonUrl(url)) {
    return drizzleNeon(neon(url), { schema });
  }
  return drizzleNode(new Pool({ connectionString: url }), { schema });
}

export function getDb(): Db {
  if (!cached) cached = createClient();
  return cached;
}
