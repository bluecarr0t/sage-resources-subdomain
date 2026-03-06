-- Set all reports to service = 'feasibility_study' (displayed as "Feasibility Study" on past-reports)
UPDATE reports
SET service = 'feasibility_study'
WHERE deleted_at IS NULL;
