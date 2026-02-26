-- Add key_amenities column to reports for extracted/generated amenities list
ALTER TABLE reports ADD COLUMN IF NOT EXISTS key_amenities TEXT[];
