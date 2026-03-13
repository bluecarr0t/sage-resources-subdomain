-- RLS policies for hipcamp and campspot tables
-- Enables Row Level Security on underlying tables; views inherit via the tables they select from
-- Run in Supabase SQL Editor after 02-create-public-views.sql

-- hipcamp tables
ALTER TABLE hipcamp.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.importedsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.old_data_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.propertydetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.propertys ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.scrapings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.sitedetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.siteseasonals ENABLE ROW LEVEL SECURITY;

-- campspot tables
ALTER TABLE campspot.old_data_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.propertydetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.propertys ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.scrapings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.sitedetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.siteseasonals ENABLE ROW LEVEL SECURITY;

-- Policies: allow SELECT for authenticated users (service_role bypasses RLS by default)
-- Drop first for idempotency
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.imports;
CREATE POLICY "Allow authenticated read" ON hipcamp.imports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.importedsites;
CREATE POLICY "Allow authenticated read" ON hipcamp.importedsites FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.old_data_table;
CREATE POLICY "Allow authenticated read" ON hipcamp.old_data_table FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.propertydetails;
CREATE POLICY "Allow authenticated read" ON hipcamp.propertydetails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.propertys;
CREATE POLICY "Allow authenticated read" ON hipcamp.propertys FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.scrapings;
CREATE POLICY "Allow authenticated read" ON hipcamp.scrapings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.sitedetails;
CREATE POLICY "Allow authenticated read" ON hipcamp.sitedetails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.sites;
CREATE POLICY "Allow authenticated read" ON hipcamp.sites FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON hipcamp.siteseasonals;
CREATE POLICY "Allow authenticated read" ON hipcamp.siteseasonals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.old_data_table;
CREATE POLICY "Allow authenticated read" ON campspot.old_data_table FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.propertydetails;
CREATE POLICY "Allow authenticated read" ON campspot.propertydetails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.propertys;
CREATE POLICY "Allow authenticated read" ON campspot.propertys FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.scrapings;
CREATE POLICY "Allow authenticated read" ON campspot.scrapings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.sitedetails;
CREATE POLICY "Allow authenticated read" ON campspot.sitedetails FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.sites;
CREATE POLICY "Allow authenticated read" ON campspot.sites FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON campspot.siteseasonals;
CREATE POLICY "Allow authenticated read" ON campspot.siteseasonals FOR SELECT TO authenticated USING (true);
