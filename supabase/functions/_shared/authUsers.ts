import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.75.0";

export async function findAuthUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}
