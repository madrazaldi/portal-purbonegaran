-- Track thumbnail size too, so total R2 storage can be capped below the free tier.
ALTER TABLE media ADD COLUMN thumb_bytes INTEGER NOT NULL DEFAULT 0;
