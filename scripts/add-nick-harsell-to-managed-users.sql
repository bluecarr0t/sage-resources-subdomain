-- Add Nick Harsell to managed_users table
-- IMPORTANT: This user must first sign in via Google OAuth to create a record in auth.users
-- Run this SQL after the user has logged in at least once

-- First, verify the user exists in auth.users
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user_id for harsell@sageoutdooradvisory.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'harsell@sageoutdooradvisory.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User harsell@sageoutdooradvisory.com not found in auth.users. The user must sign in via Google OAuth first to create their auth record.';
  END IF;

  -- Insert into managed_users (using ON CONFLICT to handle if already exists)
  INSERT INTO public.managed_users (
    user_id,
    email,
    display_name,
    is_active,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'harsell@sageoutdooradvisory.com',
    'Nick Harsell',
    true,
    'admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    is_active = EXCLUDED.is_active,
    role = EXCLUDED.role,
    updated_at = NOW();

  RAISE NOTICE 'Successfully added/updated Nick Harsell (harsell@sageoutdooradvisory.com) to managed_users table with admin role';
END $$;

-- Verify the insertion
SELECT 
  id,
  user_id,
  email,
  display_name,
  is_active,
  role,
  created_at
FROM public.managed_users
WHERE email = 'harsell@sageoutdooradvisory.com';
