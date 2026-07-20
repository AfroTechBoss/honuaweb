import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Read the access token sent by the client
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the token and get the user
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // 1. Delete storage assets (avatar + cover)
  try {
    const { data: avatarFiles } = await adminClient.storage.from("avatars").list(userId);
    if (avatarFiles?.length) {
      await adminClient.storage.from("avatars").remove(avatarFiles.map(f => `${userId}/${f.name}`));
    }
    const { data: coverFiles } = await adminClient.storage.from("covers").list(userId);
    if (coverFiles?.length) {
      await adminClient.storage.from("covers").remove(coverFiles.map(f => `${userId}/${f.name}`));
    }
  } catch {
    // best-effort — don't block deletion if bucket doesn't exist
  }

  // 2. Explicitly delete all user data (belt + suspenders on top of DB cascades)
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

  // 3. Delete profile row
  await adminClient.from("profiles").delete().eq("id", userId);

  // 4. Delete auth user — revokes all sessions on all devices
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
