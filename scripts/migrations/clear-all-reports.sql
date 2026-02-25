-- Clear all Past Reports data
-- Run in Supabase SQL Editor. This permanently deletes all reports and related data.
-- Related feasibility data (comparables, comp units, summaries, etc.) will cascade delete.

DELETE FROM reports;
