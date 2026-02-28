/**
 * Generate SQL to insert auth users with original UUIDs preserved.
 *
 * Run this FIRST, before import-data.mjs.
 * It reads profiles.csv and generates a SQL file you apply via psql.
 *
 * Usage:
 *   node scripts/generate-auth-users-sql.mjs
 *
 * Then apply the output via psql:
 *   psql "postgresql://postgres.chikljxwgiskyjsnjelf:[YOUR_DB_PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres" \
 *     -f scripts/auth-users-insert.sql
 *
 * Get your DB password from: Supabase Dashboard → Settings → Database → Database password
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const CSV_DIR =
  process.env.CSV_DIR ||
  "c:/Users/garre/Downloads/SpearlanceOS Tables";

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ";" && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCSV(content) {
  const lines = content.split("\n");
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

// ─── SQL helpers ─────────────────────────────────────────────────────────────

function sqlStr(val) {
  if (!val || val === "") return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const files = readdirSync(CSV_DIR)
  .filter((f) => f.startsWith("profiles-export-"))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error("❌ No profiles-export CSV found in", CSV_DIR);
  process.exit(1);
}

const profilesPath = join(CSV_DIR, files[0]);
console.log("Reading:", profilesPath);

const content = readFileSync(profilesPath, "utf-8");
const rows = parseCSV(content);
console.log(`Found ${rows.length} profiles`);

const now = new Date().toISOString();

const insertStatements = rows
  .filter((r) => r.id && r.email)
  .map((r) => {
    const id = r.id;
    const email = r.email.toLowerCase().trim();
    const createdAt = r.created_at || now;

    return `INSERT INTO auth.users (
  id,
  instance_id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  encrypted_password
) VALUES (
  ${sqlStr(id)},
  '00000000-0000-0000-0000-000000000000',
  ${sqlStr(email)},
  ${sqlStr(createdAt)},
  ${sqlStr(createdAt)},
  ${sqlStr(now)},
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;`;
  });

const sql = `-- Auth users migration for SpearlanceOS
-- Generated: ${now}
-- Source: ${profilesPath}
-- ${rows.length} users
--
-- Apply with:
--   psql "postgresql://postgres.chikljxwgiskyjsnjelf:[YOUR_DB_PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -f scripts/auth-users-insert.sql

BEGIN;

${insertStatements.join("\n\n")}

COMMIT;
`;

const outPath = "scripts/auth-users-insert.sql";
writeFileSync(outPath, sql, "utf-8");

console.log(`\n✓ Written: ${outPath}`);
console.log(`  ${insertStatements.length} INSERT statements`);
console.log(`\nNext step:`);
console.log(`  1. Get your DB password from Supabase Dashboard → Settings → Database`);
console.log(`  2. Run:`);
console.log(`     psql "postgresql://postgres.chikljxwgiskyjsnjelf:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres" \\`);
console.log(`       -f scripts/auth-users-insert.sql`);
console.log(`  3. Then run: SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/import-data.mjs`);
