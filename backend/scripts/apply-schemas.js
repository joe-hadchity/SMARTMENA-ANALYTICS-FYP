#!/usr/bin/env node
/**
 * apply-schemas.js
 *
 * Applies every schema_v*.sql file under backend/db/ that is newer than
 * what's already on the Supabase database.
 *
 * Needs a direct Postgres connection (the Supabase REST API cannot run DDL).
 * Provide it via ONE of:
 *
 *   DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres
 *
 * or the Supabase pooler (preferred for serverless):
 *
 *   DATABASE_URL=postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
 *
 * You can find these strings in the Supabase dashboard:
 *   Project Settings -> Database -> Connection string
 *
 * Usage:
 *   DATABASE_URL=... node scripts/apply-schemas.js
 *   DATABASE_URL=... node scripts/apply-schemas.js --only v10,v11
 */

const fs = require("fs");
const path = require("path");

let Client;
try {
  // eslint-disable-next-line global-require
  ({ Client } = require("pg"));
} catch (err) {
  console.error(
    "Missing 'pg' dependency. Install it with:\n" +
      "  npm install pg --no-save --legacy-peer-deps",
  );
  process.exit(1);
}

const DB_DIR = path.join(__dirname, "..", "db");

function parseArgs(argv) {
  const args = { only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--only" || argv[i] === "-o") {
      args.only = (argv[i + 1] || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      i += 1;
    }
  }
  return args;
}

function listSchemaFiles({ only }) {
  const all = fs
    .readdirSync(DB_DIR)
    .filter((f) => /^schema(_v\d+)?\.sql$/i.test(f))
    .sort((a, b) => {
      const n = (s) => {
        const m = s.match(/_v(\d+)/);
        return m ? Number(m[1]) : 1;
      };
      return n(a) - n(b);
    });

  if (!only) return all;
  return all.filter((f) => {
    const m = f.match(/_v(\d+)/);
    const tag = m ? `v${m[1]}` : "v1";
    return only.includes(tag);
  });
}

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error(
      "DATABASE_URL env var is required. Grab it from the Supabase\n" +
        "dashboard (Project Settings -> Database -> Connection string).",
    );
    process.exit(1);
  }
  const args = parseArgs(process.argv.slice(2));
  const files = listSchemaFiles(args);
  if (!files.length) {
    console.error("No schema files matched.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log(`Applying ${files.length} file(s)…`);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(DB_DIR, f), "utf8");
    process.stdout.write(`  - ${f} … `);
    const started = Date.now();
    try {
      await client.query(sql);
      console.log(`ok (${Date.now() - started}ms)`);
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      await client.end().catch(() => {});
      process.exit(1);
    }
  }

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("apply-schemas failed:", err);
  process.exit(1);
});
