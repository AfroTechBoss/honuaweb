import { supabase } from "./supabase";

/** 8 hex chars of collision insurance for a storage key. */
export function randomKey(): string {
  const b = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

// Upload a file to a bucket and return the public CDN URL.
// Path format: {bucket}/{userId}/{filename}
// Supabase Storage serves these from its global CDN automatically.
export async function uploadFile(
  bucket: "avatars" | "covers" | "posts" | "projects" | "comments",
  userId: string,
  file: File
): Promise<string> {
  // Extension only, lowercased, and only if it looks like one. `file.name` is
  // whatever the user's filesystem handed over, and it lands in a storage key.
  const raw = (file.name.split(".").pop() ?? "").toLowerCase();
  const ext = /^[a-z0-9]{1,8}$/.test(raw) ? raw : "bin";

  // Date.now() alone is not a key. Two files picked in the same millisecond —
  // a multi-image post, which this app allows — collided, and `upsert: true`
  // meant the second silently overwrote the first: the post then showed the
  // same picture twice and the original was gone from storage. A random suffix
  // makes the collision vanishingly unlikely, and upsert: false turns whatever
  // is left into a visible error instead of data loss.
  const path = `${userId}/${Date.now()}-${randomKey()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
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

// Centre-crops an image to a square and scales it to at most `size` px, as a
// JPEG. Project photos are square so they fit the map's photo pins and the
// project page the same way whatever shape the original was.
export async function squareImage(file: File, size = 1200): Promise<File> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(side, size);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bmp.close?.(); return file; }
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close?.();
  const blob: Blob | null = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]*$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
