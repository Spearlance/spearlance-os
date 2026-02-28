/**
 * SpearlanceOS Data Import Script (v2)
 *
 * Imports CSV exports from the old Supabase project into the current project.
 * CSVs use semicolon (;) delimiters with RFC 4180 quoting (multi-line fields).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/import-data.mjs
 *
 * Requires: @supabase/supabase-js (already installed)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://chikljxwgiskyjsnjelf.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY env var is required.\n" +
      "Get it from: Supabase Dashboard → Settings → API → service_role secret\n" +
      "Run: SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/import-data.mjs"
  );
  process.exit(1);
}

const CSV_DIR =
  process.env.CSV_DIR || "c:/Users/garre/Downloads/SpearlanceOS Tables";

// ─── Tables to SKIP ─────────────────────────────────────────────────────────
const SKIP_TABLES = new Set([
  "marketing_flow_task_templates", // seeded by migration
  "subscription_pricing",         // seeded
  "materialized_view_refreshes",  // internal tracking
  "temp_passwords",               // security
]);

// ─── Per-table config overrides ─────────────────────────────────────────────
const TABLE_CONFIG = {
  // Tables without an "id" column — use insert, not upsert
  page_daily: { noId: true },
  sources_daily: { noId: true },
  content_daily: { noId: true },

  // Generated columns that cannot be directly inserted
  communication_logs: { dropColumns: ["search_vector"] },

  // feature_flags uses "key" as unique constraint, not "id"
  feature_flags: { conflictColumn: "key" },

  // task_columns has composite unique on (client_id, key)
  task_columns: { conflictColumn: "id", ignoreDuplicates: true },

  // Enum mapping: old DB has values the new DB doesn't
  profiles: {
    transformRow: (row) => {
      const validRoles = ["admin", "fmm", "client"];
      if (row.role && !validRoles.includes(row.role)) {
        row.role = "client"; // map unknown roles to client
      }
      return row;
    },
  },
  user_roles: {
    transformRow: (row) => {
      const validRoles = ["admin", "fmm", "client"];
      if (row.role && !validRoles.includes(row.role)) {
        row.role = "client";
      }
      return row;
    },
  },
};

// ─── Import order (respects FK dependencies) ────────────────────────────────
const IMPORT_ORDER = [
  // Tier 0 — seed-like, no FK deps
  "billing_plans",
  "standard_marketing_stages",
  "feature_flags",
  "email_templates",

  // Tier 1 — auth-dependent
  "profiles",
  "user_roles",

  // Tier 2 — depends on profiles + billing_plans
  "clients",
  "marketing_tools",

  // Tier 3 — depends on clients and/or profiles
  "meetings",
  "tasks",
  "task_columns",
  "task_tags",
  "assets",
  "asset_folders",
  "avatars",
  "tickets",
  "launchpad_submissions",
  "brand_guides",
  "blog_posts",
  "blog_strategy_batches",
  "leads",
  "services",
  "competitors",
  "social_media_strategy",
  "chat_conversations",
  "clarity_configs",
  "late_profiles",
  "late_social_accounts",
  "marketing_flows",
  "notifications",
  "quarterly_goals",
  "reports",
  "seo_reports",
  "seo_keywords",
  "website_builds",
  "mood_boards",
  "daily_action_plans",
  "ai_generated_reports",
  "recommended_tools",
  "support_articles",
  "duda_conversations",
  "analytics_workspace_keys",
  "client_brand_voice",
  "client_business_model",
  "client_primary_contacts",
  "client_quick_links",
  "client_success_logs",
  "client_activity_metrics",
  "client_team_invitations",
  "communication_logs",

  // Tier 3.5 — depends on marketing_flows
  "marketing_flow_stages",
  "marketing_flow_channels",
  "marketing_flow_campaigns",
  "channel_weekly_kpis",

  // Tier 4 — depends on Tier 3
  "meeting_tasks",
  "task_comments",
  "task_assignees",
  "task_watchers",
  "task_tag_links",
  "task_recurrence_history",
  "task_comment_mentions",
  "asset_versions",
  "avatar_evidence",
  "ticket_messages",
  "blog_content_strategy",
  "blog_topics",
  "blog_post_revisions",
  "blog_ai_preferences",
  "social_media_posts",
  "social_media_generation_batches",
  "social_post_analytics",
  "social_post_comments",
  "chat_messages",
  "chat_audit_logs",
  "chat_rate_limits",
  "clarity_daily_metrics",
  "clarity_weekly_reports",
  "duda_conversation_comments",
  "website_pages",
  "website_build_pages",
  "website_build_tasks",
  "website_page_assets",
  "website_page_prompt_templates",
  "website_form_submissions",
  "marketing_flow_task_links",
  "marketing_flow_channel_notes",
  "marketing_ideas",
  "support_article_views",
  "support_article_feedback",

  // Tier 5 — analytics / deep deps
  "page_content_analysis",
  "page_daily",
  "sources_daily",
  "content_daily",
  "late_connection_invites",

  // Misc logs
  "admin_audit_logs",
  "admin_rate_limits",
  "admin_2fa_status",
  "api_error_logs",
  "front_webhook_logs",
  "cal_webhook_logs",
  "magic_link_requests",
  "user_activity_logs",
  "user_notification_preferences",
  "bug_reports",
];

// ─── CSV Parser (RFC 4180 compliant, handles multi-line quoted fields) ──────

function parseCSV(content) {
  const rows = [];
  let headers = null;
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          // Escaped double-quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"' && currentField === "") {
        // Start of quoted field
        inQuotes = true;
      } else if (ch === ";") {
        // Field separator
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        // End of row
        currentRow.push(currentField);
        currentField = "";

        if (ch === "\r") i++; // skip \n in \r\n

        if (!headers) {
          headers = currentRow;
        } else if (currentRow.length > 0 && currentRow.some((f) => f !== "")) {
          // Build row object
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = convertValue(currentRow[idx] ?? "");
          });
          rows.push(rowObj);
        }
        currentRow = [];
      } else if (ch === "\r") {
        // Bare \r — treat as newline
        currentRow.push(currentField);
        currentField = "";
        if (!headers) {
          headers = currentRow;
        } else if (currentRow.length > 0 && currentRow.some((f) => f !== "")) {
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = convertValue(currentRow[idx] ?? "");
          });
          rows.push(rowObj);
        }
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  // Handle final row (no trailing newline)
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (headers && currentRow.length > 0 && currentRow.some((f) => f !== "")) {
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = convertValue(currentRow[idx] ?? "");
      });
      rows.push(rowObj);
    }
  }

  return rows;
}

function convertValue(raw) {
  if (raw === "") return null;

  // Booleans
  if (raw === "true") return true;
  if (raw === "false") return false;

  // JSON arrays/objects — only parse simple ones, keep complex text as-is
  if (
    (raw.startsWith("[") && raw.endsWith("]")) ||
    (raw.startsWith("{") && raw.endsWith("}"))
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

// ─── File resolver ───────────────────────────────────────────────────────────

function findCSVFile(tableName) {
  const files = readdirSync(CSV_DIR).filter((f) =>
    f.startsWith(`${tableName}-export-`)
  );
  if (files.length === 0) return null;
  files.sort().reverse();
  return join(CSV_DIR, files[0]);
}

// ─── Auth user creation ──────────────────────────────────────────────────────

async function createAuthUsers(supabase, rows) {
  console.log(
    `\n  Creating ${rows.length} auth users (preserving original UUIDs)...`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.id || !row.email) {
      skipped++;
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      id: row.id,
      email: String(row.email).toLowerCase().trim(),
      email_confirm: true,
      password: randomUUID(),
      user_metadata: { name: row.name || "" },
      app_metadata: { provider: "email", providers: ["email"] },
    });

    if (error) {
      if (
        error.message?.includes("already exists") ||
        error.message?.includes("already been registered") ||
        error.message?.includes("duplicate key")
      ) {
        skipped++;
      } else {
        console.warn(`  ⚠ ${row.email}: ${error.message}`);
        failed++;
      }
    } else {
      created++;
    }

    await sleep(100);
  }

  console.log(
    `  → ${created} created, ${skipped} already exist, ${failed} failed`
  );
}

// ─── Main importer ───────────────────────────────────────────────────────────

const BATCH_SIZE = 200; // Smaller batches = better error isolation

async function importTable(supabase, tableName) {
  const filePath = findCSVFile(tableName);
  if (!filePath) return { status: "skipped", reason: "no CSV file found" };

  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    return { status: "error", reason: `cannot read: ${err.message}` };
  }

  let rows = parseCSV(content);
  if (rows.length === 0) return { status: "skipped", reason: "CSV is empty" };

  const config = TABLE_CONFIG[tableName] || {};

  // Apply row transform if configured
  if (config.transformRow) {
    rows = rows.map(config.transformRow);
  }

  // Drop columns that can't be inserted (generated columns, etc.)
  if (config.dropColumns) {
    rows = rows.map((row) => {
      const clean = { ...row };
      for (const col of config.dropColumns) delete clean[col];
      return clean;
    });
  }

  let imported = 0;
  let errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let result;

    if (config.noId) {
      // Tables without id — plain insert, ignore duplicates
      result = await supabase.from(tableName).insert(batch);
    } else {
      const conflictCol = config.conflictColumn || "id";
      const ignoreDups = config.ignoreDuplicates || false;
      result = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: conflictCol, ignoreDuplicates: ignoreDups });
    }

    if (result.error) {
      const msg = result.error.message;
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      errors.push(`b${batchNum}: ${msg.slice(0, 120)}`);

      // Row-by-row fallback for small batches
      if (batch.length <= BATCH_SIZE) {
        for (const row of batch) {
          let single;
          if (config.noId) {
            single = await supabase.from(tableName).insert(row);
          } else {
            single = await supabase
              .from(tableName)
              .upsert(row, {
                onConflict: config.conflictColumn || "id",
                ignoreDuplicates: true,
              });
          }
          if (!single.error) imported++;
        }
      }
    } else {
      imported += batch.length;
    }
  }

  return {
    status: errors.length === 0 ? "ok" : imported > 0 ? "partial" : "failed",
    rows: rows.length,
    imported,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SpearlanceOS Data Import v2");
  console.log("  Target:", SUPABASE_URL);
  console.log("  Source:", CSV_DIR);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Create auth users
  const profilesFile = findCSVFile("profiles");
  if (profilesFile) {
    const profileRows = parseCSV(readFileSync(profilesFile, "utf-8"));
    // Apply role transform so we can read emails
    const transformed = profileRows.map((r) => {
      const validRoles = ["admin", "fmm", "client"];
      if (r.role && !validRoles.includes(r.role)) r.role = "client";
      return r;
    });
    await createAuthUsers(supabase, transformed);
  }

  // Step 2: Build ordered table list
  const allCSVTables = new Set(
    readdirSync(CSV_DIR)
      .filter((f) => f.endsWith(".csv"))
      .map((f) => f.replace(/-export-[\d_-]+\.csv$/, ""))
  );
  for (const t of SKIP_TABLES) allCSVTables.delete(t);

  const orderedTables = [
    ...IMPORT_ORDER.filter((t) => allCSVTables.has(t)),
    ...[...allCSVTables].filter((t) => !IMPORT_ORDER.includes(t)).sort(),
  ];

  console.log(`\n  ${orderedTables.length} tables to import`);
  console.log(`  Skipping: ${[...SKIP_TABLES].join(", ")}\n`);

  // Step 3: Import
  const results = {};

  for (const tableName of orderedTables) {
    process.stdout.write(`  ● ${tableName.padEnd(45)}`);

    const result = await importTable(supabase, tableName);
    results[tableName] = result;

    if (result.status === "ok") {
      console.log(`✓  ${result.imported} rows`);
    } else if (result.status === "partial") {
      console.log(`◐  ${result.imported}/${result.rows} rows`);
      result.errors?.slice(0, 2).forEach((e) => console.log(`     ✗ ${e}`));
    } else if (result.status === "failed") {
      console.log(`✗  0/${result.rows} rows`);
      result.errors?.slice(0, 1).forEach((e) => console.log(`     ✗ ${e}`));
    } else if (result.status === "skipped") {
      console.log(`○  ${result.reason}`);
    } else {
      console.log(`✗  ${result.reason}`);
    }
  }

  // Step 4: Summary
  const ok = Object.values(results).filter((r) => r.status === "ok").length;
  const partial = Object.values(results).filter((r) => r.status === "partial").length;
  const failed = Object.values(results).filter((r) => r.status === "failed").length;
  const skipped = Object.values(results).filter((r) => r.status === "skipped").length;
  const totalRows = Object.values(results).reduce(
    (sum, r) => sum + (r.imported || 0),
    0
  );

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  ✓  ${ok} tables fully imported`);
  console.log(`  ◐  ${partial} tables partially imported`);
  console.log(`  ✗  ${failed} tables failed`);
  console.log(`  ○  ${skipped} tables skipped (empty CSV)`);
  console.log(`  📦 ${totalRows.toLocaleString()} total rows imported`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (partial > 0 || failed > 0) {
    console.log("Tables with issues:");
    for (const [table, result] of Object.entries(results)) {
      if (result.status === "partial" || result.status === "failed") {
        const pct = result.rows > 0
          ? Math.round((result.imported / result.rows) * 100)
          : 0;
        console.log(
          `  ${table}: ${result.imported}/${result.rows} (${pct}%)`
        );
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
