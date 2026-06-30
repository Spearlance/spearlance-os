import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Idempotently seeds the ABC Company test client (dev project only) with a few
// tasks + one asset so the board and the Link Assets dialog have data to exercise.
// Runs as a setup project before the chromium tests.
const ABC = "00000000-0000-0000-0000-0000000000c1";

setup("seed ABC Company test data", async () => {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

  if (!url || !url.includes("zlljsdaxsggkasvympku")) {
    throw new Error(`Refusing to seed a non-dev Supabase project: ${url}`);
  }

  const supabase = createClient(url, key);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) throw new Error(`seed login failed: ${authErr.message}`);
  const uid = auth.user!.id;

  // Group is by column_id; task.status uses the column key (a valid status enum).
  const { data: cols } = await supabase
    .from("task_columns")
    .select("id, key")
    .eq("client_id", ABC)
    .order("display_order");
  if (!cols || cols.length === 0) throw new Error("ABC Company has no task_columns to seed into");
  const todo = cols.find((c) => c.key === "to_do") ?? cols[0];
  const prog = cols.find((c) => c.key === "in_progress") ?? cols[1] ?? cols[0];

  // Asset (idempotent by title).
  const seedAssetTitle = "E2E Seed Asset (brand logo)";
  const { data: existingAsset } = await supabase
    .from("assets")
    .select("id")
    .eq("client_id", ABC)
    .eq("title", seedAssetTitle)
    .maybeSingle();
  if (!existingAsset) {
    await supabase.from("assets").insert([{
      client_id: ABC,
      title: seedAssetTitle,
      type: "image",
      storage_type: "upload",
      file_url: "https://placehold.co/200x200/png?text=Seed",
      created_by: uid,
    }]);
  }

  // Tasks (idempotent by title).
  const want = [
    { title: "E2E Draft homepage copy", column: todo, priority: "high" },
    { title: "E2E Review brand palette", column: todo, priority: "normal" },
    { title: "E2E Build hero section", column: prog, priority: "urgent" },
  ];
  for (const t of want) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("client_id", ABC)
      .eq("title", t.title)
      .is("parent_task_id", null)
      .maybeSingle();
    if (existing) continue;
    const { data: created } = await supabase
      .from("tasks")
      .insert([{
        client_id: ABC,
        title: t.title,
        status: t.column.key,
        column_id: t.column.id,
        priority: t.priority,
      }])
      .select("id")
      .single();
    if (created) {
      await supabase.from("task_assignees").insert([{ task_id: created.id, user_id: uid }]);
    }
  }
});
