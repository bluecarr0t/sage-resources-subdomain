-- One-time data quality: align US country label on all_glamping_properties.
-- Application default for new US rows is "United States" (see enrich-and-insert / discovery-candidates).

UPDATE public.all_glamping_properties
SET country = 'United States',
    date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE country = 'USA';
