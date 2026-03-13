-- Create public views for hipcamp and campspot tables
-- Makes tables visible in Supabase Table Editor while keeping data in custom schemas
-- Run in Supabase SQL Editor after schema creation and data import

-- hipcamp schema views
CREATE OR REPLACE VIEW public.hipcamp_imports AS SELECT * FROM hipcamp.imports;
CREATE OR REPLACE VIEW public.hipcamp_importedsites AS SELECT * FROM hipcamp.importedsites;
CREATE OR REPLACE VIEW public.hipcamp_old_data_table AS SELECT * FROM hipcamp.old_data_table;
CREATE OR REPLACE VIEW public.hipcamp_propertydetails AS SELECT * FROM hipcamp.propertydetails;
CREATE OR REPLACE VIEW public.hipcamp_propertys AS SELECT * FROM hipcamp.propertys;
CREATE OR REPLACE VIEW public.hipcamp_scrapings AS SELECT * FROM hipcamp.scrapings;
CREATE OR REPLACE VIEW public.hipcamp_sitedetails AS SELECT * FROM hipcamp.sitedetails;
CREATE OR REPLACE VIEW public.hipcamp_sites AS SELECT * FROM hipcamp.sites;
CREATE OR REPLACE VIEW public.hipcamp_siteseasonals AS SELECT * FROM hipcamp.siteseasonals;

-- campspot schema views
CREATE OR REPLACE VIEW public.campspot_old_data_table AS SELECT * FROM campspot.old_data_table;
CREATE OR REPLACE VIEW public.campspot_propertydetails AS SELECT * FROM campspot.propertydetails;
CREATE OR REPLACE VIEW public.campspot_propertys AS SELECT * FROM campspot.propertys;
CREATE OR REPLACE VIEW public.campspot_scrapings AS SELECT * FROM campspot.scrapings;
CREATE OR REPLACE VIEW public.campspot_sitedetails AS SELECT * FROM campspot.sitedetails;
CREATE OR REPLACE VIEW public.campspot_sites AS SELECT * FROM campspot.sites;
CREATE OR REPLACE VIEW public.campspot_siteseasonals AS SELECT * FROM campspot.siteseasonals;
