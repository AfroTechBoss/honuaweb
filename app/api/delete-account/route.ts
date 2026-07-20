import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
  const cookieStore = await cookies();

  // Verify the caller is authenticated
  const userClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Delete storage assets (avatar + cover)
  try {
    const { data: avatarFiles } = await adminClient.storage
      .from("avatars")
      .list(userId);
    if (avatarFiles?.length) {
      await adminClient.storage
        .from("avatars")
        .remove(avatarFiles.map(f => `${userId}/${f.name}`));
    }
    const { data: coverFiles } = await adminClient.storage
      .from("covers")
      .list(userId);
    if (coverFiles?.length) {
      await adminClient.storage
        .from("covers")
        .remove(coverFiles.map(f => `${userId}/${f.name}`));
    }
  } catch {
    // Storage cleanup is best-effort — don't block deletion if bucket doesn't exist
  }

  // 2. Explicitly delete user data (belt + suspenders on top of DB cascades)
  await Promise.allSettled([
    adminClient.from("post_likes").delete().eq("user_id", userId),
    adminClient.from("post_reposts").delete().eq("user_id", userId),
    adminClient.from("bookmarks").delete().eq("user_id", userId),
    adminClient.from("collections").delete().eq("user_id", userId),
    adminClient.from("follows").delete().eq("follower_id", userId),
    adminClient.from("follows").delete().eq("following_id", userId),
    adminClient.from("muted_users").delete().eq("user_id", userId),
    adminClient.from("blocked_users").delete().eq("user_id", userId),
    adminClient.from("notifications").delete().eq("user_id", userId),
    adminClient.from("notifications").delete().eq("actor_id", userId),
    adminClient.from("comments").delete().eq("user_id", userId),
    adminClient.from("posts").delete().eq("user_id", userId),
  ]);

  // 3. Delete the profile row
  await adminClient.from("profiles").delete().eq("id", userId);

  // 4. Delete the auth user (this also signs them out on all devices)
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
