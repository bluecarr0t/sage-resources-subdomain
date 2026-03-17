-- Add client contact columns for report builder placeholder mapping
-- Run in Supabase SQL Editor. Idempotent.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_contact_name TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_city_state_zip TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_salutation TEXT;

COMMENT ON COLUMN reports.client_contact_name IS 'Client contact person name for letter of transmittal';
COMMENT ON COLUMN reports.client_address IS 'Client mailing address';
COMMENT ON COLUMN reports.client_city_state_zip IS 'Client city, state, zip';
COMMENT ON COLUMN reports.client_salutation IS 'Client salutation (e.g. Mr. Smith)';
