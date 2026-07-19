-- Keep posts.likes_count accurate via trigger on post_likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count + 1) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_likes_count ON post_likes;
CREATE TRIGGER trg_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Keep posts.reposts_count accurate via trigger on post_reposts
CREATE OR REPLACE FUNCTION update_post_reposts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reposts_count = GREATEST(0, reposts_count + 1) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_reposts_count ON post_reposts;
CREATE TRIGGER trg_post_reposts_count
AFTER INSERT OR DELETE ON post_reposts
FOR EACH ROW EXECUTE FUNCTION update_post_reposts_count();

-- Back-fill existing counts from actual rows (run once)
UPDATE posts p SET
  likes_count   = (SELECT COUNT(*) FROM post_likes   WHERE post_id = p.id),
  reposts_count = (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id);
