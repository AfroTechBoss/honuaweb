import { supabase } from "./supabase";

// Upload a file to a bucket and return the public CDN URL.
// Path format: {bucket}/{userId}/{filename}
// Supabase Storage serves these from its global CDN automatically.
export async function uploadFile(
  bucket: "avatars" | "covers" | "posts" | "projects",
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  // getPublicUrl returns the CDN URL — never hits the origin server on load
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, url: string) {
  // Extract path from the full CDN URL
  const path = url.split(`/storage/v1/object/public/${bucket}/`)[1];
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
