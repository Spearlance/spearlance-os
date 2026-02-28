/**
 * SpearlanceOS Data Import — Fixup Pass
 *
 * Resolves FK cascade failures from the v2 import:
 * 1. Replaces auto-created task_columns with originals (preserving UUIDs)
 * 2. Replaces seeded standard_marketing_stages with originals
 * 3. Re-imports marketing flow chain + task chain
 * 4. Handles circular FKs (assets ↔ asset_folders, blog_posts ↔ blog_topics)
 * 5. Imports large daily tables efficiently
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/import-fixup.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://chikljxwgiskyjsnjelf.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY env var required.");
  process.exit(1);
}

const CSV_DIR =
  process.env.CSV_DIR || "c:/Users/garre/Downloads/SpearlanceOS Tables";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CSV Parser (same as import-data.mjs) ─────────────────────────────────

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
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"' && currentField === "") {
        inQuotes = true;
      } else if (ch === ";") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        currentRow.push(currentField);
        currentField = "";
        if (ch === "\r") i++;

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
      } else if (ch === "\r") {
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
  if (raw === "true") return true;
  if (raw === "false") return false;
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

function findCSVFile(tableName) {
  const files = readdirSync(CSV_DIR).filter((f) =>
    f.startsWith(`${tableName}-export-`)
  );
  if (files.length === 0) return null;
  files.sort().reverse();
  return join(CSV_DIR, files[0]);
}

function loadCSV(tableName) {
  const filePath = findCSVFile(tableName);
  if (!filePath) return [];
  return parseCSV(readFileSync(filePath, "utf-8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 200;

async function upsertTable(tableName, rows, opts = {}) {
  const { conflictColumn = "id", dropColumns = [], transformRow, noId = false } = opts;
  if (rows.length === 0) {
    console.log(`  ○ ${tableName}: no rows`);
    return 0;
  }

  if (transformRow) rows = rows.map(transformRow);

  if (dropColumns.length > 0) {
    rows = rows.map((row) => {
      const clean = { ...row };
      for (const col of dropColumns) delete clean[col];
      return clean;
    });
  }

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let result;

    if (noId) {
      result = await supabase.from(tableName).insert(batch);
    } else {
      result = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: true });
    }

    if (result.error) {
      // Row-by-row fallback
      for (const row of batch) {
        let single;
        if (noId) {
          single = await supabase.from(tableName).insert(row);
        } else {
          single = await supabase
            .from(tableName)
            .upsert(row, { onConflict: conflictColumn, ignoreDuplicates: true });
        }
        if (single.error) {
          errors++;
          if (errors <= 3) {
            console.log(`     ✗ ${single.error.message.slice(0, 120)}`);
          }
        } else {
          imported++;
        }
      }
    } else {
      imported += batch.length;
    }
  }

  const symbol = errors === 0 ? "✓" : imported > 0 ? "◐" : "✗";
  console.log(`  ${symbol} ${tableName}: ${imported}/${rows.length} rows${errors > 0 ? ` (${errors} errors)` : ""}`);
  return imported;
}

async function deleteAllRows(tableName) {
  // Supabase client .delete() requires a filter — use a tautology
  const { error, count } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .gte("created_at", "1970-01-01");

  if (error) {
    // Try alternative filter
    const { error: err2, count: c2 } = await supabase
      .from(tableName)
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (err2) {
      console.log(`  ⚠ Could not delete from ${tableName}: ${err2.message}`);
      return 0;
    }
    return c2 || 0;
  }
  return count || 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SpearlanceOS Import — Fixup Pass");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 1: standard_marketing_stages UUID mismatch
  // The new DB seeded these with different UUIDs. Delete and reimport.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("Fix 1: standard_marketing_stages UUID mismatch");

  const stagesCSV = loadCSV("standard_marketing_stages");
  const deleted1 = await deleteAllRows("standard_marketing_stages");
  console.log(`  Deleted ${deleted1} seeded rows`);
  await upsertTable("standard_marketing_stages", stagesCSV);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 2: task_columns — auto-created with different UUIDs
  // Tasks reference old column UUIDs. Replace with originals.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 2: task_columns UUID mismatch");

  const taskColCSV = loadCSV("task_columns");
  const deleted2 = await deleteAllRows("task_columns");
  console.log(`  Deleted ${deleted2} auto-created rows`);
  await upsertTable("task_columns", taskColCSV);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 3: Re-import tasks (now task_columns has correct UUIDs)
  // Delete the 22 partial tasks, reimport all 267
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 3: Re-import tasks + dependents");

  const tasksCSV = loadCSV("tasks");
  // Upsert will update the 22 existing + insert the remaining 245
  await upsertTable("tasks", tasksCSV);

  // Task dependents
  await upsertTable("task_comments", loadCSV("task_comments"));
  await upsertTable("task_assignees", loadCSV("task_assignees"));
  await upsertTable("task_watchers", loadCSV("task_watchers"));
  await upsertTable("website_build_tasks", loadCSV("website_build_tasks"));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 4: Re-import marketing flow chain
  // Now standard_marketing_stages has original UUIDs.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 4: Marketing flow chain");

  await upsertTable("marketing_flow_stages", loadCSV("marketing_flow_stages"));
  await upsertTable("marketing_flow_channels", loadCSV("marketing_flow_channels"));
  await upsertTable("marketing_flow_campaigns", loadCSV("marketing_flow_campaigns"));
  await upsertTable("channel_weekly_kpis", loadCSV("channel_weekly_kpis"));
  await upsertTable("marketing_flow_task_links", loadCSV("marketing_flow_task_links"));
  await upsertTable("marketing_flow_channel_notes", loadCSV("marketing_flow_channel_notes"));
  await upsertTable("marketing_ideas", loadCSV("marketing_ideas"));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 5: Circular FKs — assets ↔ asset_folders
  // Step 1: Upsert asset_folders WITHOUT thumbnail_asset_id
  // Step 2: Upsert assets (now folder_id resolves)
  // Step 3: Update asset_folders to set thumbnail_asset_id
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 5: Circular FK — assets ↔ asset_folders");

  const assetFoldersCSV = loadCSV("asset_folders");
  const assetsCSV = loadCSV("assets");

  // Step 1: Upsert folders without the circular FK column
  const foldersWithoutThumb = assetFoldersCSV.map((r) => {
    const clean = { ...r };
    delete clean.thumbnail_asset_id;
    return clean;
  });
  await upsertTable("asset_folders", foldersWithoutThumb);

  // Step 2: Upsert assets (now folder_id should resolve)
  await upsertTable("assets", assetsCSV);

  // Step 3: Set thumbnail_asset_id on folders
  let thumbUpdated = 0;
  for (const folder of assetFoldersCSV) {
    if (folder.thumbnail_asset_id) {
      const { error } = await supabase
        .from("asset_folders")
        .update({ thumbnail_asset_id: folder.thumbnail_asset_id })
        .eq("id", folder.id);
      if (!error) thumbUpdated++;
    }
  }
  console.log(`  ✓ asset_folders thumbnail_asset_id: ${thumbUpdated} updated`);

  // Also reimport asset_versions (depends on assets)
  await upsertTable("asset_versions", loadCSV("asset_versions"));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 6: Circular FK — blog_posts ↔ blog_topics
  // blog_posts.topic_id → blog_topics.id
  // blog_topics.blog_post_id → blog_posts.id
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 6: Circular FK — blog_posts ↔ blog_topics");

  const blogTopicsCSV = loadCSV("blog_topics");
  const blogPostsCSV = loadCSV("blog_posts");

  // Step 1: Upsert topics WITHOUT blog_post_id
  const topicsWithoutPost = blogTopicsCSV.map((r) => {
    const clean = { ...r };
    delete clean.blog_post_id;
    return clean;
  });
  await upsertTable("blog_topics", topicsWithoutPost);

  // Step 2: Upsert blog posts (now topic_id should resolve)
  await upsertTable("blog_posts", blogPostsCSV);

  // Step 3: Set blog_post_id on topics
  let postLinked = 0;
  for (const topic of blogTopicsCSV) {
    if (topic.blog_post_id) {
      const { error } = await supabase
        .from("blog_topics")
        .update({ blog_post_id: topic.blog_post_id })
        .eq("id", topic.id);
      if (!error) postLinked++;
    }
  }
  console.log(`  ✓ blog_topics blog_post_id: ${postLinked} updated`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 7: Large daily tables (page_daily ~11K rows, sources_daily ~1.2K)
  // These have no id column. Import in batches without row-by-row fallback.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 7: Daily analytics tables");

  for (const table of ["page_daily", "sources_daily", "content_daily"]) {
    const rows = loadCSV(table);
    if (rows.length === 0) {
      console.log(`  ○ ${table}: no rows`);
      continue;
    }

    process.stdout.write(`  ● ${table}: ${rows.length} rows...`);
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).insert(batch);

      if (error) {
        // For noId tables, skip row-by-row (too slow for 11K rows)
        // Just count the batch as errored
        errors += batch.length;
        if (errors <= BATCH_SIZE) {
          console.log(`\n     ✗ batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message.slice(0, 120)}`);
        }
      } else {
        imported += batch.length;
      }
    }

    const symbol = errors === 0 ? "✓" : imported > 0 ? "◐" : "✗";
    console.log(` ${symbol} ${imported}/${rows.length}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX 8: Remaining misc tables that weren't reached
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\nFix 8: Remaining tables");

  const miscTables = [
    "late_connection_invites",
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

  for (const table of miscTables) {
    const rows = loadCSV(table);
    await upsertTable(table, rows);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary: Verify final counts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Verification — key table counts");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const checkTables = [
    "standard_marketing_stages",
    "task_columns",
    "tasks",
    "task_assignees",
    "marketing_flow_stages",
    "marketing_flow_channels",
    "assets",
    "asset_folders",
    "blog_posts",
    "blog_topics",
    "page_daily",
    "sources_daily",
  ];

  for (const table of checkTables) {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    const csvRows = loadCSV(table).length;
    const pct = csvRows > 0 ? Math.round((count / csvRows) * 100) : 100;
    const symbol = pct >= 95 ? "✓" : pct > 50 ? "◐" : "✗";
    console.log(`  ${symbol} ${table.padEnd(35)} ${count}/${csvRows} (${pct}%)`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Fixup complete.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
