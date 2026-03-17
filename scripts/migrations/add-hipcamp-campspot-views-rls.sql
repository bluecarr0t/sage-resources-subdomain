-- Add RLS for hipcamp_* and campspot_* public views
-- These views select from hipcamp.* and campspot.* tables.
-- 1. Enable RLS on underlying tables and add policies (if not already applied)
-- 2. Set security_invoker = on on views so they run as the querying user (respecting table RLS)
-- Run in Supabase SQL Editor

-- Enable RLS on underlying tables
ALTER TABLE hipcamp.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.importedsites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.old_data_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.propertydetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.propertys ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.scrapings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.sitedetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hipcamp.siteseasonals ENABLE ROW LEVEL SECURITY;

ALTER TABLE campspot.old_data_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.propertydetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.propertys ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.scrapings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.sitedetails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE campspot.siteseasonals ENABLE ROW LEVEL SECURITY;

-- Policies: allow SELECT for authenticated users (service_role bypasses RLS by default)
-- hipcamp
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

-- campspot
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

-- Set views to run as the querying user (security_invoker) so underlying table RLS applies
-- Without this, views run as the owner (postgres) and bypass RLS
ALTER VIEW public.hipcamp_imports SET (security_invoker = on);
ALTER VIEW public.hipcamp_importedsites SET (security_invoker = on);
ALTER VIEW public.hipcamp_old_data_table SET (security_invoker = on);
ALTER VIEW public.hipcamp_propertydetails SET (security_invoker = on);
ALTER VIEW public.hipcamp_propertys SET (security_invoker = on);
ALTER VIEW public.hipcamp_scrapings SET (security_invoker = on);
ALTER VIEW public.hipcamp_sitedetails SET (security_invoker = on);
ALTER VIEW public.hipcamp_sites SET (security_invoker = on);
ALTER VIEW public.hipcamp_siteseasonals SET (security_invoker = on);

ALTER VIEW public.campspot_old_data_table SET (security_invoker = on);
ALTER VIEW public.campspot_propertydetails SET (security_invoker = on);
ALTER VIEW public.campspot_propertys SET (security_invoker = on);
ALTER VIEW public.campspot_scrapings SET (security_invoker = on);
ALTER VIEW public.campspot_sitedetails SET (security_invoker = on);
ALTER VIEW public.campspot_sites SET (security_invoker = on);
ALTER VIEW public.campspot_siteseasonals SET (security_invoker = on);
