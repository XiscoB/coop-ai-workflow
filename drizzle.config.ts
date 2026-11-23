import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env.local por defecto: lo leemos aquí (solo KEY=VALUE,
// sin comillas ni espacios, como el .env.example del repo).
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf-8").split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // el archivo no existe: siguiente candidato
  }
}

const rawUrl = process.env.DATABASE_URL ?? "";
const parsed = new URL(rawUrl);

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  dbCredentials: {
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: parsed.hostname.includes("localhost") || parsed.hostname === "127.0.0.1"
      ? false
      : true,
  },
});
