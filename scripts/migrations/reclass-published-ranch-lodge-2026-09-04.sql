-- ============================================================================
-- Recode 23 published lodge/ranch-primary properties to Ranch & Lodge.
--
-- These were reviewed as Switch: lodge- or ranch-primary, hard-walled rooms /
-- cabins / villas as the core product. Do not include Review/Keep rows,
-- in_progress, or rejected. Do not recode Platte Canyon Glamping or French
-- Creek (stay Glamping).
--
-- Also set is_glamping_property = No. None of these 23 have material
-- tent / yurt / pod inventory as the guest product. Canvas cabins at The
-- Ranch at Rock Creek stay Ranch & Lodge (ranch inventory, not a tent camp).
-- ============================================================================

UPDATE all_sage_data
SET
  property_type = 'Ranch & Lodge',
  is_glamping_property = 'No'
WHERE TRIM(property_name) IN (
  'Alpine Lakes Lodge',
  'Bear Creek Lodge McCall',
  'Cathedral Lakes Lodge',
  'Firefall Ranch',
  'Lone Mountain Ranch',
  'Lost Creek Ranch & Spa',
  'Marble Mountain Ranch',
  'Paulina Lake Lodge',
  'Redfish Lake Lodge',
  'Sandy Valley Ranch',
  'Shore Lodge',
  'Sierra Mountain Lodge',
  'Sorrel River Ranch Resort & Spa',
  'Sylvan Dale Guest Ranch',
  'Teton Springs Lodge & Spa',
  'The Hideout Lodge & Guest Ranch',
  'The Lodge and Spa at Brush Creek Ranch',
  'The Lodge at Buckberry Creek',
  'The Lodge at Pico Bonito',
  'The Lodge on Little St. Simons Island',
  'The Ranch at Rock Creek',
  'Triple Creek Ranch',
  'Vista Verde Guest Ranch'
)
AND research_status = 'published';
