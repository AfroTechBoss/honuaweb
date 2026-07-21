import { supabase } from './supabase';

export type StoryType = 'image' | 'video' | 'text' | 'post';

export interface Story {
  id: string;
  user_id: string;
  type: StoryType;
  media_url?: string | null;
  text_content?: string | null;
  bg_colors?: string[] | null;
  post_id?: string | null;
  caption?: string | null;
  created_at: string;
  expires_at: string;
  profile?: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url?: string | null;
    verified: boolean;
  };
  post?: {
    id: string;
    content?: string | null;
    image_url?: string | null;
    created_at: string;
    user_id: string;
    profile?: {
      id: string;
      handle: string;
      full_name: string;
      avatar_url?: string | null;
      verified: boolean;
    };
  } | null;
}

export interface StoryGroup {
  userId: string;
  profile: Story['profile'];
  stories: Story[];
}

export async function getActiveStories(): Promise<StoryGroup[]> {
  try {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles!stories_user_id_fkey(id, handle, full_name, avatar_url, verified),
        post:posts!stories_post_id_fkey(id, content, image_url, created_at, user_id, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified))
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!data) return [];

    // Group by user_id, preserving insertion order (most recent story = top of rail)
    const map = new Map<string, StoryGroup>();
    for (const story of data) {
      const uid = story.user_id;
      if (!map.has(uid)) {
        map.set(uid, { userId: uid, profile: story.profile, stories: [] });
      }
      // Stories within a group: oldest first so viewer plays chronologically
      map.get(uid)!.stories.unshift(story);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export async function createStory(params: {
  userId: string;
  type: StoryType;
  mediaUrl?: string;
  textContent?: string;
  bgColors?: [string, string];
  postId?: string;
  caption?: string;
}) {
  const { error } = await supabase.from('stories').insert({
    user_id: params.userId,
    type: params.type,
    media_url: params.mediaUrl ?? null,
    text_content: params.textContent ?? null,
    bg_colors: params.bgColors ?? null,
    post_id: params.postId ?? null,
    caption: params.caption ?? null,
  });
  if (error) throw error;
}

export async function deleteStory(storyId: string) {
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
}

export async function uploadStoryMedia(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('stories').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('stories').getPublicUrl(path);
  return data.publicUrl;
}
